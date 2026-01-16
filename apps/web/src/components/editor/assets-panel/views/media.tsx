"use client";

import { useState, useMemo } from "react";
import {
  ArrowDown01,
  CloudUpload,
  Grid2X2,
  Image,
  List,
  Loader2,
  Music,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useRevealItem } from "@/hooks/use-reveal-item";
import { processMediaAssets } from "@/lib/media-processing-utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { canElementGoOnTrack } from "@/lib/timeline/track-utils";
import { wouldElementOverlap } from "@/lib/timeline/element-utils";
import type { MediaAsset } from "@/types/assets";
import type { CreateTimelineElement, TrackType } from "@/types/timeline";
import { Button } from "@/components/ui/button";
import { MediaDragOverlay } from "@/components/editor/assets-panel/drag-overlay";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DraggableItem } from "@/components/ui/draggable-item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePanelStore } from "@/stores/panel-store";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

export function MediaView() {
  const editor = useEditor();
  const mediaFiles = editor.media.getAssets();
  const activeProject = editor.project.getActive();

  const { mediaViewMode, setMediaViewMode } = usePanelStore();
  const { highlightMediaId, clearHighlight } = useAssetsPanelStore();
  const { highlightedId, registerElement } = useRevealItem(
    highlightMediaId,
    clearHighlight,
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "type" | "duration" | "size">(
    "name",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const processFiles = async ({ files }: { files: FileList }) => {
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const processedAssets = await processMediaAssets({
        files,
        onProgress: (progress: { progress: number }) =>
          setProgress(progress.progress),
      });
      for (const asset of processedAssets) {
        await editor.media.addMediaAsset({
          projectId: activeProject.metadata.id,
          asset,
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const { isDragOver, dragProps, openFilePicker, fileInputProps } =
    useFileUpload({
      accept: "image/*,video/*,audio/*",
      multiple: true,
      onFilesSelected: (files) => processFiles({ files }),
    });

  const handleRemove = async ({
    event,
    id,
  }: {
    event: React.MouseEvent;
    id: string;
  }) => {
    event.stopPropagation();

    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    await editor.media.removeMediaAsset({
      projectId: activeProject.metadata.id,
      id,
    });
  };

  const addElementAtTime = ({
    asset,
    startTime,
  }: {
    asset: MediaAsset;
    startTime: number;
  }): boolean => {
    const element = createElementFromMedia({ asset, startTime });
    const trackType = getTrackTypeForMedia({ mediaType: asset.type });
    const tracks = editor.timeline.getTracks();
    const duration =
      asset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

    const existingTrack = tracks.find((track) => {
      if (
        !canElementGoOnTrack({
          elementType: element.type,
          trackType: track.type,
        })
      ) {
        return false;
      }
      return !wouldElementOverlap({
        elements: track.elements,
        startTime,
        endTime: startTime + duration,
      });
    });

    if (existingTrack) {
      editor.timeline.addElementToTrack({
        trackId: existingTrack.id,
        element,
      });
      return true;
    }

    const newTrackId = editor.timeline.addTrack({ type: trackType });
    editor.timeline.addElementToTrack({
      trackId: newTrackId,
      element,
    });
    return true;
  };

  const filteredMediaItems = useMemo(() => {
    const filtered = mediaFiles.filter((item) => !item.ephemeral);

    filtered.sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;

      switch (sortBy) {
        case "name":
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case "type":
          valueA = a.type;
          valueB = b.type;
          break;
        case "duration":
          valueA = a.duration || 0;
          valueB = b.duration || 0;
          break;
        case "size":
          valueA = a.file.size;
          valueB = b.file.size;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [mediaFiles, sortBy, sortOrder]);

  const previewComponents = useMemo(() => {
    const previews = new Map<string, React.ReactNode>();

    filteredMediaItems.forEach((item) => {
      previews.set(item.id, <MediaPreview item={item} />);
    });

    return previews;
  }, [filteredMediaItems]);

  const renderPreview = (item: MediaAsset) => previewComponents.get(item.id);

  return (
    <>
      <input {...fileInputProps} />

      <div
        className={`relative flex h-full flex-col gap-1 transition-colors ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        <div className="bg-panel p-3 pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="foreground"
              onClick={openFilePicker}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CloudUpload />
              )}
              <span>Upload</span>
            </Button>
            <div className="flex items-center gap-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="text"
                      onClick={() =>
                        setMediaViewMode(
                          mediaViewMode === "grid" ? "list" : "grid",
                        )
                      }
                      disabled={isProcessing}
                      className="items-center justify-center"
                    >
                      {mediaViewMode === "grid" ? (
                        <List strokeWidth={1.5} className="!size-[1.05rem]" />
                      ) : (
                        <Grid2X2
                          strokeWidth={1.5}
                          className="!size-[1.05rem]"
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {mediaViewMode === "grid"
                        ? "Switch to list view"
                        : "Switch to grid view"}
                    </p>
                  </TooltipContent>
                  <Tooltip>
                    <DropdownMenu>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="text"
                            disabled={isProcessing}
                            className="items-center justify-center"
                          >
                            <ArrowDown01
                              strokeWidth={1.5}
                              className="!size-[1.05rem]"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <DropdownMenuContent align="end">
                        <SortMenuItem
                          label="Name"
                          sortKey="name"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={({ key }) => {
                            if (sortBy === key) {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy(key);
                              setSortOrder("asc");
                            }
                          }}
                        />
                        <SortMenuItem
                          label="Type"
                          sortKey="type"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={({ key }) => {
                            if (sortBy === key) {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy(key);
                              setSortOrder("asc");
                            }
                          }}
                        />
                        <SortMenuItem
                          label="Duration"
                          sortKey="duration"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={({ key }) => {
                            if (sortBy === key) {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy(key);
                              setSortOrder("asc");
                            }
                          }}
                        />
                        <SortMenuItem
                          label="File size"
                          sortKey="size"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={({ key }) => {
                            if (sortBy === key) {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy(key);
                              setSortOrder("asc");
                            }
                          }}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      <p>
                        Sort by {sortBy} (
                        {sortOrder === "asc" ? "ascending" : "descending"})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="scrollbar-thin h-full w-full overflow-y-auto pt-1">
          <div className="w-full flex-1 p-3 pt-0">
            {isDragOver || filteredMediaItems.length === 0 ? (
              <MediaDragOverlay
                isVisible={true}
                isProcessing={isProcessing}
                progress={progress}
                onClick={openFilePicker}
                isEmptyState={filteredMediaItems.length === 0 && !isDragOver}
              />
            ) : mediaViewMode === "grid" ? (
              <GridView
                items={filteredMediaItems}
                renderPreview={renderPreview}
                onRemove={handleRemove}
                onAddToTimeline={addElementAtTime}
                highlightedId={highlightedId}
                registerElement={registerElement}
              />
            ) : (
              <ListView
                items={filteredMediaItems}
                renderPreview={renderPreview}
                onRemove={handleRemove}
                onAddToTimeline={addElementAtTime}
                highlightedId={highlightedId}
                registerElement={registerElement}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MediaItemWithContextMenu({
  item,
  children,
  onRemove,
}: {
  item: MediaAsset;
  children: React.ReactNode;
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Export clips</ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={(event) => onRemove({ event, id: item.id })}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function GridView({
  items,
  renderPreview,
  onRemove,
  onAddToTimeline,
  highlightedId,
  registerElement,
}: {
  items: MediaAsset[];
  renderPreview: (item: MediaAsset) => React.ReactNode;
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void;
  onAddToTimeline: ({
    asset,
    startTime,
  }: {
    asset: MediaAsset;
    startTime: number;
  }) => boolean;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fill, 160px)",
      }}
    >
      {items.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={onRemove}>
            <DraggableItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: "media",
                mediaType: item.type,
                name: item.name,
              }}
              shouldShowPlusOnDrag={false}
              onAddToTimeline={({ currentTime }) =>
                onAddToTimeline({ asset: item, startTime: currentTime })
              }
              isRounded={false}
              variant="card"
              isHighlighted={highlightedId === item.id}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  );
}

function ListView({
  items,
  renderPreview,
  onRemove,
  onAddToTimeline,
  highlightedId,
  registerElement,
}: {
  items: MediaAsset[];
  renderPreview: (item: MediaAsset) => React.ReactNode;
  onRemove: ({ event, id }: { event: React.MouseEvent; id: string }) => void;
  onAddToTimeline: ({
    asset,
    startTime,
  }: {
    asset: MediaAsset;
    startTime: number;
  }) => boolean;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={onRemove}>
            <DraggableItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: "media",
                mediaType: item.type,
                name: item.name,
              }}
              shouldShowPlusOnDrag={false}
              onAddToTimeline={({ currentTime }) =>
                onAddToTimeline({ asset: item, startTime: currentTime })
              }
              variant="compact"
              isHighlighted={highlightedId === item.id}
            />
          </MediaItemWithContextMenu>
        </div>
      ))}
    </div>
  );
}

function MediaPreview({ item }: { item: MediaAsset }) {
  const formatDuration = (duration: number) => {
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  if (item.type === "image") {
    return (
      <div className="flex size-full items-center justify-center">
        <img
          src={item.url}
          alt={item.name}
          className="max-h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (item.type === "video") {
    if (item.thumbnailUrl) {
      return (
        <div className="relative size-full">
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="size-full rounded object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/20">
            <Video className="size-6 text-white drop-shadow-md" />
          </div>
          {item.duration && (
            <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-xs text-white">
              {formatDuration(item.duration)}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-muted/30 text-muted-foreground flex size-full flex-col items-center justify-center rounded">
        <Video className="mb-1 size-6" />
        <span className="text-xs">Video</span>
        {item.duration && (
          <span className="text-xs opacity-70">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
    );
  }

  if (item.type === "audio") {
    return (
      <div className="bg-linear-to-br text-muted-foreground flex size-full flex-col items-center justify-center rounded border border-green-500/20 from-green-500/20 to-emerald-500/20">
        <Music className="mb-1 size-6" />
        <span className="text-xs">Audio</span>
        {item.duration && (
          <span className="text-xs opacity-70">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted/30 text-muted-foreground flex size-full flex-col items-center justify-center rounded">
      <Image className="size-6" />
      <span className="mt-1 text-xs">Unknown</span>
    </div>
  );
}

function SortMenuItem({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  label: string;
  sortKey: "name" | "type" | "duration" | "size";
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: ({ key }: { key: "name" | "type" | "duration" | "size" }) => void;
}) {
  const isActive = currentSortBy === sortKey;
  const arrow = isActive ? (currentSortOrder === "asc" ? "↑" : "↓") : "";

  return (
    <DropdownMenuItem onClick={() => onSort({ key: sortKey })}>
      {label} {arrow}
    </DropdownMenuItem>
  );
}

function getTrackTypeForMedia({
  mediaType,
}: {
  mediaType: MediaAsset["type"];
}): TrackType {
  switch (mediaType) {
    case "video":
    case "image":
      return "video";
    case "audio":
      return "audio";
    default:
      return "video";
  }
}

function createElementFromMedia({
  asset,
  startTime,
}: {
  asset: MediaAsset;
  startTime: number;
}): CreateTimelineElement {
  const duration =
    asset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

  switch (asset.type) {
    case "video":
      return {
        type: "video",
        name: asset.name,
        mediaId: asset.id,
        startTime,
        duration,
        trimStart: 0,
        trimEnd: 0,
        muted: false,
        hidden: false,
        transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
        opacity: 1,
      };
    case "image":
      return {
        type: "image",
        name: asset.name,
        mediaId: asset.id,
        startTime,
        duration,
        trimStart: 0,
        trimEnd: 0,
        hidden: false,
        transform: { scale: 1, position: { x: 0, y: 0 }, rotate: 0 },
        opacity: 1,
      };
    case "audio":
      return {
        type: "audio",
        sourceType: "upload",
        name: asset.name,
        mediaId: asset.id,
        startTime,
        duration,
        trimStart: 0,
        trimEnd: 0,
        volume: 1,
        muted: false,
        buffer: new AudioBuffer({ length: 1, sampleRate: 44100 }),
      };
    default:
      throw new Error(`Unsupported media type: ${asset.type}`);
  }
}
