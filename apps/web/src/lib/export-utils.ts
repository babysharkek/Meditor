import { SceneExporter } from "../services/renderer/scene-exporter";
import { buildScene } from "../services/renderer/scene-builder";
import { EditorCore } from "@/core";
import { ExportOptions, ExportResult } from "@/types/export";
import { TimelineTrack, type AudioElement } from "@/types/timeline";
import { MediaAsset } from "@/types/assets";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

async function collectAudioElements({
  tracks,
  mediaAssets,
}: {
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
}): Promise<
  Omit<
    AudioElement,
    "type" | "mediaId" | "volume" | "id" | "name" | "sourceType" | "sourceUrl"
  >[]
> {
  const AudioContextConstructor =
    window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextConstructor();

  const audioElements: Omit<
    AudioElement,
    "type" | "mediaId" | "volume" | "id" | "name" | "sourceType" | "sourceUrl"
  >[] = [];
  const mediaMap = new Map<string, MediaAsset>(
    mediaAssets.map((m) => [m.id, m]),
  );

  for (const track of tracks) {
    if (track.muted) continue;

    for (const element of track.elements) {
      if (element.type !== "audio") continue;

      if (element.duration <= 0) continue;

      try {
        let audioBuffer: AudioBuffer;

        if (element.sourceType === "upload") {
          const asset = mediaMap.get(element.mediaId);
          if (!asset || asset.type !== "audio") continue;

          const arrayBuffer = await asset.file.arrayBuffer();
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

  return audioElements;
}

function mixAudioChannels({
  element,
  outputBuffer,
  outputLength,
  sampleRate,
}: {
  element: Omit<
    AudioElement,
    "type" | "mediaId" | "volume" | "id" | "name" | "sourceType" | "sourceUrl"
  >;
  outputBuffer: AudioBuffer;
  outputLength: number;
  sampleRate: number;
}): void {
  const { buffer, startTime, trimStart, duration: elementDuration } = element;

  const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
  const sourceLengthSamples = Math.floor(elementDuration * buffer.sampleRate);
  const outputStartSample = Math.floor(startTime * sampleRate);

  const resampleRatio = sampleRate / buffer.sampleRate;
  const resampledLength = Math.floor(sourceLengthSamples * resampleRatio);

  const outputChannels = 2;
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

async function createTimelineAudioBuffer({
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
  const AudioContextConstructor =
    window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextConstructor();

  const audioElements = await collectAudioElements({ tracks, mediaAssets });

  if (audioElements.length === 0) return null;

  const outputChannels = 2;
  const outputLength = Math.ceil(duration * sampleRate);
  const outputBuffer = audioContext.createBuffer(
    outputChannels,
    outputLength,
    sampleRate,
  );

  for (const element of audioElements) {
    if (element.muted) continue;

    mixAudioChannels({
      element,
      outputBuffer,
      outputLength,
      sampleRate,
    });
  }

  return outputBuffer;
}

export async function exportProject({
  format,
  quality,
  fps,
  includeAudio,
  onProgress,
  onCancel,
}: ExportOptions): Promise<ExportResult> {
  try {
    const editor = EditorCore.getInstance();
    const activeProject = editor.project.getActive();

    if (!activeProject) {
      return { success: false, error: "No active project" };
    }

    const duration = editor.timeline.getTotalDuration();
    if (duration === 0) {
      return { success: false, error: "Project is empty" };
    }

    const exportFps = fps || activeProject.settings.fps;
    const canvasSize = activeProject.settings.canvasSize;
    const tracks = editor.timeline.getTracks();
    const mediaAssets = editor.media.getAssets();

    let audioBuffer: AudioBuffer | null = null;
    if (includeAudio) {
      onProgress?.({ progress: 0.05 });
      audioBuffer = await createTimelineAudioBuffer({
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
      const adjustedProgress = includeAudio ? 0.05 + progress * 0.95 : progress;
      onProgress?.({ progress: adjustedProgress });
    });

    let isCancelled = false;
    const checkCancel = () => {
      if (onCancel?.()) {
        isCancelled = true;
        exporter.cancel();
      }
    };

    const cancelInterval = setInterval(checkCancel, 100);

    try {
      const buffer = await exporter.export(scene);
      clearInterval(cancelInterval);

      if (isCancelled) {
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

export function getExportMimeType({
  format,
}: {
  format: "mp4" | "webm";
}): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension({
  format,
}: {
  format: "mp4" | "webm";
}): string {
  return `.${format}`;
}
