import { ScrollArea } from "@/components/ui/scroll-area";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useEditor } from "@/hooks/use-editor";
import { Bookmark } from "lucide-react";
import { TimelineTick } from "./timeline-tick";

interface TimelineRulerProps {
  zoomLevel: number;
  dynamicTimelineWidth: number;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  handleWheel: (e: React.WheelEvent) => void;
  handleSelectionMouseDown: (e: React.MouseEvent) => void;
  handleTimelineContentClick: (e: React.MouseEvent) => void;
  handleRulerMouseDown: (e: React.MouseEvent) => void;
}

export function TimelineRuler({
  zoomLevel,
  dynamicTimelineWidth,
  rulerRef,
  rulerScrollRef,
  handleWheel,
  handleSelectionMouseDown,
  handleTimelineContentClick,
  handleRulerMouseDown,
}: TimelineRulerProps) {
  const editor = useEditor();
  const activeScene = editor.scenes.getActiveScene();
  const duration = editor.timeline.getTotalDuration();

  const interval = getOptimalTimeInterval({ zoomLevel });
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const tickSpacingPixels = interval * pixelsPerSecond;
  const minLabelSpacingPixels = 120;
  const labelEvery = Math.max(
    1,
    Math.ceil(minLabelSpacingPixels / tickSpacingPixels),
  );
  const markerCount = Math.ceil(duration / interval) + 1;

  const timelineTicks: Array<JSX.Element> = [];
  for (let markerIndex = 0; markerIndex < markerCount; markerIndex += 1) {
    const time = markerIndex * interval;
    if (time > duration) break;

    timelineTicks.push(
      <TimelineTick
        key={markerIndex}
        time={time}
        zoomLevel={zoomLevel}
        interval={interval}
        shouldShowLabel={markerIndex % labelEvery === 0}
      />,
    );
  }

  return (
    <div
      className="relative h-10 flex-1 overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleSelectionMouseDown}
      onClick={handleTimelineContentClick}
      data-ruler-area
    >
      <ScrollArea className="w-full" ref={rulerScrollRef}>
        <div
          ref={rulerRef}
          className="relative h-10 cursor-default select-none"
          style={{
            width: `${dynamicTimelineWidth}px`,
          }}
          onMouseDown={handleRulerMouseDown}
        >
          {timelineTicks}

          {activeScene.bookmarks.map((time: number, index: number) => (
            <TimelineBookmark
              key={`bookmark-${index}`}
              time={time}
              zoomLevel={zoomLevel}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TimelineBookmark({
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
      className="!bg-primary absolute top-0 h-10 w-0.5 cursor-pointer"
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

function getOptimalTimeInterval({ zoomLevel }: { zoomLevel: number }) {
  const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  if (pixelsPerSecond >= 200) return 0.1;
  if (pixelsPerSecond >= 100) return 0.5;
  if (pixelsPerSecond >= 50) return 1;
  if (pixelsPerSecond >= 25) return 2;
  if (pixelsPerSecond >= 12) return 5;
  if (pixelsPerSecond >= 6) return 10;
  return 30;
}
