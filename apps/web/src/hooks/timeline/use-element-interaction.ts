import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/use-element-selection";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { computeDropTarget } from "@/lib/timeline/drop-utils";
import type {
  ElementDragState,
  TimelineElement,
  TimelineTrack,
} from "@/types/timeline";
import type { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";

const DRAG_THRESHOLD_PX = 5;

interface UseElementInteractionProps {
  zoomLevel: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  tracksContainerRef: RefObject<HTMLDivElement | null>;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

const initialDragState: ElementDragState = {
  isDragging: false,
  elementId: null,
  trackId: null,
  startMouseX: 0,
  startElementTime: 0,
  clickOffsetTime: 0,
  currentTime: 0,
};

export function useElementInteraction({
  zoomLevel,
  timelineRef,
  tracksContainerRef,
  onSnapPointChange,
}: UseElementInteractionProps) {
  const editor = useEditor();
  const tracks = editor.timeline.sortedTracks;
  const {
    isSelected,
    select,
    handleElementClick: handleSelectionClick,
  } = useElementSelection();

  const [dragState, setDragState] =
    useState<ElementDragState>(initialDragState);
  const lastMouseXRef = useRef(0);
  const mouseDownLocationRef = useRef<{ x: number; y: number } | null>(null);

  const startDrag = useCallback(
    ({
      elementId,
      trackId,
      startMouseX,
      startElementTime,
      clickOffsetTime,
    }: Omit<ElementDragState, "isDragging" | "currentTime">) => {
      setDragState({
        isDragging: true,
        elementId,
        trackId,
        startMouseX,
        startElementTime,
        clickOffsetTime,
        currentTime: startElementTime,
      });
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  // Mouse move: update drag time
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      lastMouseXRef.current = e.clientX;

      if (dragState.elementId && dragState.trackId) {
        const alreadySelected = isSelected({
          trackId: dragState.trackId,
          elementId: dragState.elementId,
        });
        if (!alreadySelected) {
          select({
            trackId: dragState.trackId,
            elementId: dragState.elementId,
          });
        }
      }

      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseTime = Math.max(
        0,
        mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
      );
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);

      const fps = editor.project.getActiveFps() ?? DEFAULT_FPS;
      const snappedTime = snapTimeToFrame({ time: adjustedTime, fps });
      setDragState((prev) => ({ ...prev, currentTime: snappedTime }));
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [
    dragState.isDragging,
    dragState.clickOffsetTime,
    dragState.elementId,
    dragState.trackId,
    zoomLevel,
    isSelected,
    select,
    editor.project,
    timelineRef,
  ]);

  // Mouse up: resolve drop
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.elementId || !dragState.trackId) return;

      const containerRect = tracksContainerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }

      const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
      const movingElement = sourceTrack?.elements.find(
        (el) => el.id === dragState.elementId,
      );

      if (!movingElement) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }

      const elementDuration =
        movingElement.duration -
        movingElement.trimStart -
        movingElement.trimEnd;
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      const dropTarget = computeDropTarget({
        elementType: movingElement.type,
        mouseX,
        mouseY,
        tracks,
        playheadTime: dragState.currentTime,
        isExternalDrop: false,
        elementDuration,
        pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
        zoomLevel,
      });

      const fps = editor.project.getActiveFps() ?? DEFAULT_FPS;
      const snappedTime = snapTimeToFrame({ time: dropTarget.xPosition, fps });

      if (dropTarget.isNewTrack) {
        const newTrackId = editor.timeline.addTrack({
          type: sourceTrack!.type,
          index: dropTarget.trackIndex,
        });
        editor.timeline.moveElement({
          sourceTrackId: dragState.trackId,
          targetTrackId: newTrackId,
          elementId: dragState.elementId,
          newStartTime: snappedTime,
        });
      } else {
        const targetTrack = tracks[dropTarget.trackIndex];
        if (targetTrack) {
          editor.timeline.moveElement({
            sourceTrackId: dragState.trackId,
            targetTrackId: targetTrack.id,
            elementId: dragState.elementId,
            newStartTime: snappedTime,
          });
        }
      }

      endDrag();
      onSnapPointChange?.(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [
    dragState.isDragging,
    dragState.elementId,
    dragState.trackId,
    dragState.currentTime,
    zoomLevel,
    tracks,
    endDrag,
    onSnapPointChange,
    editor.project,
    editor.timeline,
    tracksContainerRef,
  ]);

  const handleElementMouseDown = useCallback(
    ({
      e,
      element,
      track,
    }: {
      e: React.MouseEvent;
      element: TimelineElement;
      track: TimelineTrack;
    }) => {
      mouseDownLocationRef.current = { x: e.clientX, y: e.clientY };

      const isRightClick = e.button === 2;
      const isMultiSelect = e.metaKey || e.ctrlKey || e.shiftKey;

      // right-click: select if not already selected
      if (isRightClick) {
        const alreadySelected = isSelected({
          trackId: track.id,
          elementId: element.id,
        });
        if (!alreadySelected) {
          handleSelectionClick({
            trackId: track.id,
            elementId: element.id,
            isMultiKey: isMultiSelect,
          });
        }
        return;
      }

      // multi-select: toggle selection
      if (isMultiSelect) {
        handleSelectionClick({
          trackId: track.id,
          elementId: element.id,
          isMultiKey: true,
        });
      }

      // start drag
      const elementRect = (
        e.currentTarget as HTMLElement
      ).getBoundingClientRect();
      const clickOffsetX = e.clientX - elementRect.left;
      const clickOffsetTime =
        clickOffsetX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

      startDrag({
        elementId: element.id,
        trackId: track.id,
        startMouseX: e.clientX,
        startElementTime: element.startTime,
        clickOffsetTime,
      });
    },
    [zoomLevel, startDrag, isSelected, handleSelectionClick],
  );

  const handleElementClick = useCallback(
    ({
      e,
      element,
      track,
    }: {
      e: React.MouseEvent;
      element: TimelineElement;
      track: TimelineTrack;
    }) => {
      e.stopPropagation();

      // was it a drag or a click?
      if (mouseDownLocationRef.current) {
        const deltaX = Math.abs(e.clientX - mouseDownLocationRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownLocationRef.current.y);
        if (deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX) {
          mouseDownLocationRef.current = null;
          return;
        }
      }

      // modifier keys already handled in mousedown
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      // single click: select if not selected
      const alreadySelected = isSelected({
        trackId: track.id,
        elementId: element.id,
      });
      if (!alreadySelected) {
        select({ trackId: track.id, elementId: element.id });
      }
    },
    [isSelected, select],
  );

  return {
    dragState,
    handleElementMouseDown,
    handleElementClick,
    lastMouseXRef,
  };
}
