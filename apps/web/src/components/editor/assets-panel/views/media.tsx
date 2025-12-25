"use client";

import { useFileUpload } from "@opencut/hooks/use-file-upload";
import { processMediaFiles } from "@/lib/media-processing-utils";
import { useMediaStore } from "@/stores/media-store";
import { MediaFile } from "@/types/media";
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
import { useState, useMemo } from "react";
import { useRevealItem } from "@/hooks/use-reveal-item";
import { toast } from "sonner";
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
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePanelStore } from "@/stores/panel-store";
import { useAssetsPanelStore } from "../../../../stores/assets-panel-store";

function MediaItemWithContextMenu({
  item,
  children,
  onRemove,
}: {
  item: MediaFile;
  children: React.ReactNode;
  onRemove: (e: React.MouseEvent, id: string) => Promise<void>;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Export clips</ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={(e) => onRemove(e, item.id)}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function MediaView() {
  const { mediaFiles, addMediaFile, removeMediaFile } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { mediaViewMode, setMediaViewMode } = usePanelStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "type" | "duration" | "size">(
    "name",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { highlightMediaId, clearHighlight } = useAssetsPanelStore();
  const { highlightedId, registerElement } = useRevealItem(
    highlightMediaId,
    clearHighlight,
  );

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const processedItems = await processMediaFiles({
        files: files as FileList,
        onProgress: (p: { progress: number }) => setProgress(p.progress),
      });
      for (const item of processedItems) {
        await addMediaFile(activeProject.id, item);
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
      onFilesSelected: processFiles,
    });

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    await removeMediaFile(activeProject.id, id);
  };

  const formatDuration = (duration: number) => {
    // Format seconds as mm:ss
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const filteredMediaItems = useMemo(() => {
    let filtered = mediaFiles.filter((item) => {
      if (item.ephemeral) return false;
      return true;
    });

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
      let preview: React.ReactNode;

      if (item.type === "image") {
        preview = (
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={item.url}
              alt={item.name}
              className="max-h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        );
      } else if (item.type === "video") {
        if (item.thumbnailUrl) {
          preview = (
            <div className="relative h-full w-full">
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="h-full w-full rounded object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded bg-black/20">
                <Video className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              {item.duration && (
                <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-xs text-white">
                  {formatDuration(item.duration)}
                </div>
              )}
            </div>
          );
        } else {
          preview = (
            <div className="bg-muted/30 text-muted-foreground flex h-full w-full flex-col items-center justify-center rounded">
              <Video className="mb-1 h-6 w-6" />
              <span className="text-xs">Video</span>
              {item.duration && (
                <span className="text-xs opacity-70">
                  {formatDuration(item.duration)}
                </span>
              )}
            </div>
          );
        }
      } else if (item.type === "audio") {
        preview = (
          <div className="bg-linear-to-br text-muted-foreground flex h-full w-full flex-col items-center justify-center rounded border border-green-500/20 from-green-500/20 to-emerald-500/20">
            <Music className="mb-1 h-6 w-6" />
            <span className="text-xs">Audio</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );
      } else {
        preview = (
          <div className="bg-muted/30 text-muted-foreground flex h-full w-full flex-col items-center justify-center rounded">
            <Image className="h-6 w-6" />
            <span className="mt-1 text-xs">Unknown</span>
          </div>
        );
      }

      previews.set(item.id, preview);
    });

    return previews;
  }, [filteredMediaItems]);

  const renderPreview = (item: MediaFile) => previewComponents.get(item.id);

  return (
    <>
      {/* native file picker, visually hidden */}
      <input {...fileInputProps} />

      <div
        className={`relative flex h-full flex-col gap-1 transition-colors ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        <div className="bg-panel p-3 pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={openFilePicker}
              disabled={isProcessing}
              className="!bg-background h-9 flex-1 items-center justify-center px-4 opacity-100 transition-opacity hover:opacity-75"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
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
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "name") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy("name");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Name{" "}
                          {sortBy === "name" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "type") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy("type");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Type{" "}
                          {sortBy === "type" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "duration") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy("duration");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          Duration{" "}
                          {sortBy === "duration" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (sortBy === "size") {
                              setSortOrder(
                                sortOrder === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy("size");
                              setSortOrder("asc");
                            }
                          }}
                        >
                          File Size{" "}
                          {sortBy === "size" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </DropdownMenuItem>
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
                filteredMediaItems={filteredMediaItems}
                renderPreview={renderPreview}
                handleRemove={handleRemove}
                highlightedId={highlightedId}
                registerElement={registerElement}
              />
            ) : (
              <ListView
                filteredMediaItems={filteredMediaItems}
                renderPreview={renderPreview}
                handleRemove={handleRemove}
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

function GridView({
  filteredMediaItems,
  renderPreview,
  handleRemove,
  highlightedId,
  registerElement,
}: {
  filteredMediaItems: MediaFile[];
  renderPreview: (item: MediaFile) => React.ReactNode;
  handleRemove: (e: React.MouseEvent, id: string) => Promise<void>;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
}) {
  const { addElementAtTime } = useTimelineStore();

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fill, 160px)",
      }}
    >
      {filteredMediaItems.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={handleRemove}>
            <DraggableMediaItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: item.type,
                name: item.name,
              }}
              showPlusOnDrag={false}
              onAddToTimeline={(currentTime) =>
                addElementAtTime(item, currentTime)
              }
              rounded={false}
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
  filteredMediaItems,
  renderPreview,
  handleRemove,
  highlightedId,
  registerElement,
}: {
  filteredMediaItems: MediaFile[];
  renderPreview: (item: MediaFile) => React.ReactNode;
  handleRemove: (e: React.MouseEvent, id: string) => Promise<void>;
  highlightedId: string | null;
  registerElement: (id: string, element: HTMLElement | null) => void;
}) {
  const { addElementAtTime } = useTimelineStore();

  return (
    <div className="space-y-1">
      {filteredMediaItems.map((item) => (
        <div key={item.id} ref={(el) => registerElement(item.id, el)}>
          <MediaItemWithContextMenu item={item} onRemove={handleRemove}>
            <DraggableMediaItem
              name={item.name}
              preview={renderPreview(item)}
              dragData={{
                id: item.id,
                type: item.type,
                name: item.name,
              }}
              showPlusOnDrag={false}
              onAddToTimeline={(currentTime) =>
                addElementAtTime(item, currentTime)
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
