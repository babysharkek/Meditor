import { ScrollArea } from "@/components/ui/scroll-area";
import { TimelineMarker } from "./timeline-marker";
import { useSceneStore } from "@/stores/scene-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { Bookmark } from "lucide-react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useCallback } from "react";

interface TimelineRulerProps {
  zoomLevel: number;
  duration: number;
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
  duration,
  dynamicTimelineWidth,
  rulerRef,
  rulerScrollRef,
  handleWheel,
  handleSelectionMouseDown,
  handleTimelineContentClick,
  handleRulerMouseDown,
}: TimelineRulerProps) {
  const { activeScene } = useSceneStore();

  const getOptimalTimeInterval = useCallback((zoom: number) => {
    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoom;
    if (pixelsPerSecond >= 200) return 0.1;
    if (pixelsPerSecond >= 100) return 0.5;
    if (pixelsPerSecond >= 50) return 1;
    if (pixelsPerSecond >= 25) return 2;
    if (pixelsPerSecond >= 12) return 5;
    if (pixelsPerSecond >= 6) return 10;
    return 30;
  }, []);

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
          {(() => {
            const interval = getOptimalTimeInterval(zoomLevel);
            const markerCount = Math.ceil(duration / interval) + 1;

            return Array.from({ length: markerCount }, (_, i) => {
              const time = i * interval;
              if (time > duration) return null;

              const isMainMarker = time % Math.max(1, interval) === 0;

              return (
                <TimelineMarker
                  key={i}
                  time={time}
                  zoomLevel={zoomLevel}
                  interval={interval}
                  isMainMarker={isMainMarker}
                />
              );
            }).filter(Boolean);
          })()}

          {activeScene?.timeline?.bookmarks?.map((time, i) => (
            <TimelineBookmark
              key={`bookmark-${i}`}
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
  const seek = usePlaybackStore((state) => state.seek);

  return (
    <div
      className="!bg-primary absolute top-0 h-10 w-0.5 cursor-pointer"
      style={{
        left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        seek(time);
      }}
    >
      <div className="text-primary absolute left-[-5px] top-[-1px]">
        <Bookmark className="fill-primary h-3 w-3" />
      </div>
    </div>
  );
}
