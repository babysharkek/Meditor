import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/types/export";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaFile } from "@/types/media";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { buildScene } from "@/services/renderer/scene-builder";
import { DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/constants/editor-constants";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "mp4",
  quality: "high",
  includeAudio: true,
};

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
      const mediaFiles = this.editor.media.getMediaFiles();
      const activeProject = this.editor.project.getActive();

      if (!activeProject) {
        return { success: false, error: "No active project" };
      }

      const duration = this.editor.timeline.getTotalDuration();
      if (duration === 0) {
        return { success: false, error: "Project is empty" };
      }

      const exportFps = fps || activeProject.fps || DEFAULT_FPS;
      const canvasSize = activeProject.canvasSize || DEFAULT_CANVAS_SIZE;

      let audioBuffer: AudioBuffer | null = null;
      if (includeAudio) {
        onProgress?.(0.05);
        audioBuffer = await this.createTimelineAudioBuffer({
          tracks,
          mediaFiles,
          duration,
        });
      }

      const scene = buildScene({
        tracks,
        mediaFiles,
        duration,
        canvasSize,
        backgroundColor:
          activeProject.backgroundType === "blur"
            ? "transparent"
            : activeProject.backgroundColor || "#000000",
        backgroundType: activeProject.backgroundType,
        blurIntensity: activeProject.blurIntensity,
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
        onProgress?.(adjustedProgress);
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
    mediaFiles,
    duration,
    sampleRate = 44100,
  }: {
    tracks: TimelineTrack[];
    mediaFiles: MediaFile[];
    duration: number;
    sampleRate?: number;
  }): Promise<AudioBuffer | null> {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();

    const audioElements: AudioElement[] = [];
    const mediaMap = new Map<string, MediaFile>(
      mediaFiles.map((m) => [m.id, m]),
    );

    for (const track of tracks) {
      if (track.muted) continue;

      for (const element of track.elements) {
        if (element.type !== "media") continue;

        const mediaElement = element;
        const mediaItem = mediaMap.get(mediaElement.mediaId);
        if (!mediaItem || mediaItem.type !== "audio") continue;

        const visibleDuration =
          mediaElement.duration - mediaElement.trimStart - mediaElement.trimEnd;
        if (visibleDuration <= 0) continue;

        try {
          const arrayBuffer = await mediaItem.file.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(
            arrayBuffer.slice(0),
          );

          audioElements.push({
            buffer: audioBuffer,
            startTime: mediaElement.startTime,
            duration: mediaElement.duration,
            trimStart: mediaElement.trimStart,
            trimEnd: mediaElement.trimEnd,
            muted: mediaElement.muted || track.muted || false,
          });
        } catch (error) {
          console.warn(`Failed to decode audio file ${mediaItem.name}:`, error);
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
        trimEnd,
        duration: elementDuration,
      } = element;

      const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
      const sourceDuration = elementDuration - trimStart - trimEnd;
      const sourceLengthSamples = Math.floor(
        sourceDuration * buffer.sampleRate,
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
