import { type TimelineTrack } from "@/types/timeline";
import { type MediaFile } from "@/types/media";
import { RootNode } from "./nodes/root-node";
import { VideoNode } from "./nodes/video-node";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { ColorNode } from "./nodes/color-node";
import { BlurBackgroundNode } from "./nodes/blur-background-node";
import { TBackgroundType } from "@/types/project";
import { DEFAULT_BLUR_INTENSITY } from "@/constants/editor-constants";

export type BuildSceneParams = {
  canvasSize: { width: number; height: number };
  tracks: TimelineTrack[];
  mediaFiles: MediaFile[];
  duration: number;
  backgroundColor?: string;
  backgroundType?: TBackgroundType;
  blurIntensity?: number;
};

export function buildScene(params: BuildSceneParams) {
  const {
    tracks,
    mediaFiles,
    duration,
    canvasSize,
    backgroundColor,
    backgroundType,
    blurIntensity,
  } = params;

  const rootNode = new RootNode({ duration });
  const mediaMap = new Map(mediaFiles.map((m) => [m.id, m]));

  const elements = tracks
    .slice()
    .reverse()
    .filter((track) => !track.muted)
    .flatMap((track) => track.elements);

  const contentNodes = [];

  for (const element of elements) {
    if (element.type === "media") {
      const media = mediaMap.get(element.mediaId);
      if (media && media.file) {
        if (media.type === "video") {
          contentNodes.push(
            new VideoNode({
              file: media.file,
              duration: element.duration,
              timeOffset: element.startTime,
              trimStart: element.trimStart,
              trimEnd: element.trimEnd,
            }),
          );
        } else if (media.type === "image") {
          contentNodes.push(
            new ImageNode({
              file: media.file,
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
      const textElement = element;
      contentNodes.push(
        new TextNode({
          ...textElement,
          x: textElement.x + canvasSize.width / 2,
          y: textElement.y + canvasSize.height / 2,
          textBaseline: "middle",
        }),
      );
    }
  }

  if (backgroundType === "blur") {
    rootNode.add(
      new BlurBackgroundNode({
        blurIntensity: blurIntensity ?? DEFAULT_BLUR_INTENSITY,
        contentNodes,
      }),
    );
  } else if (backgroundColor && backgroundColor !== "transparent") {
    rootNode.add(new ColorNode({ color: backgroundColor }));
  }

  for (const node of contentNodes) {
    rootNode.add(node);
  }

  return rootNode;
}
