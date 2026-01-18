import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { computeDropTarget } from "@/lib/timeline/drop-utils";
import { generateUUID } from "@/lib/utils";
import type {
  DropTarget,
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
  tracksScrollRef: RefObject<HTMLDivElement | null>;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

const initialDragState: ElementDragState = {
  isDragging: false,
  elementId: null,
  trackId: null,
  startMouseX: 0,
  startMouseY: 0,
  startElementTime: 0,
  clickOffsetTime: 0,
  currentTime: 0,
  currentMouseY: 0,
};

interface PendingDragState {
  elementId: string;
  trackId: string;
  startMouseX: number;
  startMouseY: number;
  startElementTime: number;
  clickOffsetTime: number;
}

function getMouseTimeFromClientX({
  clientX,
  containerRect,
  zoomLevel,
  scrollLeft,
}: {
  clientX: number;
  containerRect: DOMRect;
  zoomLevel: number;
  scrollLeft: number;
}): number {
  const mouseX = clientX - containerRect.left + scrollLeft;
  return Math.max(
    0,
    mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
  );
}

function getClickOffsetTime({
  clientX,
  elementRect,
  zoomLevel,
}: {
  clientX: number;
  elementRect: DOMRect;
  zoomLevel: number;
}): number {
  const clickOffsetX = clientX - elementRect.left;
  return clickOffsetX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
}

function getElementDuration({ element }: { element: TimelineElement }): number {
  return element.duration - element.trimStart - element.trimEnd;
}

function getDragDropTarget({
  clientX,
  clientY,
  elementId,
  trackId,
  tracks,
  tracksContainerRef,
  tracksScrollRef,
  zoomLevel,
  snappedTime,
}: {
  clientX: number;
  clientY: number;
  elementId: string;
  trackId: string;
  tracks: TimelineTrack[];
  tracksContainerRef: RefObject<HTMLDivElement | null>;
  tracksScrollRef: RefObject<HTMLDivElement | null>;
  zoomLevel: number;
  snappedTime: number;
}): DropTarget | null {
  const containerRect = tracksContainerRef.current?.getBoundingClientRect();
  const scrollContainer = tracksScrollRef.current;
  if (!containerRect || !scrollContainer) return null;

  const sourceTrack = tracks.find(({ id }) => id === trackId);
  const movingElement = sourceTrack?.elements.find(({ id }) => id === elementId);
  if (!movingElement) return null;

  const elementDuration = getElementDuration({ element: movingElement });
  const scrollLeft = scrollContainer.scrollLeft;
  const scrollContainerRect = scrollContainer.getBoundingClientRect();
  const mouseX = clientX - scrollContainerRect.left + scrollLeft;
  const mouseY = clientY - containerRect.top;

  return computeDropTarget({
    elementType: movingElement.type,
    mouseX,
    mouseY,
    tracks,
    playheadTime: snappedTime,
    isExternalDrop: false,
    elementDuration,
    pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
    zoomLevel,
    startTimeOverride: snappedTime,
    excludeElementId: movingElement.id,
  });
}

interface StartDragParams
  extends Omit<ElementDragState, "isDragging" | "currentTime" | "currentMouseY"> {
  initialCurrentTime: number;
  initialCurrentMouseY: number;
}

export function useElementInteraction({
  zoomLevel,
  timelineRef,
  tracksContainerRef,
  tracksScrollRef,
  onSnapPointChange,
}: UseElementInteractionProps) {
  const editor = useEditor();
  const tracks = editor.timeline.getTracks();
  const {
    isElementSelected,
    selectElement,
    handleElementClick: handleSelectionClick,
  } = useElementSelection();

  const [dragState, setDragState] =
    useState<ElementDragState>(initialDragState);
  const [dragDropTarget, setDragDropTarget] = useState<DropTarget | null>(null);
  const [isPendingDrag, setIsPendingDrag] = useState(false);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const lastMouseXRef = useRef(0);
  const mouseDownLocationRef = useRef<{ x: number; y: number } | null>(null);

  const startDrag = useCallback(
    ({
      elementId,
      trackId,
      startMouseX,
      startMouseY,
      startElementTime,
      clickOffsetTime,
      initialCurrentTime,
      initialCurrentMouseY,
    }: StartDragParams) => {
      setDragState({
        isDragging: true,
        elementId,
        trackId,
        startMouseX,
        startMouseY,
        startElementTime,
        clickOffsetTime,
        currentTime: initialCurrentTime,
        currentMouseY: initialCurrentMouseY,
      });
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDragState(initialDragState);
    setDragDropTarget(null);
  }, []);

  useEffect(() => {
    if (!dragState.isDragging && !isPendingDrag) return;

    const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
      let startedDragThisEvent = false;
      const timeline = timelineRef.current;
      const scrollContainer = tracksScrollRef.current;
      if (!timeline || !scrollContainer) return;
      lastMouseXRef.current = clientX;

      if (isPendingDrag && pendingDragRef.current) {
        const deltaX = Math.abs(clientX - pendingDragRef.current.startMouseX);
        const deltaY = Math.abs(clientY - pendingDragRef.current.startMouseY);
        if (deltaX > DRAG_THRESHOLD_PX || deltaY > DRAG_THRESHOLD_PX) {
          const activeProject = editor.project.getActive();
          if (!activeProject) return;
          const scrollLeft = scrollContainer.scrollLeft;
          const mouseTime = getMouseTimeFromClientX({
            clientX,
            containerRect: scrollContainer.getBoundingClientRect(),
            zoomLevel,
            scrollLeft,
          });
          const adjustedTime = Math.max(
            0,
            mouseTime - pendingDragRef.current.clickOffsetTime,
          );
          const snappedTime = snapTimeToFrame({
            time: adjustedTime,
            fps: activeProject.settings.fps,
          });
          startDrag({
            ...pendingDragRef.current,
            initialCurrentTime: snappedTime,
            initialCurrentMouseY: clientY,
          });
          startedDragThisEvent = true;
          pendingDragRef.current = null;
          setIsPendingDrag(false);
        } else {
          return;
        }
      }

      if (startedDragThisEvent) {
        return;
      }

      if (dragState.elementId && dragState.trackId) {
        const alreadySelected = isElementSelected({
          trackId: dragState.trackId,
          elementId: dragState.elementId,
        });
        if (!alreadySelected) {
          selectElement({
            trackId: dragState.trackId,
            elementId: dragState.elementId,
          });
        }
      }

      const activeProject = editor.project.getActive();
      if (!activeProject) return;

      const scrollLeft = scrollContainer.scrollLeft;
      const mouseTime = getMouseTimeFromClientX({
        clientX,
        containerRect: scrollContainer.getBoundingClientRect(),
        zoomLevel,
        scrollLeft,
      });
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
      const fps = activeProject.settings.fps;
      const snappedTime = snapTimeToFrame({ time: adjustedTime, fps });
      setDragState((previousDragState) => ({
        ...previousDragState,
        currentTime: snappedTime,
        currentMouseY: clientY,
      }));

      if (dragState.elementId && dragState.trackId) {
        const dropTarget = getDragDropTarget({
          clientX,
          clientY,
          elementId: dragState.elementId,
          trackId: dragState.trackId,
          tracks,
          tracksContainerRef,
          tracksScrollRef,
          zoomLevel,
          snappedTime,
        });
        setDragDropTarget(dropTarget?.isNewTrack ? dropTarget : null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [
    dragState.isDragging,
    dragState.clickOffsetTime,
    dragState.elementId,
    dragState.trackId,
    zoomLevel,
    isElementSelected,
    selectElement,
    editor.project,
    timelineRef,
    tracksScrollRef,
    tracksContainerRef,
    tracks,
    isPendingDrag,
    startDrag,
  ]);

  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseUp = ({ clientX, clientY }: MouseEvent) => {
      if (!dragState.elementId || !dragState.trackId) return;

      if (mouseDownLocationRef.current) {
        const deltaX = Math.abs(clientX - mouseDownLocationRef.current.x);
        const deltaY = Math.abs(clientY - mouseDownLocationRef.current.y);
        if (deltaX <= DRAG_THRESHOLD_PX && deltaY <= DRAG_THRESHOLD_PX) {
          mouseDownLocationRef.current = null;
          endDrag();
          onSnapPointChange?.(null);
          return;
        }
      }

      const dropTarget = getDragDropTarget({
        clientX,
        clientY,
        elementId: dragState.elementId,
        trackId: dragState.trackId,
        tracks,
        tracksContainerRef,
        tracksScrollRef,
        zoomLevel,
        snappedTime: dragState.currentTime,
      });
      if (!dropTarget) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }
      const snappedTime = dragState.currentTime;

      const sourceTrack = tracks.find(({ id }) => id === dragState.trackId);
      if (!sourceTrack) {
        endDrag();
        onSnapPointChange?.(null);
        return;
      }

      if (dropTarget.isNewTrack) {
        const newTrackId = generateUUID();

        editor.timeline.moveElement({
          sourceTrackId: dragState.trackId,
          targetTrackId: newTrackId,
          elementId: dragState.elementId,
          newStartTime: snappedTime,
          createTrack: { type: sourceTrack.type, index: dropTarget.trackIndex },
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
    editor.timeline,
    tracksContainerRef,
    tracksScrollRef,
  ]);

  useEffect(() => {
    if (!isPendingDrag) return;

    const handleMouseUp = () => {
      pendingDragRef.current = null;
      setIsPendingDrag(false);
      onSnapPointChange?.(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isPendingDrag, onSnapPointChange]);

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
      event.stopPropagation();
      mouseDownLocationRef.current = { x: event.clientX, y: event.clientY };

      const isRightClick = event.button === 2;
      const isMultiSelect = event.metaKey || event.ctrlKey || event.shiftKey;

      // right-click
      if (isRightClick) {
        const alreadySelected = isElementSelected({
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
      const clickOffsetTime = getClickOffsetTime({
        clientX: event.clientX,
        elementRect: (
          event.currentTarget as HTMLElement
        ).getBoundingClientRect(),
        zoomLevel,
      });
      pendingDragRef.current = {
        elementId: element.id,
        trackId: track.id,
        startMouseX: event.clientX,
        startMouseY: event.clientY,
        startElementTime: element.startTime,
        clickOffsetTime,
      };
      setIsPendingDrag(true);
    },
    [zoomLevel, isElementSelected, handleSelectionClick],
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
      const alreadySelected = isElementSelected({
        trackId: track.id,
        elementId: element.id,
      });
      if (!alreadySelected) {
        selectElement({ trackId: track.id, elementId: element.id });
      }
    },
    [isElementSelected, selectElement],
  );

  return {
    dragState,
    dragDropTarget,
    handleElementMouseDown,
    handleElementClick,
    lastMouseXRef,
  };
}
