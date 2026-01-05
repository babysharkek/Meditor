import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TimelineTrack, TimelineElement } from "@/types/timeline";
import { generateUUID } from "@/lib/utils";

export class PasteCommand extends Command {
  private savedState: TimelineTrack[] | null = null;
  private pastedElementIds: string[] = [];

  constructor(private time: number) {
    super();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();
    this.pastedElementIds = [];

    const clipboard = (editor.timeline as any).getClipboard?.();
    if (!clipboard || clipboard.items.length === 0) {
      return;
    }

    const minStart = Math.min(
      ...clipboard.items.map((x: any) => x.element.startTime),
    );

    const updatedTracks = this.savedState.map((track) => {
      const elementsToAdd: TimelineElement[] = [];

      for (const item of clipboard.items) {
        if (item.trackType !== track.type) continue;

        const relativeOffset = item.element.startTime - minStart;
        const startTime = Math.max(0, this.time + relativeOffset);
        const newElementId = generateUUID();

        this.pastedElementIds.push(newElementId);

        const pastedElement: TimelineElement = {
          ...item.element,
          id: newElementId,
          startTime,
        } as TimelineElement;

        elementsToAdd.push(pastedElement);
      }

      return elementsToAdd.length > 0
        ? { ...track, elements: [...track.elements, ...elementsToAdd] }
        : track;
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
