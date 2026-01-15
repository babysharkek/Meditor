import { PlaybackManager } from "./managers/playback-manager";
import { TimelineManager } from "./managers/timeline-manager";
import { ScenesManager } from "./managers/scenes-manager";
import { ProjectManager } from "./managers/project-manager";
import { MediaManager } from "./managers/media-manager";
import { RendererManager } from "./managers/renderer-manager";
import { CommandManager } from "./managers/commands";
import { buildScene } from "@/services/renderer/scene-builder";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import type { ExportOptions } from "@/types/export";

export class EditorCore {
  private static instance: EditorCore | null = null;

  public readonly command: CommandManager;
  public readonly playback: PlaybackManager;
  public readonly timeline: TimelineManager;
  public readonly scenes: ScenesManager;
  public readonly project: ProjectManager;
  public readonly media: MediaManager;
  public readonly renderer: RendererManager;

  private constructor() {
    this.command = new CommandManager();
    this.playback = new PlaybackManager(this);
    this.timeline = new TimelineManager(this);
    this.scenes = new ScenesManager(this);
    this.project = new ProjectManager(this);
    this.media = new MediaManager(this);
    this.renderer = new RendererManager(this);
  }

  static getInstance(): EditorCore {
    if (!EditorCore.instance) {
      EditorCore.instance = new EditorCore();
    }
    return EditorCore.instance;
  }

  static reset(): void {
    EditorCore.instance = null;
  }

  async export({
    format,
    quality,
    includeAudio = true,
    onProgress,
  }: ExportOptions): Promise<{
    success: boolean;
    buffer?: ArrayBuffer;
    error?: string;
  }> {
    const project = this.project.getActive();
    if (!project) {
      return { success: false, error: "No active project" };
    }

    const duration = this.timeline.getTotalDuration();
    if (duration === 0) {
      return { success: false, error: "Timeline is empty" };
    }

    try {
      const sceneGraph = buildScene({
        tracks: this.timeline.getTracks(),
        mediaAssets: this.media.getAssets(),
        duration,
        canvasSize: project.settings.canvasSize,
        background: project.settings.background,
      });

      const exporter = new SceneExporter({
        width: project.settings.canvasSize.width,
        height: project.settings.canvasSize.height,
        fps: project.settings.fps,
        format,
        quality,
        includeAudio,
      });

      let progressHandler: ((progress: number) => void) | undefined;
      if (onProgress) {
        progressHandler = (progress: number) => onProgress({ progress });
        exporter.on("progress", progressHandler);
      }

      const buffer = await exporter.export(sceneGraph);

      if (progressHandler) {
        exporter.off("progress", progressHandler);
      }

      if (!buffer) {
        return { success: false, error: "Export was cancelled" };
      }

      return { success: true, buffer };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      return { success: false, error: message };
    }
  }
}
