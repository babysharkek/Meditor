import type { TimelineTrack, ElementType } from "@/types/timeline";
import { TRACK_HEIGHTS, TRACK_GAP } from "@/constants/timeline-constants";
import { wouldElementOverlap } from "./element-utils";
import type { ComputeDropTargetParams, DropTarget } from "@/types/timeline";
import { isMainTrack } from "./track-utils";

function getTrackAtY({
  mouseY,
  tracks,
}: {
  mouseY: number;
  tracks: TimelineTrack[];
}): { trackIndex: number; relativeY: number } | null {
  let cumulativeHeight = 0;

  for (let i = 0; i < tracks.length; i++) {
    const trackHeight = TRACK_HEIGHTS[tracks[i].type];
    const trackTop = cumulativeHeight;
    const trackBottom = trackTop + trackHeight;

    if (mouseY >= trackTop && mouseY < trackBottom) {
      return {
        trackIndex: i,
        relativeY: mouseY - trackTop,
      };
    }

    cumulativeHeight += trackHeight + TRACK_GAP;
  }

  return null;
}

function isCompatible({
  elementType,
  trackType,
}: {
  elementType: ElementType;
  trackType: TimelineTrack["type"];
}): boolean {
  if (elementType === "text") return trackType === "text";
  if (elementType === "audio") return trackType === "audio";
  if (elementType === "sticker") return trackType === "sticker";
  if (elementType === "video" || elementType === "image") {
    return trackType === "video";
  }
  return false;
}

function getMainTrackIndex({ tracks }: { tracks: TimelineTrack[] }): number {
  return tracks.findIndex((track) => isMainTrack(track));
}

function findInsertIndex({
  elementType,
  tracks,
  preferredIndex,
  insertAbove,
}: {
  elementType: ElementType;
  tracks: TimelineTrack[];
  preferredIndex: number;
  insertAbove: boolean;
}): { index: number; position: "above" | "below" } {
  const mainTrackIndex = getMainTrackIndex({ tracks });

  if (elementType === "audio") {
    if (preferredIndex <= mainTrackIndex) {
      return { index: mainTrackIndex + 1, position: "below" };
    }
    return {
      index: insertAbove ? preferredIndex : preferredIndex + 1,
      position: insertAbove ? "above" : "below",
    };
  }

  if (preferredIndex > mainTrackIndex && mainTrackIndex >= 0) {
    return { index: mainTrackIndex, position: "above" };
  }

  return {
    index: insertAbove ? preferredIndex : preferredIndex + 1,
    position: insertAbove ? "above" : "below",
  };
}

export function computeDropTarget({
  elementType,
  mouseX,
  mouseY,
  tracks,
  playheadTime,
  isExternalDrop,
  elementDuration,
  pixelsPerSecond,
  zoomLevel,
  excludeElementId,
}: ComputeDropTargetParams): DropTarget {
  const xPosition = isExternalDrop
    ? playheadTime
    : Math.max(0, mouseX / (pixelsPerSecond * zoomLevel));

  const mainTrackIndex = getMainTrackIndex({ tracks });

  if (tracks.length === 0) {
    if (elementType === "audio") {
      return {
        trackIndex: 0,
        isNewTrack: true,
        insertPosition: "below",
        xPosition,
      };
    }
    return { trackIndex: 0, isNewTrack: true, insertPosition: null, xPosition };
  }

  const trackAtMouse = getTrackAtY({ mouseY, tracks });

  if (!trackAtMouse) {
    const isAboveAllTracks = mouseY < 0;

    if (elementType === "audio") {
      return {
        trackIndex: tracks.length,
        isNewTrack: true,
        insertPosition: "below",
        xPosition,
      };
    }

    if (isAboveAllTracks) {
      return {
        trackIndex: 0,
        isNewTrack: true,
        insertPosition: "above",
        xPosition,
      };
    }

    return {
      trackIndex: Math.max(0, mainTrackIndex),
      isNewTrack: true,
      insertPosition: "above",
      xPosition,
    };
  }

  const { trackIndex, relativeY } = trackAtMouse;
  const track = tracks[trackIndex];
  const trackHeight = TRACK_HEIGHTS[track.type];
  const isInUpperHalf = relativeY < trackHeight / 2;

  const isTrackCompatible = isCompatible({
    elementType,
    trackType: track.type,
  });

  const endTime = xPosition + elementDuration;
  const hasOverlap = wouldElementOverlap({
    elements: track.elements,
    startTime: xPosition,
    endTime,
    excludeElementId,
  });

  if (isTrackCompatible && !hasOverlap) {
    return {
      trackIndex,
      isNewTrack: false,
      insertPosition: null,
      xPosition,
    };
  }

  const { index, position } = findInsertIndex({
    elementType,
    tracks,
    preferredIndex: trackIndex,
    insertAbove: isInUpperHalf,
  });

  return {
    trackIndex: index,
    isNewTrack: true,
    insertPosition: position,
    xPosition,
  };
}

export function getDropLineY({
  dropTarget,
  tracks,
}: {
  dropTarget: DropTarget;
  tracks: TimelineTrack[];
}): number {
  let y = 0;

  for (let i = 0; i < dropTarget.trackIndex && i < tracks.length; i++) {
    y += TRACK_HEIGHTS[tracks[i].type] + TRACK_GAP;
  }

  if (!dropTarget.isNewTrack && dropTarget.trackIndex < tracks.length) {
    return y;
  }

  if (
    dropTarget.insertPosition === "below" &&
    dropTarget.trackIndex <= tracks.length
  ) {
    if (dropTarget.trackIndex > 0 && dropTarget.trackIndex <= tracks.length) {
      y += TRACK_HEIGHTS[tracks[dropTarget.trackIndex - 1]?.type ?? "video"];
    }
  }

  return y;
}
