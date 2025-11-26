import type { TrackType, TimelineTrack } from "@/types/timeline";
import { TRACK_COLORS, TRACK_HEIGHTS } from "@/constants/timeline-constants";
import { generateUUID } from "@/lib/utils";

export function getTrackColors({ type }: { type: TrackType }) {
  return TRACK_COLORS[type];
}

export function getTrackElementClasses({ type }: { type: TrackType }) {
  const colors = getTrackColors({ type });
  return `${colors.background} ${colors.border}`;
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
  const GAP = 4;
  return tracks
    .slice(0, trackIndex)
    .reduce(
      (sum, track) => sum + getTrackHeight({ type: track.type }) + GAP,
      0,
    );
}

export function getTotalTracksHeight({
  tracks,
}: {
  tracks: Array<{ type: TrackType }>;
}): number {
  const GAP = 4;
  const tracksHeight = tracks.reduce(
    (sum, track) => sum + getTrackHeight({ type: track.type }),
    0,
  );
  const gapsHeight = Math.max(0, tracks.length - 1) * GAP;
  return tracksHeight + gapsHeight;
}

export function sortTracksByOrder({
  tracks,
}: {
  tracks: TimelineTrack[];
}): TimelineTrack[] {
  return [...tracks].sort((a, b) => {
    if (a.type === "text" && b.type !== "text") return -1;
    if (b.type === "text" && a.type !== "text") return 1;

    if (a.type === "audio" && b.type !== "audio") return 1;
    if (b.type === "audio" && a.type !== "audio") return -1;

    if (a.type === "media" && b.type === "media") {
      if (a.isMain && !b.isMain) return 1;
      if (!a.isMain && b.isMain) return -1;
    }

    return 0;
  });
}

export function getMainTrack({
  tracks,
}: {
  tracks: TimelineTrack[];
}): TimelineTrack | null {
  return tracks.find((track) => track.isMain) || null;
}

export function ensureMainTrack({
  tracks,
}: {
  tracks: TimelineTrack[];
}): TimelineTrack[] {
  const hasMainTrack = tracks.some((track) => track.isMain);

  if (!hasMainTrack) {
    const mainTrack: TimelineTrack = {
      id: generateUUID(),
      name: "Main Track",
      type: "media",
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
  elementType: "text" | "media";
  trackType: TrackType;
}): boolean {
  if (elementType === "text") {
    return trackType === "text";
  }
  if (elementType === "media") {
    return trackType === "media" || trackType === "audio";
  }
  return false;
}

export function validateElementTrackCompatibility({
  element,
  track,
}: {
  element: { type: "text" | "media" };
  track: { type: TrackType };
}): { isValid: boolean; errorMessage?: string } {
  const isValid = canElementGoOnTrack({
    elementType: element.type,
    trackType: track.type,
  });

  if (!isValid) {
    const errorMessage =
      element.type === "text"
        ? "Text elements can only be placed on text tracks"
        : "Media elements can only be placed on media or audio tracks";

    return { isValid: false, errorMessage };
  }

  return { isValid: true };
}
