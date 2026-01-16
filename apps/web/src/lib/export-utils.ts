import { SceneExporter } from "../services/renderer/scene-exporter";
import { buildScene } from "../services/renderer/scene-builder";
import { EditorCore } from "@/core";
import { ExportOptions, ExportResult } from "@/types/export";
import { createTimelineAudioBuffer } from "@/lib/audio-utils";

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
