import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";

export class UpdateElementTrimCommand extends Command {
  private savedState: TimelineTrack[] | null = null;

  constructor(
    private trackId: string,
    private elementId: string,
    private trimStart: number,
    private trimEnd: number,
  ) {
    super();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();

    const updatedTracks = this.savedState.map((t) => {
      if (t.id !== this.trackId) return t;
      const newElements = t.elements.map((el) =>
        el.id === this.elementId
          ? { ...el, trimStart: this.trimStart, trimEnd: this.trimEnd }
          : el,
      );
      return { ...t, elements: newElements } as typeof t;
    });

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }
}
