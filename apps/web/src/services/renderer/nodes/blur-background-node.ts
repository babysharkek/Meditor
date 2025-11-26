import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";

export type BlurBackgroundNodeParams = {
  blurIntensity: number;
  contentNodes: BaseNode[];
};

export class BlurBackgroundNode extends BaseNode<BlurBackgroundNodeParams> {
  private blurIntensity: number;
  private contentNodes: BaseNode[];

  constructor(params: BlurBackgroundNodeParams) {
    super(params);
    this.blurIntensity = params.blurIntensity;
    this.contentNodes = params.contentNodes;
  }

  async render({
    renderer,
    time,
  }: {
    renderer: CanvasRenderer;
    time: number;
  }): Promise<void> {
    let offscreen: OffscreenCanvas | HTMLCanvasElement;
    let offscreenCtx:
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D;

    try {
      offscreen = new OffscreenCanvas(renderer.width, renderer.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get offscreen canvas context");
      }
      offscreenCtx = ctx;
    } catch {
      offscreen = document.createElement("canvas");
      offscreen.width = renderer.width;
      offscreen.height = renderer.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      offscreenCtx = ctx;
    }

    const originalContext = renderer.context;
    renderer.context = offscreenCtx;

    for (const node of this.contentNodes) {
      await node.render({ renderer, time });
    }

    renderer.context = originalContext;

    renderer.context.save();
    renderer.context.filter = `blur(${this.blurIntensity}px)`;

    const scale = Math.max(
      renderer.width / offscreen.width,
      renderer.height / offscreen.height,
    );
    const scaledWidth = offscreen.width * scale;
    const scaledHeight = offscreen.height * scale;
    const x = (renderer.width - scaledWidth) / 2;
    const y = (renderer.height - scaledHeight) / 2;

    if (offscreen instanceof OffscreenCanvas) {
      renderer.context.drawImage(
        offscreen as unknown as CanvasImageSource,
        x,
        y,
        scaledWidth,
        scaledHeight,
      );
    } else {
      renderer.context.drawImage(offscreen, x, y, scaledWidth, scaledHeight);
    }

    renderer.context.restore();
  }
}
