import { SceneExporter } from "../services/renderer/scene-exporter";
import { buildScene } from "../services/renderer/scene-builder";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/constants/editor-constants";
import { ExportOptions, ExportResult } from "@/types/export";
import { TimelineTrack } from "@/types/timeline";
import { MediaFile } from "@/types/media";

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

async function createTimelineAudioBuffer(
  tracks: TimelineTrack[],
  mediaFiles: MediaFile[],
  duration: number,
  sampleRate: number = 44100,
): Promise<AudioBuffer | null> {
  // Get Web Audio context
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  // Collect all audio elements from timeline
  const audioElements: AudioElement[] = [];
  const mediaMap = new Map<string, MediaFile>(mediaFiles.map((m) => [m.id, m]));

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
        // Decode audio file
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
    return null; // No audio to mix
  }

  // Create output buffer
  const outputChannels = 2; // Stereo
  const outputLength = Math.ceil(duration * sampleRate);
  const outputBuffer = audioContext.createBuffer(
    outputChannels,
    outputLength,
    sampleRate,
  );

  // Mix all audio elements
  for (const element of audioElements) {
    if (element.muted) continue;

    const {
      buffer,
      startTime,
      trimStart,
      trimEnd,
      duration: elementDuration,
    } = element;

    // Calculate timing
    const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
    const sourceDuration = elementDuration - trimStart - trimEnd;
    const sourceLengthSamples = Math.floor(sourceDuration * buffer.sampleRate);
    const outputStartSample = Math.floor(startTime * sampleRate);

    // Resample if needed (simple approach)
    const resampleRatio = sampleRate / buffer.sampleRate;
    const resampledLength = Math.floor(sourceLengthSamples * resampleRatio);

    // Mix each channel
    for (let channel = 0; channel < outputChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
      const sourceData = buffer.getChannelData(sourceChannel);

      for (let i = 0; i < resampledLength; i++) {
        const outputIndex = outputStartSample + i;
        if (outputIndex >= outputLength) break;

        // Simple resampling (could be improved with proper interpolation)
        const sourceIndex = sourceStartSample + Math.floor(i / resampleRatio);
        if (sourceIndex >= sourceData.length) break;

        outputData[outputIndex] += sourceData[sourceIndex];
      }
    }
  }

  return outputBuffer;
}

export async function exportProject(
  options: ExportOptions,
): Promise<ExportResult> {
  const { format, quality, fps, includeAudio, onProgress, onCancel } = options;

  try {
    const timelineStore = useTimelineStore.getState();
    const mediaStore = useMediaStore.getState();
    const projectStore = useProjectStore.getState();

    const { tracks, getTotalDuration } = timelineStore;
    const { mediaFiles } = mediaStore;
    const { activeProject } = projectStore;

    if (!activeProject) {
      return { success: false, error: "No active project" };
    }

    const duration = getTotalDuration();
    if (duration === 0) {
      return { success: false, error: "Project is empty" };
    }

    const exportFps = fps || activeProject.fps || DEFAULT_FPS;
    const canvasSize = activeProject.canvasSize || DEFAULT_CANVAS_SIZE;
 
    // Create audio buffer if needed
    let audioBuffer: AudioBuffer | null = null;
    if (includeAudio) {
      onProgress?.(0.05); // 5% for audio processing
      audioBuffer = await createTimelineAudioBuffer(
        tracks,
        mediaFiles,
        duration,
      );
    }

    // Build the scene using the new node system
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

    // Create the exporter
    const exporter = new SceneExporter({
      width: canvasSize.width,
      height: canvasSize.height,
      fps: exportFps,
      format,
      quality,
      includeAudio: !!includeAudio,
      audioBuffer: audioBuffer || undefined,
    });

    // Set up progress tracking
    exporter.on("progress", (progress) => {
      const adjustedProgress = includeAudio ? 0.05 + progress * 0.95 : progress;
      onProgress?.(adjustedProgress);
    });

    // Set up cancellation
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

export function getExportMimeType(format: "mp4" | "webm"): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension(format: "mp4" | "webm"): string {
  return `.${format}`;
}
