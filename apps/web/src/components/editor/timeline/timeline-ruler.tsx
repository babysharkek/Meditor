import { ScrollArea } from "@/components/ui/scroll-area";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/project-constants";
import { useEditor } from "@/hooks/use-editor";
import { TimelineTick } from "./timeline-tick";

interface TimelineRulerProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	rulerRef: React.RefObject<HTMLDivElement>;
	rulerScrollRef: React.RefObject<HTMLDivElement>;
	handleWheel: (e: React.WheelEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (e: React.MouseEvent) => void;
	handleRulerMouseDown: (e: React.MouseEvent) => void;
}

export function TimelineRuler({
	zoomLevel,
	dynamicTimelineWidth,
	rulerRef,
	rulerScrollRef,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineRulerProps) {
	const editor = useEditor();
	const duration = editor.timeline.getTotalDuration();
	const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const visibleDuration = dynamicTimelineWidth / pixelsPerSecond;
	const effectiveDuration = Math.max(duration, visibleDuration);
	const project = editor.project.getActive();
	const fps = project?.settings.fps ?? DEFAULT_FPS;
	const interval = getOptimalTimeInterval({ zoomLevel, fps });
	const markerCount = Math.ceil(effectiveDuration / interval) + 1;

	const timelineTicks: Array<JSX.Element> = [];
	for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
		const time = markerIndex * interval;
		if (time > effectiveDuration) break;

		timelineTicks.push(
			<TimelineTick key={markerIndex} time={time} zoomLevel={zoomLevel} />,
		);
	}

	return (
		<div
			role="slider"
			tabIndex={0}
			aria-label="Timeline ruler"
			aria-valuemin={0}
			aria-valuemax={effectiveDuration}
			aria-valuenow={0}
			className="relative h-4 flex-1 overflow-hidden"
			onWheel={handleWheel}
			onClick={handleTimelineContentClick}
			onMouseDown={handleRulerTrackingMouseDown}
			onKeyDown={() => {}}
		>
			<ScrollArea className="scrollbar-hidden w-full" ref={rulerScrollRef}>
				<div
					role="none"
					ref={rulerRef}
					className="relative h-4 cursor-default select-none"
					style={{
						width: `${dynamicTimelineWidth}px`,
					}}
					onMouseDown={handleRulerMouseDown}
				>
					{timelineTicks}
				</div>
			</ScrollArea>
		</div>
	);
}

function getOptimalTimeInterval({
	zoomLevel,
	fps,
}: {
	zoomLevel: number;
	fps: number;
}) {
	const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
	const pixelsPerFrame = pixelsPerSecond / fps;
	const minPixelSpacing = 18;
	const minFrames = minPixelSpacing / pixelsPerFrame;
	const baseIntervals = [1, 3, 6, 12, 15, 30];
	const maxInterval = fps * 10;
	const niceIntervals: Array<number> = [...baseIntervals];

	let currentInterval = baseIntervals[baseIntervals.length - 1];
	while (currentInterval < maxInterval) {
		currentInterval *= 2;
		niceIntervals.push(currentInterval);
	}

	for (const intervalFrames of niceIntervals) {
		if (intervalFrames >= minFrames) {
			return intervalFrames / fps;
		}
	}

	return niceIntervals[niceIntervals.length - 1] / fps;
}
