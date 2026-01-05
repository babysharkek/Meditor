import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
  CreateTimelineElement,
  TimelineTrack,
  TimelineElement,
} from "@/types/timeline";
import { generateUUID } from "@/lib/utils";
import { validateElementTrackCompatibility } from "@/lib/timeline/track-utils";
import type { MediaFile } from "@/types/assets";

export class AddElementToTrackCommand extends Command {
  private elementId: string;
  private savedState: TimelineTrack[] | null = null;

  constructor(
    private trackId: string,
    private element: CreateTimelineElement,
  ) {
    super();
    this.elementId = generateUUID();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();
    const track = this.savedState.find((t) => t.id === this.trackId);

    if (!track) {
      console.error("Track not found:", this.trackId);
      return;
    }

    const validation = validateElementTrackCompatibility({
      element: this.element,
      track,
    });

    if (!validation.isValid) {
      console.error(validation.errorMessage);
      return;
    }

    if (this.element.type !== "text" && !this.element.mediaId) {
      console.error("Media element must have mediaId");
      return;
    }

    if (this.element.type === "text" && !this.element.content) {
      console.error("Text element must have content");
      return;
    }

    const totalElementsInTimeline = this.savedState.reduce(
      (total, t) => total + t.elements.length,
      0,
    );
    const isFirstElement = totalElementsInTimeline === 0;

    const newElement: TimelineElement = {
      ...this.element,
      id: this.elementId,
      startTime: this.element.startTime,
      trimStart: this.element.trimStart ?? 0,
      trimEnd: this.element.trimEnd ?? 0,
    } as TimelineElement;

    const isVisualMedia =
      newElement.type === "video" || newElement.type === "image";

    if (isFirstElement && isVisualMedia) {
      const mediaFiles = editor.media.getMediaFiles();
      const mediaItem = mediaFiles.find(
        (item: MediaFile) => item.id === newElement.mediaId,
      );

      if (mediaItem?.width && mediaItem?.height) {
        editor.project.updateCanvasSize({
          size: {
            width: mediaItem.width,
            height: mediaItem.height,
          },
        });
      }

      if (mediaItem?.type === "video" && mediaItem?.fps) {
        const activeProject = editor.project.getActive();
        if (activeProject) {
          editor.project.updateProjectFps({ fps: mediaItem.fps });
        }
      }
    }

    const updatedTracks = this.savedState.map((t) =>
      t.id === this.trackId
        ? { ...t, elements: [...t.elements, newElement] }
        : t,
    ) as TimelineTrack[];

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }

  getElementId(): string {
    return this.elementId;
  }
}
