import { TCanvasSize } from "./editor";

export type TBackgroundType = "color" | "blur";

export interface TTimeline {
  bookmarks?: number[];
}

export interface TScene {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
  timeline?: TTimeline;
}

export interface TProject {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  scenes: TScene[];
  currentSceneId: string;
  mediaItems?: string[];
  backgroundColor?: string;
  backgroundType?: TBackgroundType;
  blurIntensity?: number;
  fps?: number;
  canvasSize: TCanvasSize;
}
