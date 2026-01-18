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
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import AudioWaveform from "./audio-waveform";
import { useTimelineElementResize } from "@/hooks/timeline/element/use-element-resize";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
  getTrackClasses,
  getTrackHeight,
  canElementHaveAudio,
  canElementBeHidden,
  hasMediaId,
} from "@/lib/timeline";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import type {
  TimelineElement as TimelineElementType,
  TimelineTrack,
  ElementDragState,
} from "@/types/timeline";
import { MediaAsset } from "@/types/assets";
import { mediaSupportsAudio } from "@/lib/media-utils";
import { type TAction, invokeAction } from "@/lib/actions";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";

interface TimelineElementProps {
  element: TimelineElementType;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onElementMouseDown: (
    e: React.MouseEvent,
    element: TimelineElementType,
  ) => void;
  onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
  dragState: ElementDragState;
}

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
  dragState,
}: TimelineElementProps) {
  const editor = useEditor();
  const lastDragStateRef = useRef(false);
  const { selectedElements } = useElementSelection();
  const { requestRevealMedia } = useAssetsPanelStore();

  const mediaAssets = editor.media.getAssets();
  let mediaAsset: MediaAsset | null = null;

  if (hasMediaId(element)) {
    mediaAsset =
      mediaAssets.find((asset) => asset.id === element.mediaId) ?? null;
  }

  const hasAudio = mediaSupportsAudio({ media: mediaAsset });

  const {
    handleResizeStart,
    isResizing,
    currentStartTime,
    currentDuration,
  } = useTimelineElementResize({
    element,
    track,
    zoomLevel,
  });

  const isCurrentElementSelected = selectedElements.some(
    (selected) =>
      selected.elementId === element.id && selected.trackId === track.id,
  );

  const isBeingDragged = dragState.elementId === element.id;
  const dragOffsetY =
    isBeingDragged && dragState.isDragging
      ? dragState.currentMouseY - dragState.startMouseY
      : 0;
  const elementStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : element.startTime;
  const displayedStartTime = isResizing ? currentStartTime : elementStartTime;
  const displayedDuration = isResizing ? currentDuration : element.duration;
  const elementWidth =
    displayedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const elementLeft = displayedStartTime * 50 * zoomLevel;

  const handleAction = ({
    action,
    event,
  }: {
    action: TAction;
    event: React.MouseEvent;
  }) => {
    event.stopPropagation();
    invokeAction(action);
  };

  const handleRevealInMedia = ({ event }: { event: React.MouseEvent }) => {
    event.stopPropagation();
    if (hasMediaId(element)) {
      requestRevealMedia(element.mediaId);
    }
  };

  const isMuted = canElementHaveAudio(element) && element.muted === true;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute top-0 h-full select-none ${isBeingDragged ? "z-30" : "z-10"
            }`}
          style={{
            left: `${elementLeft}px`,
            width: `${elementWidth}px`,
            transform:
              isBeingDragged && dragState.isDragging
                ? `translate3d(0, ${dragOffsetY}px, 0)`
                : undefined,
          }}
          data-element-id={element.id}
          data-track-id={track.id}
        >
          <ElementInner
            element={element}
            track={track}
            isSelected={isSelected}
            isBeingDragged={isBeingDragged}
            hasAudio={hasAudio}
            isMuted={isMuted}
            mediaAssets={mediaAssets}
            onElementClick={onElementClick}
            onElementMouseDown={onElementMouseDown}
            handleResizeStart={handleResizeStart}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-200">
        <ContextMenuItem
          onClick={(event) => handleAction({ action: "split-selected", event })}
        >
          <Scissors className="mr-2 size-4" />
          {selectedElements.length > 1 && isCurrentElementSelected
            ? `Split ${selectedElements.length} elements at playhead`
            : "Split at playhead"}
        </ContextMenuItem>
        <CopyMenuItem
          isMultipleSelected={selectedElements.length > 1}
          isCurrentElementSelected={isCurrentElementSelected}
          selectedCount={selectedElements.length}
          onClick={(event) => handleAction({ action: "copy-selected", event })}
        />
        {canElementHaveAudio(element) && hasAudio && (
          <MuteMenuItem
            element={element}
            isMultipleSelected={selectedElements.length > 1}
            isCurrentElementSelected={isCurrentElementSelected}
            isMuted={isMuted}
            selectedCount={selectedElements.length}
            onClick={(event) =>
              handleAction({ action: "toggle-elements-muted-selected", event })
            }
          />
        )}
        {canElementBeHidden(element) && (
          <VisibilityMenuItem
            element={element}
            isMultipleSelected={selectedElements.length > 1}
            isCurrentElementSelected={isCurrentElementSelected}
            selectedCount={selectedElements.length}
            onClick={(event) =>
              handleAction({
                action: "toggle-elements-visibility-selected",
                event,
              })
            }
          />
        )}
        {selectedElements.length === 1 && (
          <ContextMenuItem
            onClick={(event) =>
              handleAction({ action: "duplicate-selected", event })
            }
          >
            <Copy className="mr-2 size-4" />
            Duplicate {element.type === "text" ? "text" : "clip"}
          </ContextMenuItem>
        )}
        <ContextMenuItem disabled>
          <ArrowUpDown className="mr-2 size-4" />
          Move to track (Coming soon)
        </ContextMenuItem>
        {selectedElements.length === 1 && hasMediaId(element) && (
          <>
            <ContextMenuItem
              onClick={(event) => handleRevealInMedia({ event })}
            >
              <Search className="mr-2 size-4" />
              Reveal in media
            </ContextMenuItem>
            <ContextMenuItem disabled>
              <RefreshCw className="mr-2 size-4" />
              Replace clip (Coming soon)
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <DeleteMenuItem
          isMultipleSelected={selectedElements.length > 1}
          isCurrentElementSelected={isCurrentElementSelected}
          elementType={element.type}
          selectedCount={selectedElements.length}
          onClick={(event) =>
            handleAction({ action: "delete-selected", event })
          }
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ElementInner({
  element,
  track,
  isSelected,
  isBeingDragged,
  hasAudio,
  isMuted,
  mediaAssets,
  onElementClick,
  onElementMouseDown,
  handleResizeStart,
}: {
  element: TimelineElementType;
  track: TimelineTrack;
  isSelected: boolean;
  isBeingDragged: boolean;
  hasAudio: boolean;
  isMuted: boolean;
  mediaAssets: MediaAsset[];
  onElementClick: (e: React.MouseEvent, element: TimelineElementType) => void;
  onElementMouseDown: (
    e: React.MouseEvent,
    element: TimelineElementType,
  ) => void;
  handleResizeStart: (params: {
    e: React.MouseEvent;
    elementId: string;
    side: "left" | "right";
  }) => void;
}) {
  return (
    <div
      className={`relative h-full cursor-pointer overflow-hidden rounded-[0.5rem] ${getTrackClasses(
        {
          type: track.type,
        },
      )} ${isBeingDragged ? "z-30" : "z-10"} ${canElementBeHidden(element) && element.hidden ? "opacity-50" : ""}`}
      onClick={(e) => onElementClick(e, element)}
      onMouseDown={(e) => onElementMouseDown(e, element)}
      onContextMenu={(e) => onElementMouseDown(e, element)}
    >
      <div className="absolute inset-0 flex h-full items-center">
        <ElementContent
          element={element}
          track={track}
          isSelected={isSelected}
          mediaAssets={mediaAssets}
        />
      </div>

      {(hasAudio ? isMuted : canElementBeHidden(element) && element.hidden) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          {hasAudio ? (
            <VolumeX className="size-6 text-white" />
          ) : (
            <EyeOff className="size-6 text-white" />
          )}
        </div>
      )}

      {isSelected && (
        <>
          <div
            className="bg-primary absolute bottom-0 left-0 top-0 z-50 flex w-[0.6rem] cursor-w-resize items-center justify-center"
            onMouseDown={(e) =>
              handleResizeStart({ e, elementId: element.id, side: "left" })
            }
          >
            <div className="bg-foreground/75 h-[1.5rem] w-[0.2rem] rounded-full" />
          </div>
          <div
            className="bg-primary absolute bottom-0 right-0 top-0 z-50 flex w-[0.6rem] cursor-e-resize items-center justify-center"
            onMouseDown={(e) =>
              handleResizeStart({ e, elementId: element.id, side: "right" })
            }
          >
            <div className="bg-foreground/75 h-[1.5rem] w-[0.2rem] rounded-full" />
          </div>
        </>
      )}
    </div>
  );
}

function ElementContent({
  element,
  track,
  isSelected,
  mediaAssets,
}: {
  element: TimelineElementType;
  track: TimelineTrack;
  isSelected: boolean;
  mediaAssets: MediaAsset[];
}) {
  if (element.type === "text") {
    return (
      <div className="flex size-full items-center justify-start pl-2">
        <span className="truncate text-xs text-white">{element.content}</span>
      </div>
    );
  }

  if (element.type === "sticker") {
    return (
      <div className="flex size-full items-center gap-2 pl-2">
        <img
          src={`https://api.iconify.design/${element.iconName}.svg?width=20&height=20`}
          alt={element.name}
          className="size-5 shrink-0"
        />
        <span className="truncate text-xs text-white">{element.name}</span>
      </div>
    );
  }

  if (element.type === "audio") {
    const audioBuffer =
      element.sourceType === "library" ? element.buffer : undefined;

    const audioUrl =
      element.sourceType === "upload"
        ? mediaAssets.find((asset) => asset.id === element.mediaId)?.url
        : undefined;

    if (audioBuffer || audioUrl) {
      return (
        <div className="flex size-full items-center gap-2">
          <div className="min-w-0 flex-1">
            <AudioWaveform
              audioBuffer={audioBuffer}
              audioUrl={audioUrl}
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
  }

  const mediaAsset = mediaAssets.find((asset) => asset.id === element.mediaId);
  if (!mediaAsset) {
    return (
      <span className="text-foreground/80 truncate text-xs">
        {element.name}
      </span>
    );
  }

  if (
    mediaAsset.type === "image" ||
    (mediaAsset.type === "video" && mediaAsset.thumbnailUrl)
  ) {
    const trackHeight = getTrackHeight({ type: track.type });
    const tileWidth = trackHeight * (16 / 9);
    const imageUrl =
      mediaAsset.type === "image" ? mediaAsset.url : mediaAsset.thumbnailUrl;

    return (
      <div className="flex size-full items-center justify-center">
        <div
          className={`relative size-full ${isSelected ? "bg-primary" : "bg-transparent"}`}
        >
          <div
            className="absolute left-0 right-0"
            style={{
              backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
              backgroundRepeat: "repeat-x",
              backgroundSize: `${tileWidth}px ${trackHeight}px`,
              backgroundPosition: "left center",
              pointerEvents: "none",
              top: isSelected ? "0.25rem" : "0rem",
              bottom: isSelected ? "0.25rem" : "0rem",
            }}
            aria-label={`Tiled ${mediaAsset.type === "image" ? "background" : "thumbnail"} of ${mediaAsset.name}`}
          />
        </div>
      </div>
    );
  }

  return (
    <span className="text-foreground/80 truncate text-xs">{element.name}</span>
  );
}

function CopyMenuItem({
  isMultipleSelected,
  isCurrentElementSelected,
  selectedCount,
  onClick,
}: {
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  selectedCount: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <ContextMenuItem onClick={onClick}>
      <Copy className="mr-2 size-4" />
      {isMultipleSelected && isCurrentElementSelected
        ? `Copy ${selectedCount} elements`
        : "Copy element"}
    </ContextMenuItem>
  );
}

function MuteMenuItem({
  element,
  isMultipleSelected,
  isCurrentElementSelected,
  isMuted,
  selectedCount,
  onClick,
}: {
  element: TimelineElementType;
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  isMuted: boolean;
  selectedCount: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  const getIcon = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return <VolumeX className="mr-2 size-4" />;
    }
    return isMuted ? (
      <Volume2 className="mr-2 size-4" />
    ) : (
      <VolumeX className="mr-2 size-4" />
    );
  };

  const getLabel = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return `Toggle mute ${selectedCount} elements`;
    }
    const suffix = element.type === "text" ? "text" : "clip";
    return isMuted ? `Unmute ${suffix}` : `Mute ${suffix}`;
  };

  return (
    <ContextMenuItem onClick={onClick}>
      {getIcon()}
      <span>{getLabel()}</span>
    </ContextMenuItem>
  );
}

function VisibilityMenuItem({
  element,
  isMultipleSelected,
  isCurrentElementSelected,
  selectedCount,
  onClick,
}: {
  element: TimelineElementType;
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  selectedCount: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  const isHidden = canElementBeHidden(element) && element.hidden;

  const getIcon = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return <EyeOff className="mr-2 size-4" />;
    }
    return isHidden ? (
      <Eye className="mr-2 size-4" />
    ) : (
      <EyeOff className="mr-2 size-4" />
    );
  };

  const getLabel = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return `Toggle visibility ${selectedCount} elements`;
    }
    const suffix = element.type === "text" ? "text" : "clip";
    return isHidden ? `Show ${suffix}` : `Hide ${suffix}`;
  };

  return (
    <ContextMenuItem onClick={onClick}>
      {getIcon()}
      <span>{getLabel()}</span>
    </ContextMenuItem>
  );
}

function DeleteMenuItem({
  isMultipleSelected,
  isCurrentElementSelected,
  elementType,
  selectedCount,
  onClick,
}: {
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  elementType: TimelineElementType["type"];
  selectedCount: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <ContextMenuItem
      onClick={onClick}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 size-4" />
      {isMultipleSelected && isCurrentElementSelected
        ? `Delete ${selectedCount} elements`
        : `Delete ${elementType === "text" ? "text" : "clip"}`}
    </ContextMenuItem>
  );
}
