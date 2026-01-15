import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/types/export";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { buildScene } from "@/services/renderer/scene-builder";

interface AudioElement {
  buffer: AudioBuffer;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  muted: boolean;
}

export class RendererManager {
  private renderTree: RootNode | null = null;
  private listeners = new Set<() => void>();

  constructor(private editor: EditorCore) {}

  setRenderTree({ renderTree }: { renderTree: RootNode | null }): void {
    this.renderTree = renderTree;
    this.notify();
  }

  getRenderTree(): RootNode | null {
    return this.renderTree;
  }

  async exportProject({
    options,
  }: {
    options: ExportOptions;
  }): Promise<ExportResult> {
    const { format, quality, fps, includeAudio, onProgress, onCancel } =
      options;

    try {
      const tracks = this.editor.timeline.getTracks();
      const mediaAssets = this.editor.media.getAssets();
      const activeProject = this.editor.project.getActive();

      if (!activeProject) {
        return { success: false, error: "No active project" };
      }

      const duration = this.editor.timeline.getTotalDuration();
      if (duration === 0) {
        return { success: false, error: "Project is empty" };
      }

      const exportFps = fps || activeProject.settings.fps;
      const canvasSize = activeProject.settings.canvasSize;

      let audioBuffer: AudioBuffer | null = null;
      if (includeAudio) {
        onProgress?.({ progress: 0.05 });
        audioBuffer = await this.createTimelineAudioBuffer({
          tracks,
          mediaAssets,
          duration,
        });
      }

      const scene = buildScene({
        tracks,
        mediaAssets,
        duration,
        canvasSize,
        background: activeProject.settings.background,
      });

      const exporter = new SceneExporter({
        width: canvasSize.width,
        height: canvasSize.height,
        fps: exportFps,
        format,
        quality,
        includeAudio: !!includeAudio,
        audioBuffer: audioBuffer || undefined,
      });

      exporter.on("progress", (progress) => {
        const adjustedProgress = includeAudio
          ? 0.05 + progress * 0.95
          : progress;
        onProgress?.({ progress: adjustedProgress });
      });

      let cancelled = false;
      const checkCancel = () => {
        if (onCancel?.()) {
          cancelled = true;
          exporter.cancel();
        }
      };

      const cancelInterval = setInterval(checkCancel, 100);

      try {
        const buffer = await exporter.export(scene);
        clearInterval(cancelInterval);

        if (cancelled) {
          return { success: false, cancelled: true };
        }

        if (!buffer) {
          return { success: false, error: "Export failed to produce buffer" };
        }

        return {
          success: true,
          buffer,
        };
      } finally {
        clearInterval(cancelInterval);
      }
    } catch (error) {
      console.error("Export failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown export error",
      };
    }
  }

  private async createTimelineAudioBuffer({
    tracks,
    mediaAssets,
    duration,
    sampleRate = 44100,
  }: {
    tracks: TimelineTrack[];
    mediaAssets: MediaAsset[];
    duration: number;
    sampleRate?: number;
  }): Promise<AudioBuffer | null> {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();

    const audioElements: AudioElement[] = [];
    const mediaMap = new Map<string, MediaAsset>(
      mediaAssets.map((m) => [m.id, m]),
    );

    for (const track of tracks) {
      if (track.muted) continue;

      for (const element of track.elements) {
        if (element.type !== "audio") {
          continue;
        }

        if (element.duration <= 0) continue;

        try {
          let audioBuffer: AudioBuffer;

          if (element.sourceType === "upload") {
            const mediaAsset = mediaMap.get(element.mediaId);
            if (!mediaAsset || mediaAsset.type !== "audio") {
              continue;
            }

            const arrayBuffer = await mediaAsset.file.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(
              arrayBuffer.slice(0),
            );
          } else {
            // library audio - already has decoded buffer
            audioBuffer = element.buffer;
          }

          audioElements.push({
            buffer: audioBuffer,
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            muted: element.muted || track.muted || false,
          });
        } catch (error) {
          console.warn("Failed to decode audio:", error);
        }
      }
    }

    if (audioElements.length === 0) {
      return null;
    }

    const outputChannels = 2;
    const outputLength = Math.ceil(duration * sampleRate);
    const outputBuffer = audioContext.createBuffer(
      outputChannels,
      outputLength,
      sampleRate,
    );

    for (const element of audioElements) {
      if (element.muted) continue;

      const {
        buffer,
        startTime,
        trimStart,
        duration: elementDuration,
      } = element;

      const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
      const sourceLengthSamples = Math.floor(
        elementDuration * buffer.sampleRate,
      );
      const outputStartSample = Math.floor(startTime * sampleRate);

      const resampleRatio = sampleRate / buffer.sampleRate;
      const resampledLength = Math.floor(sourceLengthSamples * resampleRatio);

      for (let channel = 0; channel < outputChannels; channel++) {
        const outputData = outputBuffer.getChannelData(channel);
        const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
        const sourceData = buffer.getChannelData(sourceChannel);

        for (let i = 0; i < resampledLength; i++) {
          const outputIndex = outputStartSample + i;
          if (outputIndex >= outputLength) break;

          const sourceIndex = sourceStartSample + Math.floor(i / resampleRatio);
          if (sourceIndex >= sourceData.length) break;

          outputData[outputIndex] += sourceData[sourceIndex];
        }
      }
    }

    return outputBuffer;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
