import { PlaybackManager } from "./managers/playback-manager";
import { TimelineManager } from "./managers/timeline-manager";
import { SceneManager } from "./managers/scene-manager";
import { ProjectManager } from "./managers/project-manager";
import { MediaManager } from "./managers/media-manager";
import { RendererManager } from "./managers/renderer-manager";
import { CommandManager } from "./managers/commands";
import { buildScene } from "@/services/renderer/scene-builder";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import type { ExportOptions } from "@/types/export";
import { DEFAULT_FPS } from "@/constants/editor-constants";

export class EditorCore {
  private static instance: EditorCore | null = null;

  public readonly command: CommandManager;
  public readonly playback: PlaybackManager;
  public readonly timeline: TimelineManager;
  public readonly scene: SceneManager;
  public readonly project: ProjectManager;
  public readonly media: MediaManager;
  public readonly renderer: RendererManager;

  private constructor() {
    this.command = new CommandManager();
    this.playback = new PlaybackManager(this);
    this.timeline = new TimelineManager(this);
    this.scene = new SceneManager(this);
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
        mediaFiles: this.media.getMediaFiles(),
        duration,
        canvasSize: project.canvasSize,
        backgroundColor: project.backgroundColor,
      });

      const exporter = new SceneExporter({
        width: project.canvasSize.width,
        height: project.canvasSize.height,
        fps: project.fps ?? DEFAULT_FPS,
        format,
        quality,
        includeAudio,
      });

      if (onProgress) {
        exporter.on("progress", onProgress);
      }

      const buffer = await exporter.export(sceneGraph);

      if (onProgress) {
        exporter.off("progress", onProgress);
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
