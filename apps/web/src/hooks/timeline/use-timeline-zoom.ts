import {
  useState,
  useCallback,
  useEffect,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  isInTimeline?: boolean;
}

interface UseTimelineZoomReturn {
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  handleWheel: (event: ReactWheelEvent) => void;
}

export function useTimelineZoom({
  containerRef,
  isInTimeline = false,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleWheel = useCallback((event: ReactWheelEvent) => {
    const isZoomGesture = event.ctrlKey || event.metaKey;
    const isHorizontalScrollGesture =
      event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (isHorizontalScrollGesture) {
      return;
    }

    // pinch-zoom (ctrl/meta + wheel)
    if (isZoomGesture) {
      event.preventDefault();
      const zoomMultiplier = event.deltaY > 0 ? 1 / 1.1 : 1.1;
      setZoomLevel((prev) =>
        Math.max(
          TIMELINE_CONSTANTS.ZOOM_MIN,
          Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, prev * zoomMultiplier),
        ),
      );
      // for horizontal scrolling (when shift is held or horizontal wheel movement),
      // let the event bubble up to allow ScrollArea to handle it
      return;
    }
  }, []);

  // prevent browser zoom in the timeline
  useEffect(() => {
    const preventZoom = ({
      ctrlKey,
      metaKey,
      target,
      preventDefault,
    }: WheelEvent) => {
      if (
        isInTimeline &&
        (ctrlKey || metaKey) &&
        containerRef.current?.contains(target as Node)
      ) {
        preventDefault();
      }
    };

    document.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventZoom);
    };
  }, [isInTimeline, containerRef]);

  return {
    zoomLevel,
    setZoomLevel,
    handleWheel,
  };
}
