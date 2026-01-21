import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
  TimelineTrack,
  TimelineElement,
  ClipboardItem,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { wouldElementOverlap } from "@/lib/timeline/element-utils";
import {
  buildEmptyTrack,
  getHighestInsertIndexForTrack,
} from "@/lib/timeline/track-utils";

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

    const updatedTracks = [...this.savedState];
    const itemsByTrackId = groupClipboardItemsByTrackId({
      clipboardItems: this.clipboardItems,
    });

    for (const [trackId, items] of itemsByTrackId) {
      const elementsToAdd = buildPastedElements({
        items,
        minStart,
        time: this.time,
        pastedElementIds: this.pastedElementIds,
      });

      if (elementsToAdd.length === 0) {
        continue;
      }

      const trackType = items[0].trackType;
      const sourceTrackIndex = updatedTracks.findIndex(
        (track) => track.id === trackId,
      );
      const resolvedTargetIndex = resolveTargetTrackIndex({
        tracks: updatedTracks,
        sourceTrackIndex,
        trackType,
        elements: elementsToAdd,
      });

      if (resolvedTargetIndex >= 0) {
        const targetTrack = updatedTracks[resolvedTargetIndex];
        updatedTracks[resolvedTargetIndex] = {
          ...targetTrack,
          elements: [...targetTrack.elements, ...elementsToAdd],
        } as TimelineTrack;
        continue;
      }

      const insertIndex = resolveInsertIndexForNewTrack({
        tracks: updatedTracks,
        sourceTrackIndex,
        trackType,
      });
      const newTrack = buildTrackWithElements({
        trackType,
        elements: elementsToAdd,
      });
      updatedTracks.splice(insertIndex, 0, newTrack);
    }

    editor.timeline.updateTracks(updatedTracks);
  }

  undo(): void {
    if (this.savedState) {
      const editor = EditorCore.getInstance();
      editor.timeline.updateTracks(this.savedState);
    }
  }
}

function groupClipboardItemsByTrackId({
  clipboardItems,
}: {
  clipboardItems: ClipboardItem[];
}): Map<string, ClipboardItem[]> {
  const groupedItems = new Map<string, ClipboardItem[]>();

  for (const item of clipboardItems) {
    const existingItems = groupedItems.get(item.trackId) ?? [];
    groupedItems.set(item.trackId, [...existingItems, item]);
  }

  return groupedItems;
}

function buildPastedElements({
  items,
  minStart,
  time,
  pastedElementIds,
}: {
  items: ClipboardItem[];
  minStart: number;
  time: number;
  pastedElementIds: string[];
}): TimelineElement[] {
  const elementsToAdd: TimelineElement[] = [];

  for (const item of items) {
    const relativeOffset = item.element.startTime - minStart;
    const startTime = Math.max(0, time + relativeOffset);
    const newElementId = generateUUID();

    pastedElementIds.push(newElementId);
    elementsToAdd.push({
      ...item.element,
      id: newElementId,
      startTime,
    } as TimelineElement);
  }

  return elementsToAdd;
}

function resolveTargetTrackIndex({
  tracks,
  sourceTrackIndex,
  trackType,
  elements,
}: {
  tracks: TimelineTrack[];
  sourceTrackIndex: number;
  trackType: ClipboardItem["trackType"];
  elements: TimelineElement[];
}): number {
  if (sourceTrackIndex >= 0) {
    const aboveIndex = sourceTrackIndex - 1;
    if (aboveIndex < 0) {
      return -1;
    }

    const aboveTrack = tracks[aboveIndex];
    if (aboveTrack.type !== trackType) {
      return -1;
    }

    const canPlaceOnAbove = canPlaceElementsOnTrack({
      track: aboveTrack,
      elements,
    });
    return canPlaceOnAbove ? aboveIndex : -1;
  }

  const highestCompatibleIndex = tracks.findIndex(
    (track) => track.type === trackType,
  );
  if (highestCompatibleIndex < 0) {
    return -1;
  }

  const highestCompatibleTrack = tracks[highestCompatibleIndex];
  const canPlaceOnHighest = canPlaceElementsOnTrack({
    track: highestCompatibleTrack,
    elements,
  });

  return canPlaceOnHighest ? highestCompatibleIndex : -1;
}

function resolveInsertIndexForNewTrack({
  tracks,
  sourceTrackIndex,
  trackType,
}: {
  tracks: TimelineTrack[];
  sourceTrackIndex: number;
  trackType: ClipboardItem["trackType"];
}): number {
  if (sourceTrackIndex >= 0) {
    return sourceTrackIndex;
  }

  const highestCompatibleIndex = tracks.findIndex(
    (track) => track.type === trackType,
  );
  if (highestCompatibleIndex >= 0) {
    return highestCompatibleIndex;
  }

  return getHighestInsertIndexForTrack({ tracks, trackType });
}

function canPlaceElementsOnTrack({
  track,
  elements,
}: {
  track: TimelineTrack;
  elements: TimelineElement[];
}): boolean {
  for (const element of elements) {
    const endTime = element.startTime + element.duration;
    const hasOverlap = wouldElementOverlap({
      elements: track.elements,
      startTime: element.startTime,
      endTime,
    });
    if (hasOverlap) {
      return false;
    }
  }

  return true;
}

function buildTrackWithElements({
  trackType,
  elements,
}: {
  trackType: ClipboardItem["trackType"];
  elements: TimelineElement[];
}): TimelineTrack {
  const newTrackId = generateUUID();
  const newTrackBase = buildEmptyTrack({ id: newTrackId, type: trackType });
  return {
    ...newTrackBase,
    elements,
  } as TimelineTrack;
}
