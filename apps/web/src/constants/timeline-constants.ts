import type { TrackType } from "@/types/timeline";

export const TRACK_COLORS: Record<
  TrackType,
  { solid: string; background: string; border: string }
> = {
  media: {
    solid: "bg-blue-500",
    background: "",
    border: "",
  },
  text: {
    solid: "bg-[#5DBAA0]",
    background: "bg-[#5DBAA0]",
    border: "",
  },
  audio: {
    solid: "bg-green-500",
    background: "bg-[#915DBE]",
    border: "",
  },
} as const;

export const TRACK_HEIGHTS: Record<TrackType, number> = {
  media: 60,
  text: 25,
  audio: 50,
} as const;

export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60,
  DEFAULT_TEXT_DURATION: 5,
  DEFAULT_IMAGE_DURATION: 5,
  MIN_DURATION_SECONDS: 10,
  PLAYHEAD_LOOKAHEAD_SECONDS: 30, // Padding ahead of playhead
  ZOOM_LEVELS: [0.25, 0.5, 1, 1.5, 2, 3, 4],
  ZOOM_MIN: 0.25,
  ZOOM_MAX: 4,
  ZOOM_STEP: 0.25,
} as const;
