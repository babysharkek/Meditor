"use client";

import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface TimelineTickProps {
	time: number;
	zoomLevel: number;
}

export function TimelineTick({ time, zoomLevel }: TimelineTickProps) {
	return (
		<div
			className="border-muted-foreground/40 absolute top-1 h-1.5 border-l"
			style={{
				left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
			}}
		></div>
	);
}
