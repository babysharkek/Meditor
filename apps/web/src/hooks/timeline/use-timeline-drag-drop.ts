import { useState, useRef, useCallback } from "react";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { processMediaFiles } from "@/lib/media-processing-utils";
import { toast } from "sonner";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { getMainTrack, canElementGoOnTrack } from "@/lib/timeline/track-utils";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import {
  useTimelineSnapping,
  SnapPoint,
} from "@/hooks/timeline/use-timeline-snapping";
import type { DragData, TimelineTrack, TrackType } from "@/types/timeline";

interface UseTimelineDragDropProps {
  track?: TimelineTrack;
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useTimelineDragDrop({
  track,
  zoomLevel,
}: UseTimelineDragDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [wouldOverlap, setWouldOverlap] = useState(false);
  const [dropPositionIndicator, setDropPositionIndicator] = useState<
    number | null
  >(null);

  const { mediaFiles, addMediaFile } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { currentTime } = usePlaybackStore();
  const {
    tracks,
    addElementToTrack,
    insertTrackAt,
    addTrack,
    snappingEnabled,
  } = useTimelineStore();

  const dragCounterRef = useRef(0);

  const { snapElementEdge } = useTimelineSnapping({
    snapThreshold: 10,
    enableElementSnapping: snappingEnabled,
    enablePlayheadSnapping: snappingEnabled,
  });

  const getDropSnappedTime = useCallback(
    (dropTime: number, elementDuration: number, excludeElementId?: string) => {
      const projectFps = activeProject?.fps || DEFAULT_FPS;
      let finalTime = snapTimeToFrame({ time: dropTime, fps: projectFps });

      if (snappingEnabled) {
        const startSnapResult = snapElementEdge(
          dropTime,
          elementDuration,
          tracks,
          currentTime,
          zoomLevel,
          excludeElementId,
          true,
        );

        const endSnapResult = snapElementEdge(
          dropTime,
          elementDuration,
          tracks,
          currentTime,
          zoomLevel,
          excludeElementId,
          false,
        );

        let bestSnapResult = startSnapResult;
        if (
          endSnapResult.snapPoint &&
          (!startSnapResult.snapPoint ||
            endSnapResult.snapDistance < startSnapResult.snapDistance)
        ) {
          bestSnapResult = endSnapResult;
        }

        if (bestSnapResult.snapPoint) {
          finalTime = bestSnapResult.snappedTime;
        }
      }

      return finalTime;
    },
    [
      activeProject?.fps,
      snappingEnabled,
      snapElementEdge,
      tracks,
      currentTime,
      zoomLevel,
    ],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const hasMediaItem = e.dataTransfer.types.includes(
        "application/x-media-item",
      );
      const hasFiles = e.dataTransfer.types.includes("Files");

      if (!hasMediaItem && !hasFiles) return;

      dragCounterRef.current++;
      if (!isDragOver) setIsDragOver(true);
    },
    [isDragOver],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const hasMediaItem = e.dataTransfer.types.includes(
        "application/x-media-item",
      );
      if (!hasMediaItem) return;

      if (track) {
        const trackContainer =
          (e.currentTarget as HTMLElement).closest(
            ".track-elements-container",
          ) ||
          (e.currentTarget as HTMLElement).querySelector(
            ".track-elements-container",
          ) ||
          (e.currentTarget as HTMLElement);

        const rect = trackContainer.getBoundingClientRect();
        const mouseX = Math.max(0, e.clientX - rect.left);
        const dropTime =
          mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

        let overlap = false;
        try {
          const mediaItemData = e.dataTransfer.getData(
            "application/x-media-item",
          );
          if (mediaItemData) {
            const dragData: DragData = JSON.parse(mediaItemData);
            const duration =
              dragData.type === "text"
                ? 5
                : mediaFiles.find((m) => m.id === dragData.id)?.duration || 5;
            const snappedTime = getDropSnappedTime(dropTime, duration);
            const endTime = snappedTime + duration;

            overlap = track.elements.some((el) => {
              const elEnd =
                el.startTime + (el.duration - el.trimStart - el.trimEnd);
              return snappedTime < elEnd && endTime > el.startTime;
            });
          }
        } catch (f) {}

        setWouldOverlap(overlap);
        setDropPositionIndicator(getDropSnappedTime(dropTime, 5));
        e.dataTransfer.dropEffect = overlap ? "none" : "copy";
      }
    },
    [track, zoomLevel, mediaFiles, getDropSnappedTime],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
      setWouldOverlap(false);
      setDropPositionIndicator(null);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setWouldOverlap(false);
      setDropPositionIndicator(null);
      dragCounterRef.current = 0;

      const hasMediaItem = e.dataTransfer.types.includes(
        "application/x-media-item",
      );
      const hasFiles = e.dataTransfer.files?.length > 0;

      if (!hasMediaItem && !hasFiles) return;

      const trackContainer =
        (e.currentTarget as HTMLElement).closest(".track-elements-container") ||
        (e.currentTarget as HTMLElement).querySelector(
          ".track-elements-container",
        ) ||
        (e.currentTarget as HTMLElement);
      if (!trackContainer) return;

      const rect = trackContainer.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      const mouseY = e.clientY - rect.top;
      const dropTime =
        mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

      const projectFps = activeProject?.fps || DEFAULT_FPS;
      const snappedTime = snapTimeToFrame({ time: dropTime, fps: projectFps });

      let dropPos: "above" | "on" | "below" = "on";
      if (track) {
        if (mouseY < 20) dropPos = "above";
        else if (mouseY > 40) dropPos = "below";
      }

      try {
        if (hasMediaItem) {
          const mediaItemData = e.dataTransfer.getData(
            "application/x-media-item",
          );
          if (!mediaItemData) return;
          const dragData: DragData = JSON.parse(mediaItemData);

          if (dragData.type === "text") {
            let targetTrackId = track?.id;
            let targetTrack = track;

            if (!track || track.type !== "text" || dropPos !== "on") {
              const mainTrack = getMainTrack({ tracks });
              let insertIndex = 0;
              if (track) {
                const currentIdx = tracks.findIndex((t) => t.id === track.id);
                insertIndex = dropPos === "above" ? currentIdx : currentIdx + 1;
              } else if (mainTrack) {
                insertIndex = tracks.findIndex((t) => t.id === mainTrack.id);
              }
              targetTrackId = insertTrackAt("text", insertIndex);
              targetTrack = useTimelineStore
                .getState()
                .tracks.find((t) => t.id === targetTrackId);
            }

            if (!targetTrack || !targetTrackId) return;
            const duration = 5;
            const finalStart = getDropSnappedTime(dropTime, duration);
            const finalEnd = finalStart + duration;

            if (
              targetTrack.elements.some(
                (el) =>
                  finalStart <
                    el.startTime + el.duration - el.trimStart - el.trimEnd &&
                  finalEnd > el.startTime,
              )
            ) {
              toast.error("Cannot place element here - overlap detected");
              return;
            }

            addElementToTrack(targetTrackId, {
              ...DEFAULT_TEXT_ELEMENT,
              name: dragData.name || DEFAULT_TEXT_ELEMENT.name,
              content: dragData.content || DEFAULT_TEXT_ELEMENT.content,
              startTime: finalStart,
            });
          } else {
            const mediaItem = mediaFiles.find((m) => m.id === dragData.id);
            if (!mediaItem) return;

            let targetTrackId = track?.id;
            const isVideoOrImage =
              dragData.type === "video" || dragData.type === "image";
            const isAudio = dragData.type === "audio";
            const isCompatible = track
              ? isVideoOrImage
                ? canElementGoOnTrack({
                    elementType: "media",
                    trackType: track.type,
                  })
                : isAudio
                  ? canElementGoOnTrack({
                      elementType: "media",
                      trackType: track.type,
                    })
                  : false
              : false;

            let targetTrack = track;

            if (!track || !isCompatible || dropPos !== "on") {
              if (isVideoOrImage) {
                const mainTrack = getMainTrack({ tracks });
                if (!mainTrack) {
                  targetTrackId = addTrack("media");
                } else if (
                  mainTrack.elements.length === 0 &&
                  (!track || dropPos === "on")
                ) {
                  targetTrackId = mainTrack.id;
                } else {
                  let idx = track
                    ? tracks.findIndex((t) => t.id === track.id)
                    : 0;
                  if (track) idx = dropPos === "above" ? idx : idx + 1;
                  else idx = tracks.findIndex((t) => t.id === mainTrack.id);
                  targetTrackId = insertTrackAt("media", idx);
                }
              } else if (isAudio) {
                let idx = track
                  ? tracks.findIndex((t) => t.id === track.id)
                  : tracks.length;
                if (track) idx = dropPos === "above" ? idx : idx + 1;
                targetTrackId = insertTrackAt("audio", idx);
              }
              targetTrack = useTimelineStore
                .getState()
                .tracks.find((t) => t.id === targetTrackId);
            }

            if (!targetTrack || !targetTrackId) return;
            const duration = mediaItem.duration || 5;
            const finalStart = getDropSnappedTime(dropTime, duration);
            const finalEnd = finalStart + duration;

            if (
              targetTrack.elements.some(
                (el) =>
                  finalStart <
                    el.startTime + el.duration - el.trimStart - el.trimEnd &&
                  finalEnd > el.startTime,
              )
            ) {
              toast.error("Cannot place element here - overlap detected");
              return;
            }

            addElementToTrack(targetTrackId, {
              type: "media",
              mediaId: mediaItem.id,
              name: mediaItem.name,
              duration,
              startTime: finalStart,
              trimStart: 0,
              trimEnd: 0,
            });
          }
        } else if (hasFiles) {
          if (!activeProject) return;
          const processedItems = await processMediaFiles({
            files: Array.from(e.dataTransfer.files),
          });
          for (const item of processedItems) {
            await addMediaFile(activeProject.id, item);
            const added = useMediaStore
              .getState()
              .mediaFiles.find(
                (m) => m.name === item.name && m.url === item.url,
              );
            if (added) {
              const type: TrackType =
                added.type === "audio" ? "audio" : "media";
              const tid = insertTrackAt(type, 0);
              addElementToTrack(tid, {
                type: "media",
                mediaId: added.id,
                name: added.name,
                duration: added.duration || 5,
                startTime: currentTime,
                trimStart: 0,
                trimEnd: 0,
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to process drop");
      }
    },
    [
      track,
      zoomLevel,
      activeProject,
      tracks,
      mediaFiles,
      currentTime,
      getDropSnappedTime,
      addElementToTrack,
      insertTrackAt,
      addTrack,
      addMediaFile,
    ],
  );

  return {
    isDragOver,
    wouldOverlap,
    dropPositionIndicator,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
