import { useState, useCallback, type RefObject } from "react";
import { useEditor } from "@/hooks/use-editor";
import { processMediaFiles } from "@/lib/media-processing-utils";
import { toast } from "sonner";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { buildTextElement } from "@/lib/timeline/element-utils";
import { computeDropTarget } from "@/lib/timeline/drop-utils";
import { getAssetDragData, hasAssetDragData } from "@/lib/asset-drag";
import type { TrackType, DropTarget } from "@/types/timeline";
import type { MediaAssetDragData } from "@/types/assets";

type DragElementType = "video" | "image" | "audio" | "text";

interface UseTimelineDragDropProps {
  containerRef: RefObject<HTMLDivElement | null>;
  zoomLevel: number;
  isSnappingEnabled?: boolean;
}

export function useTimelineDragDrop({
  containerRef,
  zoomLevel,
  isSnappingEnabled = true,
}: UseTimelineDragDropProps) {
  const editor = useEditor();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [dragElementType, setDragElementType] =
    useState<DragElementType | null>(null);

  const tracks = editor.timeline.sortedTracks;
  const currentTime = editor.playback.currentTime;
  const mediaFiles = editor.media.mediaFiles;
  const activeProject = editor.project.activeProject;

  const getSnappedTime = useCallback(
    ({ time }: { time: number }) => {
      const projectFps = activeProject?.fps ?? DEFAULT_FPS;
      return snapTimeToFrame({ time, fps: projectFps });
    },
    [activeProject?.fps],
  );

  const getDragElementType = useCallback(
    ({
      dataTransfer,
    }: {
      dataTransfer: DataTransfer;
    }): DragElementType | null => {
      const dragData = getAssetDragData({ dataTransfer });
      if (!dragData) return null;

      if (dragData.type === "text") return "text";
      if (dragData.type === "media") {
        return dragData.mediaType as DragElementType;
      }
      return null;
    },
    [],
  );

  const getElementDuration = useCallback(
    ({
      elementType,
      mediaId,
    }: {
      elementType: DragElementType;
      mediaId?: string;
    }): number => {
      if (elementType === "text") {
        return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
      }
      if (mediaId) {
        const media = mediaFiles.find((m) => m.id === mediaId);
        return media?.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
      }
      return TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;
    },
    [mediaFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const hasAsset = hasAssetDragData({ dataTransfer: e.dataTransfer });
    const hasFiles = e.dataTransfer.types.includes("Files");
    if (!hasAsset && !hasFiles) return;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const hasFiles = e.dataTransfer.types.includes("Files");
      const isExternal =
        hasFiles && !hasAssetDragData({ dataTransfer: e.dataTransfer });

      let elementType = getDragElementType({ dataTransfer: e.dataTransfer });

      // external drops default to video until determined on drop
      if (!elementType && hasFiles) {
        elementType = "video";
      }

      if (!elementType) return;

      setDragElementType(elementType);

      const dragData = getAssetDragData({ dataTransfer: e.dataTransfer });
      const duration = getElementDuration({
        elementType,
        mediaId: dragData?.type === "media" ? dragData.id : undefined,
      });

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const target = computeDropTarget({
        elementType,
        mouseX,
        mouseY,
        tracks,
        playheadTime: currentTime,
        isExternalDrop: isExternal,
        elementDuration: duration,
        pixelsPerSecond: TIMELINE_CONSTANTS.PIXELS_PER_SECOND,
        zoomLevel,
      });

      target.xPosition = getSnappedTime({ time: target.xPosition });

      setDropTarget(target);
      e.dataTransfer.dropEffect = "copy";
    },
    [
      containerRef,
      tracks,
      currentTime,
      zoomLevel,
      getDragElementType,
      getElementDuration,
      getSnappedTime,
    ],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const { clientX, clientY } = e;
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setIsDragOver(false);
          setDropTarget(null);
          setDragElementType(null);
        }
      }
    },
    [containerRef],
  );

  const executeTextDrop = useCallback(
    ({
      target,
      dragData,
    }: {
      target: DropTarget;
      dragData: { name?: string; content?: string };
    }) => {
      let trackId: string;

      if (target.isNewTrack) {
        trackId = editor.timeline.addTrack({
          type: "text",
          index: target.trackIndex,
        });
      } else {
        const track = tracks[target.trackIndex];
        if (!track) return;
        trackId = track.id;
      }

      const element = buildTextElement({
        raw: {
          id: "",
          name: dragData.name ?? "",
          type: "text",
          content: dragData.content ?? "",
        },
        startTime: target.xPosition,
      });

      editor.timeline.addElementToTrack({ trackId, element });
    },
    [editor.timeline, tracks],
  );

  const executeMediaDrop = useCallback(
    ({
      target,
      dragData,
    }: {
      target: DropTarget;
      dragData: MediaAssetDragData;
    }) => {
      const mediaItem = mediaFiles.find((m) => m.id === dragData.id);
      if (!mediaItem) return;

      const trackType: TrackType =
        dragData.mediaType === "audio" ? "audio" : "media";
      let trackId: string;

      if (target.isNewTrack) {
        trackId = editor.timeline.addTrack({
          type: trackType,
          index: target.trackIndex,
        });
      } else {
        const track = tracks[target.trackIndex];
        if (!track) return;
        trackId = track.id;
      }

      const duration =
        mediaItem.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

      if (dragData.mediaType === "audio") {
        editor.timeline.addElementToTrack({
          trackId,
          element: {
            type: "audio",
            mediaId: mediaItem.id,
            name: mediaItem.name,
            duration,
            startTime: target.xPosition,
            trimStart: 0,
            trimEnd: 0,
            volume: 1,
            buffer: new AudioBuffer({ length: 1, sampleRate: 44100 }),
            muted: false,
          },
        });
      } else if (dragData.mediaType === "video") {
        editor.timeline.addElementToTrack({
          trackId,
          element: {
            type: "video",
            mediaId: mediaItem.id,
            name: mediaItem.name,
            duration,
            startTime: target.xPosition,
            trimStart: 0,
            trimEnd: 0,
          },
        });
      } else {
        editor.timeline.addElementToTrack({
          trackId,
          element: {
            type: "image",
            mediaId: mediaItem.id,
            name: mediaItem.name,
            duration,
            startTime: target.xPosition,
            trimStart: 0,
            trimEnd: 0,
          },
        });
      }
    },
    [editor.timeline, mediaFiles, tracks],
  );

  const executeFileDrop = useCallback(
    async ({ files }: { files: File[] }) => {
      if (!activeProject) return;

      const processedItems = await processMediaFiles({ files });

      for (const item of processedItems) {
        await editor.media.addMediaFile({
          projectId: activeProject.id,
          file: item,
        });

        const added = editor.media.mediaFiles.find(
          (m) => m.name === item.name && m.url === item.url,
        );

        if (added) {
          const trackType: TrackType =
            added.type === "audio" ? "audio" : "media";
          const trackId = editor.timeline.addTrack({
            type: trackType,
            index: 0,
          });

          const duration =
            added.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

          if (added.type === "audio") {
            editor.timeline.addElementToTrack({
              trackId,
              element: {
                type: "audio",
                mediaId: added.id,
                name: added.name,
                duration,
                startTime: currentTime,
                trimStart: 0,
                trimEnd: 0,
                volume: 1,
                buffer: new AudioBuffer({ length: 1, sampleRate: 44100 }),
                muted: false,
              },
            });
          } else if (added.type === "video") {
            editor.timeline.addElementToTrack({
              trackId,
              element: {
                type: "video",
                mediaId: added.id,
                name: added.name,
                duration,
                startTime: currentTime,
                trimStart: 0,
                trimEnd: 0,
              },
            });
          } else {
            editor.timeline.addElementToTrack({
              trackId,
              element: {
                type: "image",
                mediaId: added.id,
                name: added.name,
                duration,
                startTime: currentTime,
                trimStart: 0,
                trimEnd: 0,
              },
            });
          }
        }
      }
    },
    [activeProject, editor.media, editor.timeline, currentTime],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();

      const currentTarget = dropTarget;
      setIsDragOver(false);
      setDropTarget(null);
      setDragElementType(null);

      if (!currentTarget) return;

      const hasAsset = hasAssetDragData({ dataTransfer: e.dataTransfer });
      const hasFiles = e.dataTransfer.files?.length > 0;

      if (!hasAsset && !hasFiles) return;

      try {
        if (hasAsset) {
          const dragData = getAssetDragData({ dataTransfer: e.dataTransfer });
          if (!dragData) return;

          if (dragData.type === "text") {
            executeTextDrop({ target: currentTarget, dragData });
          } else {
            executeMediaDrop({ target: currentTarget, dragData });
          }
        } else if (hasFiles) {
          await executeFileDrop({ files: Array.from(e.dataTransfer.files) });
        }
      } catch (err) {
        console.error("Failed to process drop:", err);
        toast.error("Failed to process drop");
      }
    },
    [dropTarget, executeTextDrop, executeMediaDrop, executeFileDrop],
  );

  return {
    isDragOver,
    dropTarget,
    dragElementType,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
