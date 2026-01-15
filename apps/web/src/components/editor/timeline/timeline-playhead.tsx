"use client";

import { useRef, useState, useEffect } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { useEditor } from "@/hooks/use-editor";

interface TimelinePlayheadProps {
  zoomLevel: number;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  trackLabelsRef?: React.RefObject<HTMLDivElement>;
  timelineRef: React.RefObject<HTMLDivElement>;
  playheadRef?: React.RefObject<HTMLDivElement>;
  isSnappingToPlayhead?: boolean;
}

export function TimelinePlayhead({
  zoomLevel,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  trackLabelsRef,
  timelineRef,
  playheadRef: externalPlayheadRef,
  isSnappingToPlayhead = false,
}: TimelinePlayheadProps) {
  const editor = useEditor();
  const duration = editor.timeline.getTotalDuration();
  const tracks = editor.timeline.getTracks();
  const internalPlayheadRef = useRef<HTMLDivElement>(null);
  const playheadRef = externalPlayheadRef || internalPlayheadRef;
  const [scrollLeft, setScrollLeft] = useState(0);

  const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
    zoomLevel,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  useEffect(() => {
    const tracksViewport = tracksScrollRef.current;

    if (!tracksViewport) return;

    const handleScroll = () => {
      setScrollLeft(tracksViewport.scrollLeft);
    };

    setScrollLeft(tracksViewport.scrollLeft);

    tracksViewport.addEventListener("scroll", handleScroll);
    return () => tracksViewport.removeEventListener("scroll", handleScroll);
  }, [tracksScrollRef]);

  const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
  const totalHeight = timelineContainerHeight - 4;

  const trackLabelsWidth =
    tracks.length > 0 && trackLabelsRef?.current
      ? trackLabelsRef.current.offsetWidth
      : 0;

  const timelinePosition =
    playheadPosition * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const rawLeftPosition = trackLabelsWidth + timelinePosition - scrollLeft;

  const timelineContentWidth =
    duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const tracksViewport = tracksScrollRef.current;
  const viewportWidth = tracksViewport?.clientWidth || 1000;

  const leftBoundary = trackLabelsWidth;
  const rightBoundary = Math.min(
    trackLabelsWidth + timelineContentWidth - scrollLeft,
    trackLabelsWidth + viewportWidth,
  );

  const leftPosition = Math.max(
    leftBoundary,
    Math.min(rightBoundary, rawLeftPosition),
  );

  return (
    <div
      ref={playheadRef}
      className="pointer-events-auto absolute z-40"
      style={{
        left: `${leftPosition}px`,
        top: 0,
        height: `${totalHeight}px`,
        width: "2px",
      }}
      onMouseDown={handlePlayheadMouseDown}
    >
      <div className="bg-foreground absolute left-0 h-full w-0.5 cursor-col-resize" />

      <div
        className={`shadow-xs absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 transform rounded-full border-2 ${isSnappingToPlayhead ? "bg-foreground border-foreground" : "bg-foreground border-foreground/50"}`}
      />
    </div>
  );
}
