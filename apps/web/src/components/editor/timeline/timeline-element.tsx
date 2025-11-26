"use client";

import {
  Scissors,
  Trash2,
  Copy,
  Search,
  RefreshCw,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "../audio-waveform";
import { TimelineElementProps } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { getTrackElementClasses, getTrackHeight } from "@/lib/timeline";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
}: TimelineElementProps) {
  const { mediaFiles } = useMediaStore();
  const {
    dragState,
    copySelected,
    selectedElements,
    deleteSelected,
    splitSelected,
    toggleSelectedHidden,
    toggleSelectedMuted,
    duplicateElement,
    revealElementInMedia,
    replaceElementWithFile,
    getContextMenuState,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const mediaItem =
    element.type === "media"
      ? mediaFiles.find((file) => file.id === element.mediaId)
      : null;
  const hasAudio = mediaItem?.type === "audio" || mediaItem?.type === "video";

  const { resizing, handleResizeStart, handleResizeMove, handleResizeEnd } =
    useTimelineElementResize({
      element,
      track,
      zoomLevel,
    });

  const {
    isMultipleSelected,
    isCurrentElementSelected,
    hasAudioElements,
    canSplitSelected,
  } = getContextMenuState(track.id, element.id);

  const effectiveDuration =
    element.duration - element.trimStart - element.trimEnd;
  const elementWidth = Math.max(
    TIMELINE_CONSTANTS.ELEMENT_MIN_WIDTH,
    effectiveDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
  );

  const isBeingDragged = dragState.elementId === element.id;
  const elementStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : element.startTime;

  const elementLeft = elementStartTime * 50 * zoomLevel;

  const handleElementSplitContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    splitSelected(
      currentTime,
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id,
    );
  };

  const handleElementDuplicateContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateElement(track.id, element.id);
  };

  const handleElementCopyContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    copySelected();
  };

  const handleElementDeleteContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSelected(
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id,
    );
  };

  const handleToggleElementContext = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (hasAudio && element.type === "media") {
      toggleSelectedMuted(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id,
      );
    } else {
      toggleSelectedHidden(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id,
      );
    }
  };

  const handleReplaceClip = (e: React.MouseEvent) => {
    e.stopPropagation();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*,image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await replaceElementWithFile(track.id, element.id, file);
      }
    };
    input.click();
  };

  const handleRevealInMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    revealElementInMedia(element.id);
  };

  const renderElementContent = () => {
    if (element.type === "text") {
      return (
        <div className="flex h-full w-full items-center justify-start pl-2">
          <span className="truncate text-xs text-white">{element.content}</span>
        </div>
      );
    }

    const mediaItem = mediaFiles.find((file) => file.id === element.mediaId);
    if (!mediaItem) {
      return (
        <span className="text-foreground/80 truncate text-xs">
          {element.name}
        </span>
      );
    }

    if (
      mediaItem.type === "image" ||
      (mediaItem.type === "video" && mediaItem.thumbnailUrl)
    ) {
      const trackHeight = getTrackHeight({ type: track.type });
      const tileWidth = trackHeight * (16 / 9);

      const imageUrl =
        mediaItem.type === "image" ? mediaItem.url : mediaItem.thumbnailUrl;

      return (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={`relative h-full w-full ${
              isSelected ? "bg-primary" : "bg-transparent"
            }`}
          >
            <div
              className={`absolute bottom-[0.25rem] left-0 right-0 top-[0.25rem]`}
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${trackHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`Tiled ${mediaItem.type === "image" ? "background" : "thumbnail"} of ${mediaItem.name}`}
            />
          </div>
        </div>
      );
    }

    if (mediaItem.type === "audio") {
      return (
        <div className="flex h-full w-full items-center gap-2">
          <div className="min-w-0 flex-1">
            <AudioWaveform
              audioUrl={mediaItem.url || ""}
              height={24}
              className="w-full"
            />
          </div>
        </div>
      );
    }

    return (
      <span className="text-foreground/80 truncate text-xs">
        {element.name}
      </span>
    );
  };

  const handleElementMouseDown = (e: React.MouseEvent) => {
    if (onElementMouseDown) {
      onElementMouseDown(e, element);
    }
  };

  const isMuted = element.type === "media" && element.muted;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`timeline-element absolute top-0 h-full select-none ${
            isBeingDragged ? "z-50" : "z-10"
          }`}
          style={{
            left: `${elementLeft}px`,
            width: `${elementWidth}px`,
          }}
          data-element-id={element.id}
          data-track-id={track.id}
          onMouseMove={resizing ? handleResizeMove : undefined}
          onMouseUp={resizing ? handleResizeEnd : undefined}
          onMouseLeave={resizing ? handleResizeEnd : undefined}
        >
          <div
            className={`relative h-full cursor-pointer overflow-hidden rounded-[0.5rem] ${getTrackElementClasses(
              {
                type: track.type,
              },
            )} ${isSelected ? "" : ""} ${
              isBeingDragged ? "z-50" : "z-10"
            } ${element.hidden ? "opacity-50" : ""}`}
            onClick={(e) => onElementClick && onElementClick(e, element)}
            onMouseDown={handleElementMouseDown}
            onContextMenu={(e) =>
              onElementMouseDown && onElementMouseDown(e, element)
            }
          >
            <div className="absolute inset-0 flex h-full items-center">
              {renderElementContent()}
            </div>

            {(hasAudio ? isMuted : element.hidden) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                {hasAudio ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <EyeOff className="h-6 w-6 text-white" />
                )}
              </div>
            )}

            {isSelected && (
              <>
                <div
                  className="bg-primary absolute bottom-0 left-0 top-0 z-50 flex w-[0.6rem] cursor-w-resize items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "left")}
                >
                  <div className="bg-foreground/75 h-[1.5rem] w-[0.2rem] rounded-full" />
                </div>
                <div
                  className="bg-primary absolute bottom-0 right-0 top-0 z-50 flex w-[0.6rem] cursor-e-resize items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "right")}
                >
                  <div className="bg-foreground/75 h-[1.5rem] w-[0.2rem] rounded-full" />
                </div>
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-200">
        {(!isMultipleSelected ||
          (isMultipleSelected &&
            isCurrentElementSelected &&
            canSplitSelected)) && (
          <ContextMenuItem onClick={handleElementSplitContext}>
            <Scissors className="mr-2 h-4 w-4" />
            {isMultipleSelected && isCurrentElementSelected
              ? `Split ${selectedElements.length} elements at playhead`
              : "Split at playhead"}
          </ContextMenuItem>
        )}

        <ContextMenuItem onClick={handleElementCopyContext}>
          <Copy className="mr-2 h-4 w-4" />
          {isMultipleSelected && isCurrentElementSelected
            ? `Copy ${selectedElements.length} elements`
            : "Copy element"}
        </ContextMenuItem>

        <ContextMenuItem onClick={handleToggleElementContext}>
          {isMultipleSelected && isCurrentElementSelected ? (
            hasAudioElements ? (
              <VolumeX className="mr-2 h-4 w-4" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4" />
            )
          ) : hasAudio ? (
            isMuted ? (
              <Volume2 className="mr-2 h-4 w-4" />
            ) : (
              <VolumeX className="mr-2 h-4 w-4" />
            )
          ) : element.hidden ? (
            <Eye className="mr-2 h-4 w-4" />
          ) : (
            <EyeOff className="mr-2 h-4 w-4" />
          )}
          <span>
            {isMultipleSelected && isCurrentElementSelected
              ? hasAudioElements
                ? `Toggle mute ${selectedElements.length} elements`
                : `Toggle visibility ${selectedElements.length} elements`
              : hasAudio
                ? isMuted
                  ? "Unmute"
                  : "Mute"
                : element.hidden
                  ? "Show"
                  : "Hide"}{" "}
            {!isMultipleSelected && (element.type === "text" ? "text" : "clip")}
          </span>
        </ContextMenuItem>

        {!isMultipleSelected && (
          <ContextMenuItem onClick={handleElementDuplicateContext}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate {element.type === "text" ? "text" : "clip"}
          </ContextMenuItem>
        )}

        {!isMultipleSelected && element.type === "media" && (
          <>
            <ContextMenuItem onClick={handleRevealInMedia}>
              <Search className="mr-2 h-4 w-4" />
              Reveal in media
            </ContextMenuItem>
            <ContextMenuItem onClick={handleReplaceClip}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Replace clip
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={handleElementDeleteContext}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isMultipleSelected && isCurrentElementSelected
            ? `Delete ${selectedElements.length} elements`
            : `Delete ${element.type === "text" ? "text" : "clip"}`}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
