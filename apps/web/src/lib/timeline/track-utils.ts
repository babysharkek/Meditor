import type { TrackType, TimelineTrack, ElementType } from "@/types/timeline";
import {
  TRACK_COLORS,
  TRACK_HEIGHTS,
  TRACK_GAP,
} from "@/constants/timeline-constants";
import { generateUUID } from "@/lib/utils";

export function getTrackColor({ type }: { type: TrackType }) {
  return TRACK_COLORS[type];
}

export function getTrackClasses({ type }: { type: TrackType }) {
  const colors = TRACK_COLORS[type];
  return `${colors.solid} ${colors.background} ${colors.border}`.trim();
}

export function getTrackHeight({ type }: { type: TrackType }): number {
  return TRACK_HEIGHTS[type];
}

export function getCumulativeHeightBefore({
  tracks,
  trackIndex,
}: {
  tracks: Array<{ type: TrackType }>;
  trackIndex: number;
}): number {
  return tracks
    .slice(0, trackIndex)
    .reduce(
      (sum, track) => sum + getTrackHeight({ type: track.type }) + TRACK_GAP,
      0,
    );
}

export function getTotalTracksHeight({
  tracks,
}: {
  tracks: Array<{ type: TrackType }>;
}): number {
  const tracksHeight = tracks.reduce(
    (sum, track) => sum + getTrackHeight({ type: track.type }),
    0,
  );
  const gapsHeight = Math.max(0, tracks.length - 1) * TRACK_GAP;
  return tracksHeight + gapsHeight;
}

export function getMainTrack({
  tracks,
}: {
  tracks: TimelineTrack[];
}): TimelineTrack | null {
  return tracks.find((track) => track.type === "video" && track.isMain) ?? null;
}

export function ensureMainTrack({
  tracks,
}: {
  tracks: TimelineTrack[];
}): TimelineTrack[] {
  const hasMainTrack = tracks.some(
    (track) => track.type === "video" && track.isMain,
  );

  if (!hasMainTrack) {
    const mainTrack: TimelineTrack = {
      id: generateUUID(),
      name: "Main Track",
      type: "video",
      elements: [],
      muted: false,
      isMain: true,
    };
    return [mainTrack, ...tracks];
  }

  return tracks;
}

export function canElementGoOnTrack({
  elementType,
  trackType,
}: {
  elementType: ElementType;
  trackType: TrackType;
}): boolean {
  if (elementType === "text") return trackType === "text";
  if (elementType === "audio") return trackType === "audio";
  if (elementType === "sticker") return trackType === "sticker";
  if (elementType === "video" || elementType === "image") {
    return trackType === "video";
  }
  return false;
}

export function validateElementTrackCompatibility({
  element,
  track,
}: {
  element: { type: ElementType };
  track: { type: TrackType };
}): { isValid: boolean; errorMessage?: string } {
  const isValid = canElementGoOnTrack({
    elementType: element.type,
    trackType: track.type,
  });

  if (!isValid) {
    return {
      isValid: false,
      errorMessage: `${element.type} elements cannot be placed on ${track.type} tracks`,
    };
  }

  return { isValid: true };
}
