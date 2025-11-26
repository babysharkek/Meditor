import type { EditorCore } from "@/core";
import type { MediaFile } from "@/types/media";
import { storageService } from "@/lib/storage/storage-service";
import { generateUUID } from "@/lib/utils";
import { videoCache } from "@/lib/video-cache";
import { generateThumbnail } from "@/lib/media-processing-utils";

export class MediaManager {
  private mediaFiles: MediaFile[] = [];
  private isLoading = false;
  private listeners = new Set<() => void>();

  constructor(private editor: EditorCore) {}

  async addMediaFile({
    projectId,
    file,
  }: {
    projectId: string;
    file: Omit<MediaFile, "id">;
  }): Promise<void> {
    const newItem: MediaFile = {
      ...file,
      id: generateUUID(),
    };

    this.mediaFiles = [...this.mediaFiles, newItem];
    this.notify();

    try {
      await storageService.saveMediaFile({ projectId, mediaItem: newItem });
    } catch (error) {
      console.error("Failed to save media item:", error);
      this.mediaFiles = this.mediaFiles.filter(
        (media) => media.id !== newItem.id,
      );
      this.notify();
    }
  }

  async removeMediaFile({
    projectId,
    id,
  }: {
    projectId: string;
    id: string;
  }): Promise<void> {
    const item = this.mediaFiles.find((media) => media.id === id);

    videoCache.clearVideo(id);

    if (item?.url) {
      URL.revokeObjectURL(item.url);
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    }

    this.mediaFiles = this.mediaFiles.filter((media) => media.id !== id);
    this.notify();

    const tracks = this.editor.timeline.getTracks();
    const elementsToRemove: Array<{ trackId: string; elementId: string }> = [];

    for (const track of tracks) {
      for (const el of track.elements) {
        if (el.type === "media" && el.mediaId === id) {
          elementsToRemove.push({ trackId: track.id, elementId: el.id });
        }
      }
    }

    if (elementsToRemove.length > 0) {
      this.editor.timeline.setSelectedElements({ elements: elementsToRemove });
      this.editor.timeline.deleteSelected({});
    }

    try {
      await storageService.deleteMediaFile({ projectId, id });
    } catch (error) {
      console.error("Failed to delete media item:", error);
    }
  }

  async loadProjectMedia({ projectId }: { projectId: string }): Promise<void> {
    this.isLoading = true;
    this.notify();

    try {
      const mediaItems = await storageService.loadAllMediaFiles({ projectId });

      const updatedMediaItems = await Promise.all(
        mediaItems.map(async (item) => {
          if (item.type === "video" && item.file) {
            try {
              const thumbnailUrl = await generateThumbnail({
                videoFile: item.file,
                timeInSeconds: 1,
              });
              return {
                ...item,
                thumbnailUrl,
              };
            } catch (error) {
              console.error(
                `Failed to regenerate thumbnail for video ${item.id}:`,
                error,
              );
              return item;
            }
          }
          return item;
        }),
      );

      this.mediaFiles = updatedMediaItems;
      this.notify();
    } catch (error) {
      console.error("Failed to load media items:", error);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async clearProjectMedia({ projectId }: { projectId: string }): Promise<void> {
    this.mediaFiles.forEach((item) => {
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });

    const mediaIds = this.mediaFiles.map((item) => item.id);
    this.mediaFiles = [];
    this.notify();

    try {
      await Promise.all(
        mediaIds.map((id) => storageService.deleteMediaFile({ projectId, id })),
      );
    } catch (error) {
      console.error("Failed to clear media items from storage:", error);
    }
  }

  clearAllMedia(): void {
    videoCache.clearAll();

    this.mediaFiles.forEach((item) => {
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
      if (item.thumbnailUrl) {
        URL.revokeObjectURL(item.thumbnailUrl);
      }
    });

    this.mediaFiles = [];
    this.notify();
  }

  getMediaFiles(): MediaFile[] {
    return this.mediaFiles;
  }

  isLoadingMedia(): boolean {
    return this.isLoading;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
