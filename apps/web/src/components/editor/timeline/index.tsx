"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Music, TypeIcon, Eye, VolumeOff, Volume2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineZoom } from "@/hooks/timeline/use-timeline-zoom";
import { useState, useRef, useEffect, useCallback } from "react";
import { TimelineTrackContent } from "./timeline-track";
import {
  TimelinePlayhead,
  useTimelinePlayheadRuler,
} from "./timeline-playhead";
import { SelectionBox } from "../selection-box";
import { useSelectionBox } from "@/hooks/use-selection-box";
import { SnapIndicator } from "../snap-indicator";
import { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";
import type { TimelineTrack } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
  getTrackHeight,
  getCumulativeHeightBefore,
  getTotalTracksHeight,
} from "@/lib/timeline";
import { TimelineToolbar } from "./timeline-toolbar";
import { useScrollSync } from "@/hooks/use-scroll-sync";
import { useTimelineInteractions } from "@/hooks/timeline/use-timeline-interactions";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";

export function Timeline() {
  const {
    tracks,
    getTotalDuration,
    clearSelectedElements,
    snappingEnabled,
    setSelectedElements,
    toggleTrackMute,
    dragState,
  } = useTimelineStore();
  const { currentTime, duration, seek, setDuration } = usePlaybackStore();
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isInTimeline, setIsInTimeline] = useState(false);

  // Timeline zoom functionality
  const { zoomLevel, setZoomLevel, handleWheel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline,
  });

  const { dragProps } = useTimelineDragDrop({
    zoomLevel,
  });

  // Dynamic timeline width calculation based on playhead position and duration
  const dynamicTimelineWidth = Math.max(
    (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    (currentTime + TIMELINE_CONSTANTS.PLAYHEAD_LOOKAHEAD_SECONDS) *
      TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
      zoomLevel,
    timelineRef.current?.clientWidth || 1000,
  );

  // Scroll synchronization and auto-scroll to playhead
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLabelsScrollRef = useRef<HTMLDivElement>(null);

  // Timeline playhead ruler handlers
  const { handleRulerMouseDown } = useTimelinePlayheadRuler({
    currentTime,
    duration,
    zoomLevel,
    seek,
    rulerRef,
    rulerScrollRef,
    tracksScrollRef,
    playheadRef,
  });

  // Selection box functionality
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const {
    selectionBox,
    handleMouseDown: handleSelectionMouseDown,
    isSelecting,
    justFinishedSelecting,
  } = useSelectionBox({
    containerRef: tracksContainerRef,
    playheadRef,
    onSelectionComplete: (elements) => {
      console.log(JSON.stringify({ onSelectionComplete: elements.length }));
      setSelectedElements(elements);
    },
  });

  // Calculate snap indicator state
  const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
    null,
  );
  const showSnapIndicator =
    dragState.isDragging && snappingEnabled && currentSnapPoint !== null;

  // Callback to handle snap point changes from TimelineTrackContent
  const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
    setCurrentSnapPoint(snapPoint);
  }, []);

  const { handleTimelineMouseDown, handleTimelineContentClick } =
    useTimelineInteractions({
      playheadRef,
      tracksContainerRef,
      rulerScrollRef,
      tracksScrollRef,
      zoomLevel,
      duration,
      isSelecting,
      justFinishedSelecting,
      clearSelectedElements,
      seek,
    });

  // Update timeline duration when tracks change
  useEffect(() => {
    const totalDuration = getTotalDuration();
    setDuration(
      Math.max(totalDuration, TIMELINE_CONSTANTS.MIN_DURATION_SECONDS),
    );
  }, [tracks, setDuration, getTotalDuration]);

  // --- Scroll synchronization effect ---
  useScrollSync({
    rulerScrollRef,
    tracksScrollRef,
    trackLabelsScrollRef,
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
      <TimelineToolbar zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />

      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        ref={timelineRef}
      >
        <TimelinePlayhead
          currentTime={currentTime}
          duration={duration}
          zoomLevel={zoomLevel}
          tracks={tracks}
          seek={seek}
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
        {/* Timeline Header with Ruler */}
        <div className="bg-panel sticky top-0 z-10 flex">
          {/* Track Labels Header */}
          <div className="bg-panel flex w-28 shrink-0 items-center justify-between border-r px-3 py-2">
            {/* Empty space */}
            <span className="text-muted-foreground text-sm font-medium opacity-0">
              .
            </span>
          </div>

          {/* Timeline Ruler */}
          <TimelineRuler
            zoomLevel={zoomLevel}
            duration={duration}
            dynamicTimelineWidth={dynamicTimelineWidth}
            rulerRef={rulerRef}
            rulerScrollRef={rulerScrollRef}
            handleWheel={handleWheel}
            handleSelectionMouseDown={handleSelectionMouseDown}
            handleTimelineContentClick={handleTimelineContentClick}
            handleRulerMouseDown={handleRulerMouseDown}
          />
        </div>

        {/* Tracks Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Track Labels */}
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
                        {track.muted ? (
                          <VolumeOff
                            className="text-destructive h-4 w-4 cursor-pointer"
                            onClick={() => toggleTrackMute(track.id)}
                          />
                        ) : (
                          <Volume2
                            className="text-muted-foreground h-4 w-4 cursor-pointer"
                            onClick={() => toggleTrackMute(track.id)}
                          />
                        )}
                        <Eye className="text-muted-foreground h-4 w-4" />
                        <TrackIcon track={track} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Timeline Tracks Content */}
          <div
            className="relative flex-1 overflow-hidden"
            onWheel={(e) => {
              // Check if this is horizontal scrolling - if so, don't handle it here
              if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return; // Let ScrollArea handle horizontal scrolling
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
                    200,
                    Math.min(800, getTotalTracksHeight({ tracks })),
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
                            onClick={(e) => {
                              // If clicking empty area (not on a element), deselect all elements
                              if (
                                !(e.target as HTMLElement).closest(
                                  ".timeline-element",
                                )
                              ) {
                                clearSelectedElements();
                              }
                            }}
                          >
                            <TimelineTrackContent
                              track={track}
                              zoomLevel={zoomLevel}
                              onSnapPointChange={handleSnapPointChange}
                              rulerScrollRef={rulerScrollRef}
                              tracksScrollRef={tracksScrollRef}
                            />
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="z-200">
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTrackMute(track.id);
                            }}
                          >
                            {track.muted ? "Unmute Track" : "Mute Track"}
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
  return (
    <>
      {track.type === "media" && (
        <Video className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
      {track.type === "text" && (
        <TypeIcon className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
      {track.type === "audio" && (
        <Music className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
    </>
  );
}
