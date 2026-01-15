import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
  CreateTimelineElement,
  TimelineTrack,
  TimelineElement,
} from "@/types/timeline";
import { generateUUID } from "@/lib/utils";
import { requiresMediaId } from "@/lib/timeline/element-utils";
import { validateElementTrackCompatibility } from "@/lib/timeline/track-utils";
import type { MediaAsset } from "@/types/assets";

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

    if (
      requiresMediaId({ element: this.element }) &&
      !("mediaId" in this.element)
    ) {
      console.error("Element requires mediaId");
      return;
    }

    if (
      this.element.type === "audio" &&
      this.element.sourceType === "library" &&
      !this.element.sourceUrl
    ) {
      console.error("Library audio element must have sourceUrl");
      return;
    }

    if (this.element.type === "sticker" && !this.element.iconName) {
      console.error("Sticker element must have iconName");
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
      const mediaAssets = editor.media.getAssets();
      const asset = mediaAssets.find(
        (item: MediaAsset) => item.id === newElement.mediaId,
      );

      if (asset?.width && asset?.height) {
        editor.project.updateSettings({
          settings: {
            canvasSize: { width: asset.width, height: asset.height },
          },
        });
      }

      if (asset?.type === "video" && asset?.fps) {
        editor.project.updateSettings({ settings: { fps: asset.fps } });
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
