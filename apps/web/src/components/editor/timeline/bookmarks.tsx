import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/hooks/use-editor";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { Bookmark } from "lucide-react";

interface TimelineBookmarksRowProps {
	zoomLevel: number;
	dynamicTimelineWidth: number;
	bookmarksScrollRef: React.RefObject<HTMLDivElement>;
	handleWheel: (e: React.WheelEvent) => void;
	handleTimelineContentClick: (e: React.MouseEvent) => void;
	handleRulerTrackingMouseDown: (e: React.MouseEvent) => void;
	handleRulerMouseDown: (e: React.MouseEvent) => void;
}

export function TimelineBookmarksRow({
	zoomLevel,
	dynamicTimelineWidth,
	bookmarksScrollRef,
	handleWheel,
	handleTimelineContentClick,
	handleRulerTrackingMouseDown,
	handleRulerMouseDown,
}: TimelineBookmarksRowProps) {
	const editor = useEditor();
	const activeScene = editor.scenes.getActiveScene();

	return (
		<div className="relative h-4 flex-1 overflow-hidden">
			<ScrollArea className="scrollbar-hidden w-full" ref={bookmarksScrollRef}>
				<button
					className="relative h-4 w-full cursor-default select-none border-0 bg-transparent p-0"
					style={{
						width: `${dynamicTimelineWidth}px`,
					}}
					aria-label="Timeline ruler"
					type="button"
					onWheel={handleWheel}
					onClick={handleTimelineContentClick}
					onMouseDown={(event) => {
						handleRulerMouseDown(event);
						handleRulerTrackingMouseDown(event);
					}}
				>
					{activeScene.bookmarks.map((time: number) => (
						<TimelineBookmark
							key={`bookmark-row-${time}`}
							time={time}
							zoomLevel={zoomLevel}
						/>
					))}
				</button>
			</ScrollArea>
		</div>
	);
}

export function TimelineBookmark({
	time,
	zoomLevel,
}: {
	time: number;
	zoomLevel: number;
}) {
	const editor = useEditor();

	const handleBookmarkClick = ({
		event,
	}: {
		event: React.MouseEvent<HTMLButtonElement>;
	}) => {
		event.stopPropagation();
		editor.playback.seek({ time });
	};

	return (
		<button
			className="absolute top-0 h-10 w-0.5 cursor-pointer border-0 bg-transparent p-0"
			style={{
				left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
			}}
			aria-label={`Seek to bookmark at ${time}s`}
			type="button"
			onClick={(event) => handleBookmarkClick({ event })}
		>
			<div className="text-primary absolute top-[-1px] left-[-5px]">
				<Bookmark
					aria-hidden="true"
					className="fill-primary size-3"
					focusable="false"
				/>
			</div>
		</button>
	);
}
