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
    <div
      className="relative mt-0.5 h-4 flex-1 overflow-hidden"
      onWheel={handleWheel}
      onClick={handleTimelineContentClick}
      onMouseDown={handleRulerTrackingMouseDown}
      data-bookmarks-area
    >
      <ScrollArea className="scrollbar-hidden w-full" ref={bookmarksScrollRef}>
        <div
          className="relative h-4 cursor-default select-none"
          style={{
            width: `${dynamicTimelineWidth}px`,
          }}
          onMouseDown={handleRulerMouseDown}
        >
          {activeScene.bookmarks.map((time: number, index: number) => (
            <TimelineBookmark
              key={`bookmark-row-${index}`}
              time={time}
              zoomLevel={zoomLevel}
            />
          ))}
        </div>
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
    event: React.MouseEvent<HTMLDivElement>;
  }) => {
    event.stopPropagation();
    editor.playback.seek({ time });
  };

  return (
    <div
      className="absolute top-0 h-10 w-0.5 cursor-pointer"
      style={{
        left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
      }}
      onClick={(event) => handleBookmarkClick({ event })}
    >
      <div className="text-primary absolute left-[-5px] top-[-1px]">
        <Bookmark className="fill-primary size-3" />
      </div>
    </div>
  );
}
