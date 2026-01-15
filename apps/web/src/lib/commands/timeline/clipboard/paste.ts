import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
  TimelineTrack,
  TimelineElement,
  ClipboardItem,
} from "@/types/timeline";
import { generateUUID } from "@/lib/utils";

export class PasteCommand extends Command {
  private savedState: TimelineTrack[] | null = null;
  private pastedElementIds: string[] = [];

  constructor(
    private time: number,
    private clipboardItems: ClipboardItem[],
  ) {
    super();
  }

  execute(): void {
    if (this.clipboardItems.length === 0) return;

    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();
    this.pastedElementIds = [];

    const minStart = Math.min(
      ...this.clipboardItems.map((item) => item.element.startTime),
    );

    const updatedTracks = this.savedState.map((track) => {
      const elementsToAdd: TimelineElement[] = [];

      for (const item of this.clipboardItems) {
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
