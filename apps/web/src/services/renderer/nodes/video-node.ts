import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from "mediabunny";
import { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";

const VIDEO_EPSILON = 1 / 1000;

export interface BaseMediaNodeParams {
  file: File;
  duration: number;
  timeOffset: number;
  trimStart: number;
  trimEnd: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
}

export type VideoNodeParams = BaseMediaNodeParams;

export class VideoNode extends BaseNode<VideoNodeParams> {
  private sink?: VideoSampleSink;
  private readyPromise: Promise<void>;

  constructor(params: VideoNodeParams) {
    super(params);
    this.readyPromise = this.load();
  }

  private async load() {
    const input = new Input({
      source: new BlobSource(this.params.file),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error("No video track found");
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error("Unable to decode the video track.");
    }

    this.sink = new VideoSampleSink(videoTrack);
  }

  private getVideoTime(time: number) {
    return time - this.params.timeOffset + this.params.trimStart;
  }

  private isInRange(time: number) {
    const videoTime = this.getVideoTime(time);
    return (
      videoTime >= this.params.trimStart - VIDEO_EPSILON &&
      videoTime < this.params.duration - this.params.trimEnd
    );
  }

  async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
    await super.render({ renderer, time });

    if (!this.isInRange(time)) {
      return;
    }

    await this.readyPromise;

    if (!this.sink) {
      throw new Error("Sink not initialized");
    }

    const videoTime = this.getVideoTime(time);
    const sample = await this.sink.getSample(videoTime);

    if (sample) {
      try {
        renderer.context.save();

        if (this.params.opacity !== undefined) {
          renderer.context.globalAlpha = this.params.opacity;
        }

        if (
          this.params.x !== undefined &&
          this.params.y !== undefined &&
          this.params.width !== undefined &&
          this.params.height !== undefined
        ) {
          sample.draw(
            renderer.context,
            this.params.x,
            this.params.y,
            this.params.width,
            this.params.height,
          );
        } else {
          sample.draw(renderer.context, 0, 0, renderer.width, renderer.height);
        }

        renderer.context.restore();
      } finally {
        sample.close();
      }
    }
  }
}
