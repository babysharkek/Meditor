import { useCallback, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { useEditor } from "../use-editor";

interface UseTimelineInteractionsProps {
  playheadRef: RefObject<HTMLDivElement>;
  trackLabelsRef: RefObject<HTMLDivElement>;
  rulerScrollRef: RefObject<HTMLDivElement>;
  tracksScrollRef: RefObject<HTMLDivElement>;
  zoomLevel: number;
  duration: number;
  isSelecting: boolean;
  clearSelectedElements: () => void;
  seek: (time: number) => void;
}

function resetMouseTracking({
  mouseTrackingRef,
}: {
  mouseTrackingRef: MutableRefObject<{
    isMouseDown: boolean;
    downX: number;
    downY: number;
    downTime: number;
  }>;
}) {
  mouseTrackingRef.current = {
    isMouseDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  };
}

function setMouseTracking({
  mouseTrackingRef,
  event,
}: {
  mouseTrackingRef: MutableRefObject<{
    isMouseDown: boolean;
    downX: number;
    downY: number;
    downTime: number;
  }>;
  event: React.MouseEvent;
}) {
  mouseTrackingRef.current = {
    isMouseDown: true,
    downX: event.clientX,
    downY: event.clientY,
    downTime: event.timeStamp,
  };
}

export function useTimelineInteractions({
  playheadRef,
  trackLabelsRef,
  rulerScrollRef,
  tracksScrollRef,
  zoomLevel,
  duration,
  isSelecting,
  clearSelectedElements,
  seek,
}: UseTimelineInteractionsProps) {
  const editor = useEditor();
  const activeProject = editor.project.getActive();

  const mouseTrackingRef = useRef({
    isMouseDown: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  });

  const handleTracksMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    setMouseTracking({ mouseTrackingRef, event });
  }, []);

  const handleRulerMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    setMouseTracking({ mouseTrackingRef, event });
  }, []);

  const shouldProcessTimelineClick = useCallback(
    ({ event }: { event: React.MouseEvent }) => {
      const target = event.target as HTMLElement;
      const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current;

      if (!isMouseDown) return false;

      const deltaX = Math.abs(event.clientX - downX);
      const deltaY = Math.abs(event.clientY - downY);
      const deltaTime = event.timeStamp - downTime;

      if (deltaX > 5 || deltaY > 5 || deltaTime > 500) return false;

      if (isSelecting) return false;

      if (playheadRef.current?.contains(target)) return false;

      if (trackLabelsRef.current?.contains(target)) {
        clearSelectedElements();
        return false;
      }

      return true;
    },
    [isSelecting, clearSelectedElements, playheadRef, trackLabelsRef],
  );

  const handleTimelineSeek = useCallback(
    ({
      event,
      source,
    }: {
      event: React.MouseEvent;
      source: "ruler" | "tracks";
    }) => {
      const scrollContainer =
        source === "ruler" ? rulerScrollRef.current : tracksScrollRef.current;

      if (!scrollContainer) return;

      const rect = scrollContainer.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const scrollLeft = scrollContainer.scrollLeft;

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          (mouseX + scrollLeft) /
            (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
        ),
      );

      const projectFps = activeProject?.settings.fps || 30;
      const time = snapTimeToFrame({ time: rawTime, fps: projectFps });
      seek(time);
    },
    [
      duration,
      zoomLevel,
      rulerScrollRef,
      tracksScrollRef,
      seek,
      activeProject?.settings.fps,
    ],
  );

  const handleTracksClick = useCallback(
    (event: React.MouseEvent) => {
      resetMouseTracking({ mouseTrackingRef });

      if (shouldProcessTimelineClick({ event })) {
        clearSelectedElements();
        handleTimelineSeek({ event, source: "tracks" });
      }
    },
    [shouldProcessTimelineClick, handleTimelineSeek, clearSelectedElements],
  );

  const handleRulerClick = useCallback(
    (event: React.MouseEvent) => {
      resetMouseTracking({ mouseTrackingRef });

      if (shouldProcessTimelineClick({ event })) {
        clearSelectedElements();
        handleTimelineSeek({ event, source: "ruler" });
      }
    },
    [shouldProcessTimelineClick, handleTimelineSeek, clearSelectedElements],
  );

  return {
    handleTracksMouseDown,
    handleTracksClick,
    handleRulerMouseDown,
    handleRulerClick,
  };
}
