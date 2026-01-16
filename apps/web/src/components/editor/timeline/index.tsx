"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, VolumeOff, Volume2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import { useTimelineZoom } from "@/hooks/timeline/use-timeline-zoom";
import { useState, useRef, useCallback } from "react";
import { TimelineTrackContent } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { SelectionBox } from "../selection-box";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { SnapIndicator } from "./snap-indicator";
import { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";
import type { TimelineTrack } from "@/types/timeline";
import {
  TIMELINE_CONSTANTS,
  TRACK_ICONS,
} from "@/constants/timeline-constants";
import { useElementInteraction } from "@/hooks/timeline/use-element-interaction";
import {
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
  canTracktHaveAudio,
  canTrackBeHidden,
} from "@/lib/timeline";
import { TimelineToolbar } from "./timeline-toolbar";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useElementSelection } from "@/hooks/use-element-selection";
import { useTimelineInteractions } from "@/hooks/timeline/use-timeline-interactions";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineBookmarksRow } from "./bookmarks";
import { useTimelineStore } from "@/stores/timeline-store";
import { useEditor } from "@/hooks/use-editor";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";

export function Timeline() {
  const tracksContainerHeight = { min: 200, max: 800 };
  const { snappingEnabled } = useTimelineStore();
  const { clearSelection, setSelection } = useElementSelection();
  const editor = useEditor();
  const timeline = editor.timeline;
  const tracks = timeline.getTracks();
  const seek = (time: number) => editor.playback.seek({ time });

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);
  const bookmarksScrollRef = useRef<HTMLDivElement>(null);

  // State
  const [isInTimeline, setIsInTimeline] = useState(false);
  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
    null,
  );

  const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
    setCurrentSnapPoint(snapPoint);
  }, []);

  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
  });

  const {
    dragState,
    handleElementMouseDown,
    handleElementClick,
    lastMouseXRef,
  } = useElementInteraction({
    zoomLevel,
    timelineRef,
    tracksContainerRef,
    onSnapPointChange: handleSnapPointChange,
  });

  const timelineDuration = timeline.getTotalDuration() || 0;
  const paddedDuration =
    timelineDuration + TIMELINE_CONSTANTS.PLAYHEAD_LOOKAHEAD_SECONDS;
  const dynamicTimelineWidth = Math.max(
    paddedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    timelineRef.current?.clientWidth || 1000,
  );

  const { handleRulerMouseDown } = useTimelinePlayhead({
    zoomLevel,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  const { dragProps } = useTimelineDragDrop({
    containerRef: tracksContainerRef,
    zoomLevel,
  });

  const {
    selectionBox,
    handleMouseDown: handleSelectionMouseDown,
    isSelecting,
  } = useSelectionBox({
    containerRef: tracksContainerRef,
    onSelectionComplete: (elements) => {
      setSelection(elements);
    },
    tracksScrollRef,
    zoomLevel,
  });

  const showSnapIndicator =
    dragState.isDragging && snappingEnabled && currentSnapPoint !== null;

  const { handleTimelineMouseDown, handleTimelineContentClick } =
    useTimelineInteractions({
      playheadRef,
      rulerScrollRef,
      tracksScrollRef,
      zoomLevel,
      duration: timeline.getTotalDuration(),
      isSelecting,
      clearSelectedElements: clearSelection,
      seek,
    });

  useScrollSync({
    rulerScrollRef,
    tracksScrollRef,
    trackLabelsScrollRef,
    bookmarksScrollRef,
  });

  return (
    <div
      className={
        "bg-panel relative flex h-full flex-col overflow-hidden rounded-sm transition-colors duration-200"
      }
      {...dragProps}
      onMouseEnter={() => setIsInTimeline(true)}
      onMouseLeave={() => setIsInTimeline(false)}
    >
      <TimelineToolbar
        zoomLevel={zoomLevel}
        setZoomLevel={({ zoom }) => setZoomLevel(zoom)}
      />

      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        ref={timelineRef}
      >
        <TimelinePlayhead
          zoomLevel={zoomLevel}
          rulerRef={rulerRef}
          rulerScrollRef={rulerScrollRef}
          tracksScrollRef={tracksScrollRef}
          trackLabelsRef={trackLabelsRef}
          timelineRef={timelineRef}
          playheadRef={playheadRef}
          isSnappingToPlayhead={
            showSnapIndicator && currentSnapPoint?.type === "playhead"
          }
        />
        <SnapIndicator
          snapPoint={currentSnapPoint}
          zoomLevel={zoomLevel}
          tracks={tracks}
          timelineRef={timelineRef}
          trackLabelsRef={trackLabelsRef}
          tracksScrollRef={tracksScrollRef}
          isVisible={showSnapIndicator}
        />
        <div className="bg-panel sticky top-0 z-10 flex flex-col">
          <div className="flex">
            <div className="bg-panel flex h-4 w-28 shrink-0 items-center justify-between border-r px-3">
              <span className="opacity-0">.</span>
            </div>

            <TimelineRuler
              zoomLevel={zoomLevel}
              dynamicTimelineWidth={dynamicTimelineWidth}
              rulerRef={rulerRef}
              rulerScrollRef={rulerScrollRef}
              handleWheel={handleWheel}
              handleTimelineContentClick={handleTimelineContentClick}
              handleRulerMouseDown={handleRulerMouseDown}
            />
          </div>
          <div className="flex">
            <div className="bg-panel flex h-6 w-28 shrink-0 items-center justify-between border-r px-3">
              <span className="opacity-0">.</span>
            </div>
            <TimelineBookmarksRow
              zoomLevel={zoomLevel}
              dynamicTimelineWidth={dynamicTimelineWidth}
              bookmarksScrollRef={bookmarksScrollRef}
              handleWheel={handleWheel}
              handleTimelineContentClick={handleTimelineContentClick}
              handleRulerMouseDown={handleRulerMouseDown}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {tracks.length > 0 && (
            <div
              ref={trackLabelsRef}
              className="z-100 bg-panel w-28 shrink-0 overflow-y-auto border-r"
              data-track-labels
            >
              <ScrollArea className="h-full w-full" ref={trackLabelsScrollRef}>
                <div className="flex flex-col gap-1">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="group flex items-center px-3"
                      style={{
                        height: `${getTrackHeight({ type: track.type })}px`,
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                        {canTracktHaveAudio(track) && (
                          <>
                            {track.muted ? (
                              <VolumeOff
                                className="text-destructive h-4 w-4 cursor-pointer"
                                onClick={() =>
                                  timeline.toggleTrackMute({
                                    trackId: track.id,
                                  })
                                }
                              />
                            ) : (
                              <Volume2
                                className="text-muted-foreground h-4 w-4 cursor-pointer"
                                onClick={() =>
                                  timeline.toggleTrackMute({
                                    trackId: track.id,
                                  })
                                }
                              />
                            )}
                          </>
                        )}
                        {canTrackBeHidden(track) && (
                          <Eye
                            className="text-muted-foreground h-4 w-4 cursor-pointer"
                            onClick={() =>
                              timeline.toggleTrackHidden({
                                trackId: track.id,
                              })
                            }
                          />
                        )}
                        <TrackIcon track={track} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div
            className="relative flex-1 overflow-hidden"
            onWheel={(e) => {
              if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return;
              }
              handleWheel(e);
            }}
            onMouseDown={(e) => {
              handleTimelineMouseDown(e);
              handleSelectionMouseDown(e);
            }}
            onClick={handleTimelineContentClick}
            ref={tracksContainerRef}
          >
            <SelectionBox
              startPos={selectionBox?.startPos || null}
              currentPos={selectionBox?.currentPos || null}
              containerRef={tracksContainerRef}
              isActive={selectionBox?.isActive || false}
            />
            <ScrollArea className="h-full w-full" ref={tracksScrollRef}>
              <div
                className="relative flex-1"
                style={{
                  height: `${Math.max(
                    tracksContainerHeight.min,
                    Math.min(
                      tracksContainerHeight.max,
                      getTotalTracksHeight({ tracks }),
                    ),
                  )}px`,
                  width: `${dynamicTimelineWidth}px`,
                }}
              >
                {tracks.length === 0 ? (
                  <div />
                ) : (
                  <>
                    {tracks.map((track, index) => (
                      <ContextMenu key={track.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            className="absolute left-0 right-0"
                            style={{
                              top: `${getCumulativeHeightBefore({
                                tracks,
                                trackIndex: index,
                              })}px`,
                              height: `${getTrackHeight({ type: track.type })}px`,
                            }}
                          >
                            <TimelineTrackContent
                              track={track}
                              zoomLevel={zoomLevel}
                              dragState={dragState}
                              rulerScrollRef={rulerScrollRef}
                              tracksScrollRef={tracksScrollRef}
                              lastMouseXRef={lastMouseXRef}
                              onElementMouseDown={handleElementMouseDown}
                              onElementClick={handleElementClick}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="z-200">
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              timeline.toggleTrackMute({
                                trackId: track.id,
                              });
                            }}
                          >
                            {canTracktHaveAudio(track) && track.muted
                              ? "Unmute track"
                              : "Mute track"}
                          </ContextMenuItem>
                          <ContextMenuItem onClick={(e) => e.stopPropagation()}>
                            Track settings (soon)
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackIcon({ track }: { track: TimelineTrack }) {
  return <>{TRACK_ICONS[track.type]}</>;
}
