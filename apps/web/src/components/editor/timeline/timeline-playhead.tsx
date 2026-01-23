"use client";

import { useEffect, useRef, useState } from "react";
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

	const handlePlayheadKeyDown = (
		event: React.KeyboardEvent<HTMLDivElement>,
	) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

		event.preventDefault();
		const step = 1 / Math.max(1, editor.project.getActive().settings.fps);
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const nextTime = Math.max(
			0,
			Math.min(duration, playheadPosition + direction * step),
		);

		editor.playback.seek({ time: nextTime });
	};

	return (
		<div
			ref={playheadRef}
			role="slider"
			aria-label="Timeline playhead"
			aria-valuemin={0}
			aria-valuemax={duration}
			aria-valuenow={playheadPosition}
			tabIndex={0}
			className="pointer-events-auto absolute z-60"
			style={{
				left: `${leftPosition}px`,
				top: 0,
				height: `${totalHeight}px`,
				width: "2px",
			}}
			onMouseDown={handlePlayheadMouseDown}
			onKeyDown={handlePlayheadKeyDown}
		>
			<div className="bg-foreground absolute left-0 h-full w-0.5 cursor-col-resize" />

			<div
				className={`absolute top-1 left-1/2 size-3 -translate-x-1/2 transform rounded-full border-2 shadow-xs ${isSnappingToPlayhead ? "bg-foreground border-foreground" : "bg-foreground border-foreground/50"}`}
			/>
		</div>
	);
}
