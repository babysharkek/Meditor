import { create } from "zustand";
import { TScene } from "@/types/project";
import { useProjectStore } from "./project-store";
import { useTimelineStore } from "./timeline-store";
import { storageService } from "@/lib/storage/storage-service";
import {
  getActiveScene,
  updateSceneInArray,
  getMainScene as getMainSceneUtil,
  ensureMainScene,
  createScene as createSceneUtil,
  canDeleteScene,
  getFallbackSceneAfterDelete,
  normalizeScenes,
  findCurrentScene,
} from "@/lib/scene-utils";
import { toast } from "sonner";
import {
  getFrameTime,
  toggleBookmarkInArray,
  removeBookmarkFromArray,
  isBookmarkAtTime,
} from "@/lib/timeline/bookmark-utils";

interface SceneStore {
  currentScene: TScene | null;
  scenes: TScene[];
  activeScene: TScene | null;
  createScene: ({
    name,
    isMain,
  }: {
    name: string;
    isMain: boolean;
  }) => Promise<string>;
  deleteScene: ({ sceneId }: { sceneId: string }) => Promise<void>;
  renameScene: ({
    sceneId,
    name,
  }: {
    sceneId: string;
    name: string;
  }) => Promise<void>;
  switchToScene: ({ sceneId }: { sceneId: string }) => Promise<void>;
  toggleBookmark: ({ time }: { time: number }) => Promise<void>;
  isBookmarked: ({ time }: { time: number }) => boolean;
  removeBookmark: ({ time }: { time: number }) => Promise<void>;
  loadProjectScenes: ({ projectId }: { projectId: string }) => Promise<void>;
  initializeScenes: ({
    scenes,
    currentSceneId,
  }: {
    scenes: TScene[];
    currentSceneId?: string;
  }) => void;
  clearScenes: () => void;
}

export const useSceneStore = create<SceneStore>((set, get) => {
  const updateProjectWithScenes = async ({
    updatedScenes,
    updatedSceneId,
    refreshProjectList = false,
  }: {
    updatedScenes: TScene[];
    updatedSceneId?: string;
    refreshProjectList?: boolean;
  }) => {
    const projectStore = useProjectStore.getState();
    const { activeProject } = projectStore;

    if (!activeProject) {
      throw new Error("No active project");
    }

    const updatedScene = updatedSceneId
      ? updatedScenes.find((s) => s.id === updatedSceneId)
      : get().currentScene;

    const updatedProject = {
      ...activeProject,
      scenes: updatedScenes,
      updatedAt: new Date(),
    };

    await storageService.saveProject({ project: updatedProject });
    useProjectStore.setState({ activeProject: updatedProject });
    set({ scenes: updatedScenes, currentScene: updatedScene || null });

    if (refreshProjectList) {
      await projectStore.loadAllProjects();
    }
  };

  return {
    currentScene: null,
    scenes: [],
    get activeScene(): TScene | null {
      const { scenes, currentScene } = get();
      return getActiveScene({
        scenes,
        currentSceneId: currentScene?.id || "",
      });
    },

    createScene: async ({ name, isMain = false }) => {
      const { scenes } = get();

      const newScene = createSceneUtil({ name, isMain });
      const updatedScenes = [...scenes, newScene];

      try {
        await updateProjectWithScenes({ updatedScenes });
        return newScene.id;
      } catch (error) {
        console.error("Failed to create scene:", error);
        throw error;
      }
    },

    deleteScene: async ({ sceneId }: { sceneId: string }) => {
      const { scenes, currentScene } = get();
      const sceneToDelete = scenes.find((s) => s.id === sceneId);

      if (!sceneToDelete) {
        throw new Error("Scene not found");
      }

      const { canDelete, reason } = canDeleteScene({ scene: sceneToDelete });
      if (!canDelete) {
        throw new Error(reason);
      }

      const updatedScenes = scenes.filter((s) => s.id !== sceneId);

      const newCurrentScene = getFallbackSceneAfterDelete({
        scenes: updatedScenes,
        deletedSceneId: sceneId,
        currentSceneId: currentScene?.id || null,
      });

      try {
        await updateProjectWithScenes({
          updatedScenes,
          updatedSceneId: newCurrentScene?.id,
        });

        if (newCurrentScene && newCurrentScene.id !== currentScene?.id) {
          const timelineStore = useTimelineStore.getState();
          const projectStore = useProjectStore.getState();
          const { activeProject } = projectStore;
          if (activeProject) {
            await timelineStore.loadProjectTimeline({
              projectId: activeProject.id,
              sceneId: newCurrentScene.id,
            });
          }
        }
      } catch (error) {
        console.error("Failed to delete scene:", error);
        throw error;
      }
    },

    renameScene: async ({
      sceneId,
      name,
    }: {
      sceneId: string;
      name: string;
    }) => {
      const { scenes } = get();
      const updatedScenes = updateSceneInArray({
        scenes,
        sceneId,
        updates: { name, updatedAt: new Date() },
      });

      try {
        await updateProjectWithScenes({
          updatedScenes,
          updatedSceneId: sceneId,
        });
      } catch (error) {
        console.error("Failed to rename scene:", error);
        throw error;
      }
    },

    switchToScene: async ({ sceneId }: { sceneId: string }) => {
      const { scenes } = get();
      const targetScene = scenes.find((s) => s.id === sceneId);

      if (!targetScene) {
        throw new Error("Scene not found");
      }

      const timelineStore = useTimelineStore.getState();
      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;
      const { currentScene } = get();

      if (activeProject && currentScene) {
        await timelineStore.saveProjectTimeline({
          projectId: activeProject.id,
          sceneId: currentScene.id,
        });
      }

      if (activeProject) {
        await timelineStore.loadProjectTimeline({
          projectId: activeProject.id,
          sceneId,
        });

        const updatedProject = {
          ...activeProject,
          currentSceneId: sceneId,
          updatedAt: new Date(),
        };

        await storageService.saveProject({ project: updatedProject });
        useProjectStore.setState({ activeProject: updatedProject });
      }

      set({ currentScene: targetScene });
    },

    toggleBookmark: async ({ time }: { time: number }) => {
      const { activeScene, scenes, currentScene } = get();
      if (!activeScene || !currentScene) return;

      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;
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
        scenes,
        sceneId: activeScene.id,
        updates: {
          timeline: {
            ...activeScene.timeline,
            bookmarks: updatedBookmarks,
          },
        },
      });

      try {
        await updateProjectWithScenes({
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
    },

    isBookmarked: ({ time }: { time: number }) => {
      const { activeScene, currentScene } = get();
      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;

      if (!activeScene || !currentScene || !activeProject) return false;

      const frameTime = getFrameTime({
        time,
        fps: activeProject.fps,
      });
      const bookmarks = activeScene.timeline?.bookmarks || [];

      return isBookmarkAtTime({ bookmarks, frameTime });
    },

    removeBookmark: async ({ time }: { time: number }) => {
      const { activeScene, scenes, currentScene } = get();
      if (!activeScene || !currentScene) return;

      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;
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
        scenes,
        sceneId: activeScene.id,
        updates: {
          timeline: {
            ...activeScene.timeline,
            bookmarks: updatedBookmarks,
          },
        },
      });

      try {
        await updateProjectWithScenes({
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
    },

    getMainScene: () => {
      const { scenes } = get();
      return getMainSceneUtil({ scenes });
    },

    getCurrentScene: () => {
      return get().currentScene;
    },

    loadProjectScenes: async ({ projectId }: { projectId: string }) => {
      try {
        const project = await storageService.loadProject({ id: projectId });
        if (project?.scenes) {
          const normalizedScenes = normalizeScenes({ scenes: project.scenes });
          const currentScene = findCurrentScene({
            scenes: normalizedScenes,
            currentSceneId: project.currentSceneId,
          });

          set({
            scenes: normalizedScenes,
            currentScene,
          });
        }
      } catch (error) {
        console.error("Failed to load project scenes:", error);
        set({ scenes: [], currentScene: null });
      }
    },

    initializeScenes: ({
      scenes,
      currentSceneId,
    }: {
      scenes: TScene[];
      currentSceneId?: string;
    }) => {
      const ensuredScenes = ensureMainScene({ scenes });
      const currentScene = currentSceneId
        ? ensuredScenes.find((s) => s.id === currentSceneId)
        : null;

      const fallbackScene = getMainSceneUtil({ scenes: ensuredScenes });

      set({
        scenes: ensuredScenes,
        currentScene: currentScene || fallbackScene,
      });

      if (ensuredScenes.length > scenes.length) {
        const projectStore = useProjectStore.getState();
        const { activeProject } = projectStore;

        if (activeProject) {
          const updatedProject = {
            ...activeProject,
            scenes: ensuredScenes,
            updatedAt: new Date(),
          };

          storageService
            .saveProject({ project: updatedProject })
            .then(() => {
              useProjectStore.setState({ activeProject: updatedProject });
            })
            .catch((error) => {
              console.error(
                "Failed to save project with background scene:",
                error,
              );
            });
        }
      }
    },

    clearScenes: () => {
      set({
        scenes: [],
        currentScene: null,
      });
    },
  };
});
