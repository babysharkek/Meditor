export type TrackType = "media" | "text" | "audio";

interface BaseTrack {
  id: string;
  name: string;
  muted?: boolean;
}

export interface MediaTrack extends BaseTrack {
  type: "media";
  elements: (VideoElement | ImageElement)[];
  isMain?: boolean;
}

export interface TextTrack extends BaseTrack {
  type: "text";
  elements: TextElement[];
}

export interface AudioTrack extends BaseTrack {
  type: "audio";
  elements: AudioElement[];
}

export type TimelineTrack = MediaTrack | TextTrack | AudioTrack;

interface BaseTimelineElement {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

export interface AudioElement extends BaseTimelineElement {
  type: "audio";
  mediaId: string;
  volume: number;
  muted?: boolean;
  buffer: AudioBuffer;
}

export interface VideoElement extends BaseTimelineElement {
  type: "video";
  mediaId: string;
  muted?: boolean;
  hidden?: boolean;
}

export interface ImageElement extends BaseTimelineElement {
  type: "image";
  mediaId: string;
  hidden?: boolean;
}

export interface TextElement extends BaseTimelineElement {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  hidden?: boolean;
}

export type TimelineElement =
  | AudioElement
  | VideoElement
  | ImageElement
  | TextElement;

export type CreateAudioElement = Omit<AudioElement, "id">;
export type CreateVideoElement = Omit<VideoElement, "id">;
export type CreateImageElement = Omit<ImageElement, "id">;
export type CreateTextElement = Omit<TextElement, "id">;
export type CreateTimelineElement =
  | CreateAudioElement
  | CreateVideoElement
  | CreateImageElement
  | CreateTextElement;

// ---- Drag State ----

export interface ElementDragState {
  isDragging: boolean;
  elementId: string | null;
  trackId: string | null;
  startMouseX: number;
  startElementTime: number;
  clickOffsetTime: number;
  currentTime: number;
}

export interface DropTarget {
  trackIndex: number;
  isNewTrack: boolean;
  insertPosition: "above" | "below" | null;
  xPosition: number;
}

export interface ComputeDropTargetParams {
  elementType: TimelineElement["type"];
  mouseX: number;
  mouseY: number;
  tracks: TimelineTrack[];
  playheadTime: number;
  isExternalDrop: boolean;
  elementDuration: number;
  pixelsPerSecond: number;
  zoomLevel: number;
}
