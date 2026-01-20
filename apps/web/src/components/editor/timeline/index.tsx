"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, VolumeOff, Volume2, LucideIcon, EyeIcon, Trash2 } from "lucide-react";
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
import { useSelectionBox } from "@/hooks/timeline/use-selection-box";
import { SnapIndicator } from "./snap-indicator";
import { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";
import type { TimelineTrack } from "@/types/timeline";
import {
  TIMELINE_CONSTANTS,
  TRACK_ICONS,
} from "@/constants/timeline-constants";
import { useElementInteraction } from "@/hooks/timeline/element/use-element-interaction";
import {
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
  canTracktHaveAudio,
  canTrackBeHidden,
  isMainTrack,
  getTimelineZoomMin,
} from "@/lib/timeline";
import { TimelineToolbar } from "./timeline-toolbar";
import { useScrollSync } from "@/hooks/timeline/use-scroll-sync";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useTimelineInteractions } from "@/hooks/timeline/use-timeline-interactions";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineBookmarksRow } from "./bookmarks";
import { useTimelineStore } from "@/stores/timeline-store";
import { useEditor } from "@/hooks/use-editor";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { DragLine } from "./drag-line";

export function Timeline() {
  const tracksContainerHeight = { min: 0, max: 800 };
  const { snappingEnabled } = useTimelineStore();
  const { clearElementSelection, setElementSelection } = useElementSelection();
  const editor = useEditor();
  const timeline = editor.timeline;
  const tracks = timeline.getTracks();
  const seek = (time: number) => editor.playback.seek({ time });

  // refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);
  const bookmarksScrollRef = useRef<HTMLDivElement>(null);

  // state
  const [isInTimeline, setIsInTimeline] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
    null,
  );

  const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
    setCurrentSnapPoint(snapPoint);
  }, []);
  const handleResizeStateChange = useCallback(
    ({ isResizing: nextIsResizing }: { isResizing: boolean }) => {
      setIsResizing(nextIsResizing);
      if (!nextIsResizing) {
        setCurrentSnapPoint(null);
      }
    },
    [],
  );

  const timelineDuration = timeline.getTotalDuration() || 0;
  const minZoomLevel = getTimelineZoomMin({
    duration: timelineDuration,
    containerWidth: timelineRef.current?.clientWidth,
  });

  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
    minZoom: minZoomLevel,
  });

  const {
    dragState,
    dragDropTarget,
    handleElementMouseDown,
    handleElementClick,
    lastMouseXRef,
  } = useElementInteraction({
    zoomLevel,
    timelineRef,
    tracksContainerRef,
    tracksScrollRef,
    snappingEnabled,
    onSnapPointChange: handleSnapPointChange,
  });

  const { handleRulerMouseDown: handlePlayheadRulerMouseDown } =
    useTimelinePlayhead({
      zoomLevel,
      rulerRef,
      rulerScrollRef,
      tracksScrollRef,
      playheadRef,
    });

  const { isDragOver, dropTarget, dragProps } = useTimelineDragDrop({
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
      setElementSelection({ elements });
    },
    tracksScrollRef,
    zoomLevel,
  });

  const paddedDuration =
    timelineDuration + TIMELINE_CONSTANTS.PLAYHEAD_LOOKAHEAD_SECONDS;
  const dynamicTimelineWidth = Math.max(
    paddedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    timelineRef.current?.clientWidth || 1000,
  );

  const showSnapIndicator =
    snappingEnabled &&
    currentSnapPoint !== null &&
    (dragState.isDragging || isResizing);

  const {
    handleTracksMouseDown,
    handleTracksClick,
    handleRulerMouseDown,
    handleRulerClick,
  } = useTimelineInteractions({
    playheadRef,
    trackLabelsRef,
    rulerScrollRef,
    tracksScrollRef,
    zoomLevel,
    duration: timeline.getTotalDuration(),
    isSelecting,
    clearSelectedElements: clearElementSelection,
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
        minZoom={minZoomLevel}
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
              handleTimelineContentClick={handleRulerClick}
              handleRulerTrackingMouseDown={handleRulerMouseDown}
              handleRulerMouseDown={handlePlayheadRulerMouseDown}
            />
          </div>
          <div className="flex">
            <div className="bg-panel flex h-4 w-28 shrink-0 items-center justify-between border-r px-3">
              <span className="opacity-0">.</span>
            </div>
            <TimelineBookmarksRow
              zoomLevel={zoomLevel}
              dynamicTimelineWidth={dynamicTimelineWidth}
              bookmarksScrollRef={bookmarksScrollRef}
              handleWheel={handleWheel}
              handleTimelineContentClick={handleRulerClick}
              handleRulerTrackingMouseDown={handleRulerMouseDown}
              handleRulerMouseDown={handlePlayheadRulerMouseDown}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {tracks.length > 0 && (
            <div
              ref={trackLabelsRef}
              className="z-100 bg-panel w-28 shrink-0 overflow-y-auto border-r"
              style={{ paddingTop: TIMELINE_CONSTANTS.PADDING_TOP }}
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
                        {/* Debug main track */}
                        {/* {isMainTrack(track) && (
                          <div className="size-2 rounded-full bg-red-500" />
                        )} */}

                        {canTracktHaveAudio(track) && (
                          <TrackToggleIcon
                            isOff={track.muted}
                            icons={{
                              on: Volume2,
                              off: VolumeOff,
                            }}
                            onClick={() =>
                              editor.timeline.toggleTrackMute({
                                trackId: track.id,
                              })
                            }
                          />
                        )}

                        {canTrackBeHidden(track) && (
                          <TrackToggleIcon
                            isOff={track.hidden}
                            icons={{
                              on: Eye,
                              off: EyeOff,
                            }}
                            onClick={() =>
                              editor.timeline.toggleTrackVisibility({
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
            style={{ paddingTop: TIMELINE_CONSTANTS.PADDING_TOP }}
            onWheel={(e) => {
              if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return;
              }
              handleWheel(e);
            }}
            onMouseDown={(e) => {
              handleTracksMouseDown(e);
              handleSelectionMouseDown(e);
            }}
            onClick={handleTracksClick}
            ref={tracksContainerRef}
          >
            <SelectionBox
              startPos={selectionBox?.startPos || null}
              currentPos={selectionBox?.currentPos || null}
              containerRef={tracksContainerRef}
              isActive={selectionBox?.isActive || false}
            />
            <DragLine
              dropTarget={dropTarget}
              tracks={timeline.getTracks()}
              isVisible={isDragOver}
            />
            <DragLine
              dropTarget={dragDropTarget}
              tracks={timeline.getTracks()}
              isVisible={dragState.isDragging}
            />

            <ScrollArea
              className="h-full w-full"
              ref={tracksScrollRef}
              onMouseDown={(event) => {
                const isDirectTarget = event.target === event.currentTarget;
                if (!isDirectTarget) return;
                event.stopPropagation();
                handleTracksMouseDown(event);
                handleSelectionMouseDown(event);
              }}
              onClick={(event) => {
                const isDirectTarget = event.target === event.currentTarget;
                if (!isDirectTarget) return;
                event.stopPropagation();
                handleTracksClick(event);
              }}
            >
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
                              onSnapPointChange={handleSnapPointChange}
                              onResizeStateChange={handleResizeStateChange}
                              onElementMouseDown={handleElementMouseDown}
                              onElementClick={handleElementClick}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="z-200 w-40">
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              timeline.toggleTrackMute({
                                trackId: track.id,
                              });
                            }}
                          >
                            <Volume2 />
                            <span>

                              {canTracktHaveAudio(track) && track.muted
                                ? "Unmute track"
                                : "Mute track"}
                            </span>
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              timeline.toggleTrackVisibility({
                                trackId: track.id,
                              });
                            }}
                          >
                            <>
                              <EyeIcon />
                              <span>
                                {canTrackBeHidden(track) && track.hidden
                                  ? "Show track"
                                  : "Hide track"}
                              </span>
                            </>
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              timeline.removeTrack({
                                trackId: track.id,
                              });
                            }}
                            variant="destructive"
                          >
                            <Trash2 />
                            Delete track
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

function TrackToggleIcon({
  isOff,
  icons,
  onClick,
}: {
  isOff: boolean;
  icons: {
    on: LucideIcon;
    off: LucideIcon;
  };
  onClick: () => void;
}) {
  return (
    <>
      {isOff ? (
        <icons.off
          className="text-destructive size-4 cursor-pointer"
          onClick={onClick}
        />
      ) : (
        <icons.on
          className="text-muted-foreground size-4 cursor-pointer"
          onClick={onClick}
        />
      )}
    </>
  );
}
