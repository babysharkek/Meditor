import { snapTimeToFrame } from "@/lib/time-utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { useEdgeAutoScroll } from "@/hooks/use-edge-auto-scroll";
import { useEditor } from "../use-editor";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface UseTimelinePlayheadProps {
  zoomLevel: number;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  playheadRef?: React.RefObject<HTMLDivElement>;
}

export function useTimelinePlayhead({
  zoomLevel,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: UseTimelinePlayheadProps) {
  const editor = useEditor();
  const activeProject = editor.project.getActive();
  const seek = (time: number) => editor.playback.seek({ time });
  const currentTime = editor.playback.getCurrentTime();
  const duration = editor.timeline.getTotalDuration();

  // Playhead scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Ruler drag detection state
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [hasDraggedRuler, setHasDraggedRuler] = useState(false);
  const lastMouseXRef = useRef<number>(0);

  const playheadPosition =
    isScrubbing && scrubTime !== null ? scrubTime : currentTime;

  const handlePlayheadMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation(); // prevent ruler drag from triggering
      setIsScrubbing(true);
      handleScrub(event);
    },
    [duration, zoomLevel],
  );

  const handleRulerMouseDown = useCallback(
    (event: React.MouseEvent) => {
      // only handle left mouse button
      if (event.button !== 0) return;

      // don't interfere if clicking on the playhead itself
      if (playheadRef?.current?.contains(event.target as Node)) return;

      event.preventDefault();
      setIsDraggingRuler(true);
      setHasDraggedRuler(false);

      // start scrubbing immediately
      setIsScrubbing(true);
      handleScrub(event);
    },
    [duration, zoomLevel],
  );

  const handleScrub = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      const ruler = rulerRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const rawX = event.clientX - rect.left;

      // get the timeline content width based on duration and zoom
      const timelineContentWidth =
        duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

      // constrain x to be within the timeline content bounds
      const x = Math.max(0, Math.min(timelineContentWidth, rawX));

      const rawTime = Math.max(
        0,
        Math.min(
          duration,
          x / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
        ),
      );
      // use frame snapping for playhead scrubbing
      const fps = activeProject.settings.fps;
      const time = snapTimeToFrame({ time: rawTime, fps });

      // debug logging
      if (rawX < 0 || x !== rawX) {
        console.log(
          "PLAYHEAD DEBUG:",
          JSON.stringify({
            mouseX: event.clientX,
            rulerLeft: rect.left,
            rawX,
            constrainedX: x,
            timelineContentWidth,
            rawTime,
            finalTime: time,
            duration,
            zoomLevel,
            playheadPx: time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
          }),
        );
      }

      setScrubTime(time);
      seek(time); // update video preview in real time

      // store mouse position for auto-scrolling
      lastMouseXRef.current = event.clientX;
    },
    [duration, zoomLevel, seek, rulerRef, activeProject.settings.fps],
  );

  useEdgeAutoScroll({
    isActive: isScrubbing,
    getMouseClientX: () => lastMouseXRef.current,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
  });

  useEffect(() => {
    if (!isScrubbing) return;

    const onMouseMove = (event: MouseEvent) => {
      handleScrub(event);
      // mark that we've dragged if ruler drag is active
      if (isDraggingRuler) {
        setHasDraggedRuler(true);
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      setIsScrubbing(false);
      if (scrubTime !== null) seek(scrubTime); // finalize seek
      setScrubTime(null);

      // handle ruler click vs drag
      if (isDraggingRuler) {
        setIsDraggingRuler(false);
        // if we didn't drag, treat it as a click-to-seek
        if (!hasDraggedRuler) {
          handleScrub(event);
        }
        setHasDraggedRuler(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    isScrubbing,
    scrubTime,
    seek,
    handleScrub,
    isDraggingRuler,
    hasDraggedRuler,
    // edge auto scroll hook is independent
  ]);

  useEffect(() => {
    // only auto-scroll during playback, not during manual interactions
    if (!editor.playback.getIsPlaying() || isScrubbing) return;

    const rulerViewport = rulerScrollRef.current;
    const tracksViewport = tracksScrollRef.current;
    if (!rulerViewport || !tracksViewport) return;

    const playheadPx =
      playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    const viewportWidth = rulerViewport.clientWidth;
    const scrollMin = 0;
    const scrollMax = rulerViewport.scrollWidth - viewportWidth;

    // only auto-scroll if playhead is completely out of view (no buffer)
    const needsScroll =
      playheadPx < rulerViewport.scrollLeft ||
      playheadPx > rulerViewport.scrollLeft + viewportWidth;

    if (needsScroll) {
      // center the playhead in the viewport
      const desiredScroll = Math.max(
        scrollMin,
        Math.min(scrollMax, playheadPx - viewportWidth / 2),
      );
      rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
    }
  }, [
    playheadPosition,
    duration,
    zoomLevel,
    rulerScrollRef,
    tracksScrollRef,
    isScrubbing,
  ]);

  return {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
  };
}
