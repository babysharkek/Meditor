"use client";

import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface TimelineTickProps {
  time: number;
  zoomLevel: number;
  interval: number;
  shouldShowLabel: boolean;
}

export function TimelineTick({
  time,
  zoomLevel,
  interval,
  shouldShowLabel,
}: TimelineTickProps) {
  return (
    <div
      className="border-muted-foreground/20 absolute top-0 h-4 border-l"
      style={{
        left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
      }}
    >
      {shouldShowLabel ? (
        <span className="text-muted-foreground/70 absolute left-1 top-1 text-[0.6rem]">
          {formatTimelineTickLabel({ timeInSeconds: time, interval })}
        </span>
      ) : null}
    </div>
  );
}

function formatTimelineTickLabel({
  timeInSeconds,
  interval,
}: {
  timeInSeconds: number;
  interval: number;
}): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const secondsRemainder = timeInSeconds % 60;

  if (hours > 0) {
    const paddedMinutes = minutes.toString().padStart(2, "0");
    const paddedSeconds = Math.floor(secondsRemainder)
      .toString()
      .padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  if (minutes > 0) {
    const paddedSeconds = Math.floor(secondsRemainder)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${paddedSeconds}`;
  }

  if (interval >= 1) {
    return `${Math.floor(secondsRemainder)}s`;
  }

  return `${secondsRemainder.toFixed(1)}s`;
}
