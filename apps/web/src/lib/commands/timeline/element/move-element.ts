import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TimelineTrack, TimelineElement } from "@/types/timeline";
import { validateElementTrackCompatibility } from "@/lib/timeline/track-utils";

export class MoveElementCommand extends Command {
  private savedState: TimelineTrack[] | null = null;

  constructor(
    private sourceTrackId: string,
    private targetTrackId: string,
    private elementId: string,
    private newStartTime: number,
  ) {
    super();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();

    const sourceTrack = this.savedState.find((t) => t.id === this.sourceTrackId);
    const element = sourceTrack?.elements.find((el) => el.id === this.elementId);

    if (!sourceTrack || !element) {
      console.error("Source track or element not found");
      return;
    }

    const targetTrack = this.savedState.find((t) => t.id === this.targetTrackId);
    if (!targetTrack) {
      console.error("Target track not found");
      return;
    }

    const validation = validateElementTrackCompatibility({
      element,
      track: targetTrack,
    });

    if (!validation.isValid) {
      console.error(validation.errorMessage);
      return;
    }

    const movedElement: TimelineElement = {
      ...element,
      startTime: this.newStartTime,
    };

    const isSameTrack = this.sourceTrackId === this.targetTrackId;

    const updatedTracks = this.savedState.map((track) => {
      if (isSameTrack && track.id === this.sourceTrackId) {
        return {
          ...track,
          elements: track.elements.map((el) =>
            el.id === this.elementId ? movedElement : el,
          ),
        };
      }

      if (track.id === this.sourceTrackId) {
        return {
          ...track,
          elements: track.elements.filter((el) => el.id !== this.elementId),
        };
      }

      if (track.id === this.targetTrackId) {
        return {
          ...track,
          elements: [...track.elements, movedElement],
        };
      }

      return track;
    }) as TimelineTrack[];

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }
}
