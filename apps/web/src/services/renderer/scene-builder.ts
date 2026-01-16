import type { TimelineTrack, TimelineElement } from "@/types/timeline";
import { MediaAsset } from "@/types/assets";
import { RootNode } from "./nodes/root-node";
import { VideoNode } from "./nodes/video-node";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { StickerNode } from "./nodes/sticker-node";
import { ColorNode } from "./nodes/color-node";
import { BlurBackgroundNode } from "./nodes/blur-background-node";
import { TBackground, TCanvasSize } from "@/types/project";
import { DEFAULT_BLUR_INTENSITY } from "@/constants/project-constants";
import { canTracktHaveAudio } from "@/lib/timeline";

export type BuildSceneParams = {
  canvasSize: TCanvasSize;
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
  duration: number;
  background: TBackground;
};

export function buildScene(params: BuildSceneParams) {
  const {
    tracks,
    mediaAssets,
    duration,
    canvasSize,
    background
  } = params;

  const rootNode = new RootNode({ duration });
  const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));

  const elements = tracks
    .slice()
    .reverse()
    .filter((track) => !(canTracktHaveAudio(track) && track.muted))
    .flatMap((track): TimelineElement[] => track.elements);

  const contentNodes = [];

  for (const element of elements) {
    if (element.type === "video" || element.type === "image") {
      const mediaAsset = mediaMap.get(element.mediaId);
      if (mediaAsset && mediaAsset.file) {
        if (mediaAsset.type === "video") {
          contentNodes.push(
            new VideoNode({
              file: mediaAsset.file,
              duration: element.duration,
              timeOffset: element.startTime,
              trimStart: element.trimStart,
              trimEnd: element.trimEnd,
            }),
          );
        } else if (mediaAsset.type === "image") {
          contentNodes.push(
            new ImageNode({
              file: mediaAsset.file,
              duration: element.duration,
              timeOffset: element.startTime,
              trimStart: element.trimStart,
              trimEnd: element.trimEnd,
            }),
          );
        }
        // TODO: Add AudioNode for audio files
      }
    }

    if (element.type === "text") {
      contentNodes.push(
        new TextNode({
          ...element,
          canvasCenter: { x: canvasSize.width / 2, y: canvasSize.height / 2 },
          textBaseline: "middle",
        }),
      );
    }

    if (element.type === "sticker") {
      contentNodes.push(
        new StickerNode({
          iconName: element.iconName,
          duration: element.duration,
          timeOffset: element.startTime,
          trimStart: element.trimStart,
          trimEnd: element.trimEnd,
          transform: element.transform,
          opacity: element.opacity,
          color: element.color,
        }),
      );
    }
  }

  if (background.type === "blur") {
    rootNode.add(
      new BlurBackgroundNode({
        blurIntensity: background.blurIntensity ?? DEFAULT_BLUR_INTENSITY,
        contentNodes,
      }),
    );
  } else if (background.type === "color" && background.color !== "transparent") {
    rootNode.add(new ColorNode({ color: background.color }));
  }

  for (const node of contentNodes) {
    rootNode.add(node);
  }

  return rootNode;
}
