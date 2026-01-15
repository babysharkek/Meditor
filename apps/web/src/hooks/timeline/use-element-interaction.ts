import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/use-element-selection";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
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
  const tracks = editor.timeline.getTracks();
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

  // mouse move: update drag time
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = ({ clientX }: MouseEvent) => {
      if (!timelineRef.current) return;
      lastMouseXRef.current = clientX;

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
      const mouseX = clientX - rect.left;
      const mouseTime = Math.max(
        0,
        mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
      );
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);

      const activeProject = editor.project.getActive();
      if (!activeProject) return;
      const fps = activeProject.settings.fps;
      const snappedTime = snapTimeToFrame({ time: adjustedTime, fps });
      setDragState((previousDragState) => ({
        ...previousDragState,
        currentTime: snappedTime,
      }));
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

  // mouse up: resolve drop
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseUp = ({ clientX, clientY }: MouseEvent) => {
      if (!dragState.elementId || !dragState.trackId) return;

      const containerRect = tracksContainerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }

      const sourceTrack = tracks.find(({ id }) => id === dragState.trackId);
      if (!sourceTrack) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }
      const movingElement = sourceTrack?.elements.find(
        ({ id }) => id === dragState.elementId,
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
      const mouseX = clientX - containerRect.left;
      const mouseY = clientY - containerRect.top;

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

      const activeProject = editor.project.getActive();
      if (!activeProject) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }
      const fps = activeProject.settings.fps;
      const snappedTime = snapTimeToFrame({ time: dropTarget.xPosition, fps });

      if (dropTarget.isNewTrack) {
        const newTrackId = editor.timeline.addTrack({
          type: sourceTrack.type,
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
      event,
      element,
      track,
    }: {
      event: ReactMouseEvent;
      element: TimelineElement;
      track: TimelineTrack;
    }) => {
      mouseDownLocationRef.current = { x: event.clientX, y: event.clientY };

      const isRightClick = event.button === 2;
      const isMultiSelect = event.metaKey || event.ctrlKey || event.shiftKey;

      // right-click
      if (isRightClick) {
        const alreadySelected = isSelected({
          trackId: track.id,
          elementId: element.id,
        });
        if (!alreadySelected) {
          handleSelectionClick({
            trackId: track.id,
            elementId: element.id,
            isMultiKey: false,
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
        event.currentTarget as HTMLElement
      ).getBoundingClientRect();
      const clickOffsetX = event.clientX - elementRect.left;
      const clickOffsetTime =
        clickOffsetX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

      startDrag({
        elementId: element.id,
        trackId: track.id,
        startMouseX: event.clientX,
        startElementTime: element.startTime,
        clickOffsetTime,
      });
    },
    [zoomLevel, startDrag, isSelected, handleSelectionClick],
  );

  const handleElementClick = useCallback(
    ({
      event,
      element,
      track,
    }: {
      event: ReactMouseEvent;
      element: TimelineElement;
      track: TimelineTrack;
    }) => {
      event.stopPropagation();

      // was it a drag or a click?
      if (mouseDownLocationRef.current) {
        const deltaX = Math.abs(event.clientX - mouseDownLocationRef.current.x);
        const deltaY = Math.abs(event.clientY - mouseDownLocationRef.current.y);
        if (deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX) {
          mouseDownLocationRef.current = null;
          return;
        }
      }

      // modifier keys already handled in mousedown
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;

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
