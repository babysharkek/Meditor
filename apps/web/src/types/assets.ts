export type MediaType = "image" | "video" | "audio";

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  file: File;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;

  // only used in timeline, never shown or saved in media library
  ephemeral?: boolean;
}

interface BaseAssetDragData {
  id: string;
  name: string;
}

export interface MediaAssetDragData extends BaseAssetDragData {
  type: "media";
  mediaType: MediaType;
}

export interface TextAssetDragData extends BaseAssetDragData {
  type: "text";
  content: string;
}

export type AssetDragData = MediaAssetDragData | TextAssetDragData;
