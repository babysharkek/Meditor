import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { useEditor } from "../use-editor";

interface UseTimelineInteractionsProps {
  playheadRef: RefObject<HTMLDivElement>;
  rulerScrollRef: RefObject<HTMLDivElement>;
  tracksScrollRef: RefObject<HTMLDivElement>;
  zoomLevel: number;
  duration: number;
  isSelecting: boolean;
  clearSelectedElements: () => void;
  seek: (time: number) => void;
}

export function useTimelineInteractions({
  playheadRef,
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

  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      const isTimelineBackground =
        !target.closest(".timeline-element") &&
        !playheadRef.current?.contains(target) &&
        !target.closest("[data-track-labels]");

      if (isTimelineBackground) {
        mouseTrackingRef.current = {
          isMouseDown: true,
          downX: e.clientX,
          downY: e.clientY,
          downTime: e.timeStamp,
        };
      }
    },
    [playheadRef],
  );

  const shouldProcessTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const { isMouseDown, downX, downY, downTime } = mouseTrackingRef.current;

      if (!isMouseDown) return false;

      const deltaX = Math.abs(e.clientX - downX);
      const deltaY = Math.abs(e.clientY - downY);
      const deltaTime = e.timeStamp - downTime;

      if (deltaX > 5 || deltaY > 5 || deltaTime > 500) return false;

      if (isSelecting) return false;

      if (target.closest(".timeline-element")) return false;

      if (playheadRef.current?.contains(target)) return false;

      if (target.closest("[data-track-labels]")) {
        clearSelectedElements();
        return false;
      }

      return true;
    },
    [isSelecting, clearSelectedElements, playheadRef],
  );

  const handleTimelineSeek = useCallback(
    (e: React.MouseEvent) => {
      const isRulerClick = (e.target as HTMLElement).closest(
        "[data-ruler-area]",
      );
      const scrollContainer = isRulerClick
        ? rulerScrollRef.current
        : tracksScrollRef.current;

      if (!scrollContainer) return;

      const rect = scrollContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
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
      seek,
      rulerScrollRef,
      tracksScrollRef,
      activeProject?.settings.fps,
    ],
  );

  const handleTimelineContentClick = useCallback(
    (e: React.MouseEvent) => {
      mouseTrackingRef.current = {
        isMouseDown: false,
        downX: 0,
        downY: 0,
        downTime: 0,
      };

      if (shouldProcessTimelineClick(e)) {
        clearSelectedElements();
        handleTimelineSeek(e);
      }
    },
    [shouldProcessTimelineClick, handleTimelineSeek, clearSelectedElements],
  );

  return {
    handleTimelineMouseDown,
    handleTimelineContentClick,
  };
}
