import type { EditorCore } from "@/core";
import type { TScene } from "@/types/project";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import {
  getActiveScene,
  updateSceneInArray,
  getMainScene as getMainSceneUtil,
  ensureMainScene,
  buildDefaultScene,
  canDeleteScene,
  getFallbackSceneAfterDelete,
  normalizeScenes,
  findCurrentScene,
} from "@/lib/scene-utils";
import {
  getFrameTime,
  toggleBookmarkInArray,
  removeBookmarkFromArray,
  isBookmarkAtTime,
} from "@/lib/timeline/bookmark-utils";

export class SceneManager {
  public currentScene: TScene | null = null;
  public scenes: TScene[] = [];
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
    const updatedScenes = [...this.scenes, newScene];

    try {
      await this.updateProjectWithScenes({ updatedScenes });
      return newScene.id;
    } catch (error) {
      console.error("Failed to create scene:", error);
      throw error;
    }
  }

  async deleteScene({ sceneId }: { sceneId: string }): Promise<void> {
    const sceneToDelete = this.scenes.find((s) => s.id === sceneId);

    if (!sceneToDelete) {
      throw new Error("Scene not found");
    }

    const { canDelete, reason } = canDeleteScene({ scene: sceneToDelete });
    if (!canDelete) {
      throw new Error(reason);
    }

    const updatedScenes = this.scenes.filter((s) => s.id !== sceneId);

    const newCurrentScene = getFallbackSceneAfterDelete({
      scenes: updatedScenes,
      deletedSceneId: sceneId,
      currentSceneId: this.currentScene?.id || null,
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: newCurrentScene?.id,
      });

      if (newCurrentScene && newCurrentScene.id !== this.currentScene?.id) {
        const activeProject = this.editor.project.getActive();
        if (activeProject) {
          await this.editor.timeline.loadProjectTimeline({
            projectId: activeProject.id,
            sceneId: newCurrentScene.id,
          });
        }
      }
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
      scenes: this.scenes,
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
    const targetScene = this.scenes.find((s) => s.id === sceneId);

    if (!targetScene) {
      throw new Error("Scene not found");
    }

    const activeProject = this.editor.project.getActive();

    if (activeProject && this.currentScene) {
      await this.editor.timeline.saveProjectTimeline({
        projectId: activeProject.id,
        sceneId: this.currentScene.id,
      });
    }

    if (activeProject) {
      await this.editor.timeline.loadProjectTimeline({
        projectId: activeProject.id,
        sceneId,
      });

      const updatedProject = {
        ...activeProject,
        currentSceneId: sceneId,
        updatedAt: new Date(),
      };

      await storageService.saveProject({ project: updatedProject });
      this.editor.project.setActiveProject({ project: updatedProject });
    }

    this.currentScene = targetScene;
    this.notify();
  }

  async toggleBookmark({ time }: { time: number }): Promise<void> {
    const activeScene = this.getActiveScene();
    if (!activeScene || !this.currentScene) return;

    const activeProject = this.editor.project.getActive();
    if (!activeProject) return;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.fps,
    });

    const bookmarks = activeScene.timeline?.bookmarks || [];
    const updatedBookmarks = toggleBookmarkInArray({
      bookmarks,
      frameTime,
    });

    const updatedScenes = updateSceneInArray({
      scenes: this.scenes,
      sceneId: activeScene.id,
      updates: {
        timeline: {
          ...activeScene.timeline,
          bookmarks: updatedBookmarks,
        },
      },
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: activeScene.id,
        refreshProjectList: true,
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

    if (!activeScene || !this.currentScene || !activeProject) return false;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.fps,
    });
    const bookmarks = activeScene.timeline?.bookmarks || [];

    return isBookmarkAtTime({ bookmarks, frameTime });
  }

  async removeBookmark({ time }: { time: number }): Promise<void> {
    const activeScene = this.getActiveScene();
    if (!activeScene || !this.currentScene) return;

    const activeProject = this.editor.project.getActive();
    if (!activeProject) return;

    const frameTime = getFrameTime({
      time,
      fps: activeProject.fps,
    });
    const bookmarks = activeScene.timeline?.bookmarks || [];

    const updatedBookmarks = removeBookmarkFromArray({
      bookmarks,
      frameTime,
    });

    if (updatedBookmarks.length === bookmarks.length) {
      return;
    }

    const updatedScenes = updateSceneInArray({
      scenes: this.scenes,
      sceneId: activeScene.id,
      updates: {
        timeline: {
          ...activeScene.timeline,
          bookmarks: updatedBookmarks,
        },
      },
    });

    try {
      await this.updateProjectWithScenes({
        updatedScenes,
        updatedSceneId: activeScene.id,
        refreshProjectList: true,
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
      const project = await storageService.loadProject({ id: projectId });
      if (project?.scenes) {
        const normalizedScenes = normalizeScenes({ scenes: project.scenes });
        const currentScene = findCurrentScene({
          scenes: normalizedScenes,
          currentSceneId: project.currentSceneId,
        });

        this.scenes = normalizedScenes;
        this.currentScene = currentScene;
        this.notify();
      }
    } catch (error) {
      console.error("Failed to load project scenes:", error);
      this.scenes = [];
      this.currentScene = null;
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

    const fallbackScene = getMainSceneUtil({ scenes: ensuredScenes });

    this.scenes = ensuredScenes;
    this.currentScene = currentScene || fallbackScene;
    this.notify();

    if (ensuredScenes.length > scenes.length) {
      const activeProject = this.editor.project.getActive();

      if (activeProject) {
        const updatedProject = {
          ...activeProject,
          scenes: ensuredScenes,
          updatedAt: new Date(),
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
    this.scenes = [];
    this.currentScene = null;
    this.notify();
  }

  getMainScene(): TScene | null {
    return getMainSceneUtil({ scenes: this.scenes });
  }

  getCurrentScene(): TScene | null {
    return this.currentScene;
  }

  getActiveScene(): TScene | null {
    return getActiveScene({
      scenes: this.scenes,
      currentSceneId: this.currentScene?.id || "",
    });
  }

  getScenes(): TScene[] {
    return this.scenes;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  private async updateProjectWithScenes({
    updatedScenes,
    updatedSceneId,
    refreshProjectList = false,
  }: {
    updatedScenes: TScene[];
    updatedSceneId?: string;
    refreshProjectList?: boolean;
  }): Promise<void> {
    const activeProject = this.editor.project.getActive();

    if (!activeProject) {
      throw new Error("No active project");
    }

    const updatedScene = updatedSceneId
      ? updatedScenes.find((s) => s.id === updatedSceneId)
      : this.currentScene;

    const updatedProject = {
      ...activeProject,
      scenes: updatedScenes,
      updatedAt: new Date(),
    };

    await storageService.saveProject({ project: updatedProject });
    this.editor.project.setActiveProject({ project: updatedProject });
    this.scenes = updatedScenes;
    this.currentScene = updatedScene || null;
    this.notify();

    if (refreshProjectList) {
      await this.editor.project.loadAllProjects();
    }
  }
}
