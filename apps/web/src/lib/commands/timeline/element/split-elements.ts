import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/lib/utils";
import { EditorCore } from "@/core";

export class SplitElementsCommand extends Command {
  private savedState: TimelineTrack[] | null = null;
  private newElementIds: string[] = [];

  constructor(
    private elements: { trackId: string; elementId: string }[],
    private splitTime: number,
    private retainSide: "both" | "left" | "right" = "both",
  ) {
    super();
  }

  execute(): void {
    const editor = EditorCore.getInstance();
    this.savedState = editor.timeline.getTracks();
    this.newElementIds = [];

    const updatedTracks = this.savedState.map((track) => {
      const elementsToSplit = this.elements.filter(
        (el) => el.trackId === track.id,
      );

      if (elementsToSplit.length === 0) {
        return track;
      }

      return {
        ...track,
        elements: track.elements.flatMap((element) => {
          const shouldSplit = elementsToSplit.some(
            (el) => el.elementId === element.id,
          );

          if (!shouldSplit) {
            return [element];
          }

          const effectiveStart = element.startTime;
          const effectiveEnd =
            element.startTime +
            (element.duration - element.trimStart - element.trimEnd);

          if (
            this.splitTime <= effectiveStart ||
            this.splitTime >= effectiveEnd
          ) {
            return [element];
          }

          const relativeTime = this.splitTime - element.startTime;
          const firstDuration = relativeTime;
          const secondDuration =
            element.duration -
            element.trimStart -
            element.trimEnd -
            relativeTime;

          if (this.retainSide === "left") {
            return [
              {
                ...element,
                trimEnd: element.trimEnd + secondDuration,
                name: `${element.name} (left)`,
              },
            ];
          }

          if (this.retainSide === "right") {
            return [
              {
                ...element,
                id: generateUUID(),
                startTime: this.splitTime,
                trimStart: element.trimStart + firstDuration,
                name: `${element.name} (right)`,
              },
            ];
          }

          // "both" - split into two pieces
          const secondElementId = generateUUID();
          this.newElementIds.push(secondElementId);

          return [
            {
              ...element,
              trimEnd: element.trimEnd + secondDuration,
              name: `${element.name} (left)`,
            },
            {
              ...element,
              id: secondElementId,
              startTime: this.splitTime,
              trimStart: element.trimStart + firstDuration,
              name: `${element.name} (right)`,
            },
          ];
        }),
      } as typeof track;
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
