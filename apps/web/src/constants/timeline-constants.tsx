import type { TrackType } from "@/types/timeline";
import { Video, TypeIcon, Music, Sticker } from "lucide-react";

export const TRACK_COLORS: Record<
  TrackType,
  { solid: string; background: string; border: string }
> = {
  video: {
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
  sticker: {
    solid: "bg-amber-500",
    background: "bg-amber-500",
    border: "",
  },
} as const;

export const TRACK_HEIGHTS: Record<TrackType, number> = {
  video: 60,
  text: 25,
  audio: 50,
  sticker: 50,
} as const;

export const TRACK_GAP = 4;

export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60,
  DEFAULT_ELEMENT_DURATION: 5,
  MIN_DURATION_SECONDS: 10,
  PLAYHEAD_LOOKAHEAD_SECONDS: 30, // Padding ahead of playhead
  ZOOM_LEVELS: [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 10],
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 10,
  ZOOM_STEP: 0.1,
} as const;

export const TRACK_ICONS: Record<TrackType, React.ReactNode> = {
  video: <Video className="text-muted-foreground h-4 w-4 shrink-0" />,
  text: <TypeIcon className="text-muted-foreground h-4 w-4 shrink-0" />,
  audio: <Music className="text-muted-foreground h-4 w-4 shrink-0" />,
  sticker: <Sticker className="text-muted-foreground h-4 w-4 shrink-0" />,
} as const;
