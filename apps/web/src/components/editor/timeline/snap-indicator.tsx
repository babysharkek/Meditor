"use client";

import { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";
import { useSnapIndicatorPosition } from "@/hooks/timeline/use-snap-indicator-position";
import type { TimelineTrack } from "@/types/timeline";

interface SnapIndicatorProps {
  snapPoint: SnapPoint | null;
  zoomLevel: number;
  isVisible: boolean;
  tracks: TimelineTrack[];
  timelineRef: React.RefObject<HTMLDivElement>;
  trackLabelsRef?: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
}

export function SnapIndicator({
  snapPoint,
  zoomLevel,
  isVisible,
  tracks,
  timelineRef,
  trackLabelsRef,
  tracksScrollRef,
}: SnapIndicatorProps) {
  const { leftPosition, topPosition, height } = useSnapIndicatorPosition({
    snapPoint,
    zoomLevel,
    tracks,
    timelineRef,
    trackLabelsRef,
    tracksScrollRef,
  });

  if (!isVisible || !snapPoint) {
    return null;
  }

  return (
    <div
      className="z-90 pointer-events-none absolute"
      style={{
        left: `${leftPosition}px`,
        top: topPosition,
        height: `${height}px`,
        width: "2px",
      }}
    >
      <div className={"bg-primary/40 h-full w-0.5 opacity-80"} />
    </div>
  );
}
