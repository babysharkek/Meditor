import type { EditorCore } from "@/core";
import type { TScene } from "@/types/timeline";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import {
  updateSceneInArray,
  getMainScene,
  ensureMainScene,
  buildDefaultScene,
  canDeleteScene,
  getFallbackSceneAfterDelete,
  findCurrentScene,
} from "@/lib/scene-utils";
import {
  getFrameTime,
  toggleBookmarkInArray,
  removeBookmarkFromArray,
  isBookmarkAtTime,
} from "@/lib/timeline/bookmark-utils";

export class ScenesManager {
  private active: TScene | null = null;
  private list: TScene[] = [];
  private listeners = new Set<() => void>();

  constructor(private editor: EditorCore) {}

  async createScene({
    name,
    isMain = false,
  }: {
    name: string;
    isMain: boolean;
  }): Promise<string> {
    const newScene = buildDefaultScene({ name, isMain });
    const updatedScenes = [...this.list, newScene];

    try {
      await this.updateProjectWithScenes({ updatedScenes });
      return newScene.id;
    } catch (error) {
      console.error("Failed to create scene:", error);
      throw error;
    }
  }

  async deleteScene({ sceneId }: { sceneId: string }): Promise<void> {
    const sceneToDelete = this.list.find((s) => s.id === sceneId);

    if (!sceneToDelete) {
      throw new Error("Scene not found");
    }

    const { canDelete, reason } = canDeleteScene({ scene: sceneToDelete });
    if (!canDelete) {
      throw new Error(reason);
    }

    const updatedScenes = this.list.filter((s) => s.id !== sceneId);

    const newCurrentScene = getFallbackSceneAfterDelete({
      scenes: updatedScenes,
      deletedSceneId: sceneId,
      currentSceneId: this.active?.id || null,
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: newCurrentScene?.id,
      });
    } catch (error) {
      console.error("Failed to delete scene:", error);
      throw error;
    }
  }

  async renameScene({
    sceneId,
    name,
  }: {
    sceneId: string;
    name: string;
  }): Promise<void> {
    const updatedScenes = updateSceneInArray({
      scenes: this.list,
      sceneId,
      updates: { name, updatedAt: new Date() },
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: sceneId,
      });
    } catch (error) {
      console.error("Failed to rename scene:", error);
      throw error;
    }
  }

  async switchToScene({ sceneId }: { sceneId: string }): Promise<void> {
    const targetScene = this.list.find((s) => s.id === sceneId);

    if (!targetScene) {
      throw new Error("Scene not found");
    }

    const activeProject = this.editor.project.getActive();

    if (activeProject) {
      const updatedProject = {
        ...activeProject,
        currentSceneId: sceneId,
        metadata: {
          ...activeProject.metadata,
          updatedAt: new Date(),
        },
      };

      await storageService.saveProject({ project: updatedProject });
      this.editor.project.setActiveProject({ project: updatedProject });
    }

    this.active = targetScene;
    this.notify();
  }

  async toggleBookmark({ time }: { time: number }): Promise<void> {
    const activeScene = this.getActiveScene();
    if (!activeScene || !this.active) return;

    const activeProject = this.editor.project.getActive();
    if (!activeProject) return;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.settings.fps,
    });

    const updatedBookmarks = toggleBookmarkInArray({
      bookmarks: activeScene.bookmarks,
      frameTime,
    });

    const updatedScenes = updateSceneInArray({
      scenes: this.list,
      sceneId: activeScene.id,
      updates: { bookmarks: updatedBookmarks },
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: activeScene.id,
      });
    } catch (error) {
      console.error("Failed to update scene bookmarks:", error);
      toast.error("Failed to update bookmarks", {
        description: "Please try again",
      });
    }
  }

  isBookmarked({ time }: { time: number }): boolean {
    const activeScene = this.getActiveScene();
    const activeProject = this.editor.project.getActive();

    if (!activeScene || !this.active || !activeProject) return false;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.settings.fps,
    });

    return isBookmarkAtTime({ bookmarks: activeScene.bookmarks, frameTime });
  }

  async removeBookmark({ time }: { time: number }): Promise<void> {
    const activeScene = this.getActiveScene();
    if (!activeScene || !this.active) return;

    const activeProject = this.editor.project.getActive();
    if (!activeProject) return;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.settings.fps,
    });

    const updatedBookmarks = removeBookmarkFromArray({
      bookmarks: activeScene.bookmarks,
      frameTime,
    });

    if (updatedBookmarks.length === activeScene.bookmarks.length) {
      return;
    }

    const updatedScenes = updateSceneInArray({
      scenes: this.list,
      sceneId: activeScene.id,
      updates: { bookmarks: updatedBookmarks },
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: activeScene.id,
      });
    } catch (error) {
      console.error("Failed to update scene bookmarks:", error);
      toast.error("Failed to remove bookmark", {
        description: "Please try again",
      });
    }
  }

  async loadProjectScenes({ projectId }: { projectId: string }): Promise<void> {
    try {
      const result = await storageService.loadProject({ id: projectId });
      if (result?.project.scenes) {
        const currentScene = findCurrentScene({
          scenes: result.project.scenes,
          currentSceneId: result.project.currentSceneId,
        });

        this.list = result.project.scenes;
        this.active = currentScene;
        this.notify();
      }
    } catch (error) {
      console.error("Failed to load project scenes:", error);
      this.list = [];
      this.active = null;
      this.notify();
    }
  }

  initializeScenes({
    scenes,
    currentSceneId,
  }: {
    scenes: TScene[];
    currentSceneId?: string;
  }): void {
    const ensuredScenes = ensureMainScene({ scenes });
    const currentScene = currentSceneId
      ? ensuredScenes.find((s) => s.id === currentSceneId)
      : null;

    const fallbackScene = getMainScene({ scenes: ensuredScenes });

    this.list = ensuredScenes;
    this.active = currentScene || fallbackScene;
    this.notify();

    if (ensuredScenes.length > scenes.length) {
      const activeProject = this.editor.project.getActive();

      if (activeProject) {
        const updatedProject = {
          ...activeProject,
          scenes: ensuredScenes,
          metadata: {
            ...activeProject.metadata,
            updatedAt: new Date(),
          },
        };

        storageService
          .saveProject({ project: updatedProject })
          .then(() => {
            this.editor.project.setActiveProject({ project: updatedProject });
          })
          .catch((error) => {
            console.error(
              "Failed to save project with background scene:",
              error,
            );
          });
      }
    }
  }

  clearScenes(): void {
    this.list = [];
    this.active = null;
    this.notify();
  }

  getActiveScene(): TScene {
    if (!this.active) {
      throw new Error("No active scene.");
    }
    return this.active;
  }

  getScenes(): TScene[] {
    return this.list;
  }

  setScenes({
    scenes,
    activeSceneId,
  }: {
    scenes: TScene[];
    activeSceneId?: string;
  }): void {
    this.list = scenes;
    this.active = activeSceneId
      ? (scenes.find((s) => s.id === activeSceneId) ?? null)
      : this.active;
    this.notify();

    const activeProject = this.editor.project.getActive();
    if (activeProject) {
      const updatedProject = {
        ...activeProject,
        scenes,
        metadata: {
          ...activeProject.metadata,
          updatedAt: new Date(),
        },
      };
      storageService.saveProject({ project: updatedProject }).catch((error) => {
        console.error("Failed to persist scenes:", error);
      });
      this.editor.project.setActiveProject({ project: updatedProject });
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  updateSceneTracks({
    tracks,
  }: {
    tracks: import("@/types/timeline").TimelineTrack[];
  }): void {
    if (!this.active) return;

    const updatedScene: TScene = {
      ...this.active,
      tracks,
      updatedAt: new Date(),
    };

    this.list = this.list.map((s) =>
      s.id === this.active?.id ? updatedScene : s,
    );
    this.active = updatedScene;
    this.notify();

    const activeProject = this.editor.project.getActive();
    if (activeProject) {
      const updatedProject = {
        ...activeProject,
        scenes: this.list,
        metadata: {
          ...activeProject.metadata,
          updatedAt: new Date(),
        },
      };
      this.editor.project.setActiveProject({ project: updatedProject });
    }
  }

  private async updateProjectWithScenes({
    updatedScenes,
    updatedSceneId,
  }: {
    updatedScenes: TScene[];
    updatedSceneId?: string;
  }): Promise<void> {
    const activeProject = this.editor.project.getActive();

    if (!activeProject) {
      throw new Error("No active project");
    }

    const updatedScene = updatedSceneId
      ? updatedScenes.find((s) => s.id === updatedSceneId)
      : this.active;

    const updatedProject = {
      ...activeProject,
      scenes: updatedScenes,
      metadata: {
        ...activeProject.metadata,
        updatedAt: new Date(),
      },
    };

    await storageService.saveProject({ project: updatedProject });
    this.editor.project.setActiveProject({ project: updatedProject });
    this.list = updatedScenes;
    this.active = updatedScene || null;
    this.notify();
  }
}
