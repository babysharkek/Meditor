import { useState, useRef, useCallback } from "react";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { processMediaFiles } from "@/lib/media-processing-utils";
import { toast } from "sonner";
import type { DragData } from "@/types/timeline";

interface UseTimelineDragDropProps {
  addElementToNewTrack: (data: any) => void;
}

export function useTimelineDragDrop({ addElementToNewTrack }: UseTimelineDragDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { mediaFiles, addMediaFile } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { currentTime } = usePlaybackStore();
  const dragCounterRef = useRef(0);

  const handleInternalMediaDrop = useCallback(async (dragData: DragData) => {
    if (dragData.type === "text") {
      addElementToNewTrack(dragData);
    } else {
      const mediaItem = mediaFiles.find((item: any) => item.id === dragData.id);
      if (!mediaItem) {
        toast.error("Media item not found");
        return;
      }

      addElementToNewTrack(mediaItem);
    }
  }, [mediaFiles, addElementToNewTrack]);

  const handleExternalFileDrop = useCallback(async (files: FileList) => {
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    try {
      const processedItems = await processMediaFiles({
        files,
      });

      for (const processedItem of processedItems) {
        await addMediaFile(activeProject.id, processedItem);

        const addedItem = mediaFiles.find(
          (item) =>
            item.name === processedItem.name && item.url === processedItem.url,
        );

        if (addedItem) {
          const trackType: "audio" | "media" =
            addedItem.type === "audio" ? "audio" : "media";
          const targetTrackId = useTimelineStore
            .getState()
            .insertTrackAt(trackType, 0);

          useTimelineStore.getState().addElementToTrack(targetTrackId, {
            type: "media",
            mediaId: addedItem.id,
            name: addedItem.name,
            duration: addedItem.duration || 5,
            startTime: currentTime,
            trimStart: 0,
            trimEnd: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error processing external files:", error);
      toast.error("Failed to process dropped files");
    }
  }, [activeProject, mediaFiles, addMediaFile, currentTime]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }

    dragCounterRef.current++;
    if (!isDragOver) setIsDragOver(true);
  }, [isDragOver]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.types.includes("application/x-timeline-element")) {
      return;
    }

    try {
      const itemData = e.dataTransfer.getData("application/x-media-item");
      if (itemData) {
        const dragData: DragData = JSON.parse(itemData);
        await handleInternalMediaDrop(dragData);
        return;
      }

      if (e.dataTransfer.files?.length > 0) {
        await handleExternalFileDrop(e.dataTransfer.files);
      }
    } catch (error) {
      console.error("Error parsing dropped item data:", error);
      toast.error("Failed to add item to timeline");
    }
  }, [handleInternalMediaDrop, handleExternalFileDrop]);

  return {
    isDragOver,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}


