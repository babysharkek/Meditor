import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/lib/utils";
import { EditorCore } from "@/core";

interface DuplicateElementsParams {
  elements: { trackId: string; elementId: string }[];
}

export class DuplicateElementsCommand extends Command {
  private duplicatedIds: string[] = [];
  private savedState: TimelineTrack[] | null = null;
  private elements: DuplicateElementsParams["elements"];

  constructor({ elements }: DuplicateElementsParams) {
    super();
    this.elements = elements;
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();
    this.duplicatedIds = [];

    const updatedTracks = this.savedState.map((track) => {
      const elementsToDuplicate = this.elements.filter(
        (el) => el.trackId === track.id,
      );

      if (elementsToDuplicate.length === 0) {
        return track;
      }

      const newElements = track.elements.flatMap((element) => {
        const shouldDuplicate = elementsToDuplicate.some(
          (el) => el.elementId === element.id,
        );

        if (!shouldDuplicate) {
          return [element];
        }

        const effectiveDuration =
          element.duration - element.trimStart - element.trimEnd;
        const newId = generateUUID();
        this.duplicatedIds.push(newId);

        return [
          element,
          {
            ...element,
            id: newId,
            name: `${element.name} (copy)`,
            startTime: element.startTime + effectiveDuration + 0.1,
          },
        ];
      });

      return { ...track, elements: newElements } as typeof track;
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
