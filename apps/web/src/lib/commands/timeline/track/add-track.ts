import { Command } from "@/lib/commands/base-command";
import type { TrackType, TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/lib/utils";
import { EditorCore } from "@/core";

export class AddTrackCommand extends Command {
  private trackId: string;
  private savedState: TimelineTrack[] | null = null;

  constructor(
    private type: TrackType,
    private index?: number,
  ) {
    super();
    this.trackId = generateUUID();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();

    const trackName =
      this.type === "video"
        ? "Video track"
        : this.type === "text"
          ? "Text track"
          : this.type === "audio"
            ? "Audio track"
            : this.type === "sticker"
              ? "Sticker track"
              : "Track";

    const newTrack: TimelineTrack =
      this.type === "video"
        ? {
            id: this.trackId,
            name: trackName,
            type: "video",
            elements: [],
            muted: false,
            isMain: false,
          }
        : {
            id: this.trackId,
            name: trackName,
            type: this.type,
            elements: [],
            muted: false,
          };

    let updatedTracks: TimelineTrack[];
    if (this.index !== undefined) {
      updatedTracks = [...(this.savedState || [])];
      updatedTracks.splice(this.index, 0, newTrack);
    } else {
      updatedTracks = [...(this.savedState || []), newTrack];
    }

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }

  getTrackId(): string {
    return this.trackId;
  }
}
