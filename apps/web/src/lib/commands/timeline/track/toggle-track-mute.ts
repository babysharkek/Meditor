import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";

export class ToggleTrackMuteCommand extends Command {
  private savedState: TimelineTrack[] | null = null;

  constructor(private trackId: string) {
    super();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();

    const updatedTracks = this.savedState.map((t) =>
      t.id === this.trackId ? { ...t, muted: !t.muted } : t,
    );

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }
}
