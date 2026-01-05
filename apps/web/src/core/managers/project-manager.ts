import type { EditorCore } from "@/core";
import type { TProject } from "@/types/project";
import type { TCanvasSize } from "@/types/editor";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { generateUUID } from "@/lib/utils";
import {
  DEFAULT_FPS,
  DEFAULT_CANVAS_SIZE,
  DEFAULT_BLUR_INTENSITY,
} from "@/constants/editor-constants";
import { buildDefaultScene } from "@/lib/scene-utils";
import { generateThumbnail } from "@/lib/media-processing-utils";

export class ProjectManager {
  public activeProject: TProject | null = null;
  public savedProjects: TProject[] = [];
  public isLoading = true;
  public isInitialized = false;
  private invalidProjectIds = new Set<string>();
  private listeners = new Set<() => void>();

  constructor(private editor: EditorCore) {}

  async createNewProject({ name }: { name: string }): Promise<string> {
    const mainScene = buildDefaultScene({ name: "Main scene", isMain: true });
    const newProject: TProject = {
      id: generateUUID(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      scenes: [mainScene],
      currentSceneId: mainScene.id,
      backgroundColor: "#000000",
      backgroundType: "color",
      blurIntensity: DEFAULT_BLUR_INTENSITY,
      fps: DEFAULT_FPS,
      canvasSize: DEFAULT_CANVAS_SIZE,
    };

    this.activeProject = newProject;
    this.notify();

    this.editor.media.clearAllMedia();
    this.editor.timeline.clearTimeline();
    this.editor.scene.initializeScenes({
      scenes: newProject.scenes,
      currentSceneId: newProject.currentSceneId,
    });

    try {
      await storageService.saveProject({ project: newProject });
      await this.loadAllProjects();
      return newProject.id;
    } catch (error) {
      toast.error("Failed to save new project");
      throw error;
    }
  }

  async loadProject({ id }: { id: string }): Promise<void> {
    if (!this.isInitialized) {
      this.isLoading = true;
      this.notify();
    }

    this.editor.media.clearAllMedia();
    this.editor.timeline.clearTimeline();
    this.editor.scene.clearScenes();

    try {
      const project = await storageService.loadProject({ id });
      if (!project) {
        throw new Error(`Project with id ${id} not found`);
      }

      this.activeProject = project;
      this.notify();

      let currentScene = null;
      if (project.scenes && project.scenes.length > 0) {
        this.editor.scene.initializeScenes({
          scenes: project.scenes,
          currentSceneId: project.currentSceneId,
        });

        currentScene =
          project.scenes.find((s) => s.id === project.currentSceneId) ||
          project.scenes.find((s) => s.isMain) ||
          project.scenes[0];
      }

      await Promise.all([
        this.editor.media.loadProjectMedia({ projectId: id }),
        this.editor.timeline.loadProjectTimeline({
          projectId: id,
          sceneId: currentScene?.id,
        }),
      ]);
    } catch (error) {
      console.error("Failed to load project:", error);
      throw error;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async saveCurrentProject(): Promise<void> {
    if (!this.activeProject) return;

    try {
      const currentScene = this.editor.scene.getCurrentScene();

      await Promise.all([
        storageService.saveProject({ project: this.activeProject }),
        this.editor.timeline.saveProjectTimeline({
          projectId: this.activeProject.id,
          sceneId: currentScene?.id,
        }),
      ]);
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  }

  async loadAllProjects(): Promise<void> {
    if (!this.isInitialized) {
      this.isLoading = true;
      this.notify();
    }

    try {
      const projects = await storageService.loadAllProjects();
      this.savedProjects = projects;
      this.notify();
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      this.isLoading = false;
      this.isInitialized = true;
      this.notify();
    }
  }

  async deleteProject({ id }: { id: string }): Promise<void> {
    try {
      await Promise.all([
        storageService.deleteProjectMedia({ projectId: id }),
        storageService.deleteProjectTimeline({ projectId: id }),
        storageService.deleteProject({ id }),
      ]);
      await this.loadAllProjects();

      if (this.activeProject?.id === id) {
        this.activeProject = null;
        this.notify();

        this.editor.media.clearAllMedia();
        this.editor.timeline.clearTimeline();
        this.editor.scene.clearScenes();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  }

  closeProject(): void {
    this.activeProject = null;
    this.notify();

    this.editor.media.clearAllMedia();
    this.editor.timeline.clearTimeline();
    this.editor.scene.clearScenes();
  }

  async renameProject({
    id,
    name,
  }: {
    id: string;
    name: string;
  }): Promise<void> {
    const projectToRename = this.savedProjects.find((p) => p.id === id);
    if (!projectToRename) {
      toast.error("Project not found", {
        description: "Please try again",
      });
      return;
    }

    const updatedProject = {
      ...projectToRename,
      name,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      await this.loadAllProjects();

      if (this.activeProject?.id === id) {
        this.activeProject = updatedProject;
        this.notify();
      }
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("Failed to rename project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  }

  async duplicateProject({
    projectId,
  }: {
    projectId: string;
  }): Promise<string> {
    try {
      const project = await storageService.loadProject({ id: projectId });
      if (!project) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        throw new Error("Project not found");
      }

      const numberMatch = project.name.match(/^\((\d+)\)\s+(.+)$/);
      const baseName = numberMatch ? numberMatch[2] : project.name;
      const existingNumbers: number[] = [];

      this.savedProjects.forEach((p) => {
        const match = p.name.match(/^\((\d+)\)\s+(.+)$/);
        if (match && match[2] === baseName) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newProject: TProject = {
        ...project,
        id: generateUUID(),
        name: `(${nextNumber}) ${baseName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storageService.saveProject({ project: newProject });
      await this.loadAllProjects();
      return newProject.id;
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      throw error;
    }
  }

  async updateProjectThumbnail({
    thumbnail,
  }: {
    thumbnail: string;
  }): Promise<void> {
    if (!this.activeProject) return;

    const updatedProject = {
      ...this.activeProject,
      thumbnail,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      this.activeProject = updatedProject;
      this.notify();
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to update project thumbnail:", error);
    }
  }

  async prepareExit(): Promise<void> {
    if (!this.activeProject) return;

    try {
      const tracks = this.editor.timeline.getTracks();
      const mediaFiles = this.editor.media.getMediaFiles();

      const firstElement = tracks
        .flatMap((track) => track.elements)
        .sort((a, b) => a.startTime - b.startTime)[0];

      if (
        firstElement &&
        (firstElement.type === "video" || firstElement.type === "image")
      ) {
        const mediaFile = mediaFiles.find(
          (item) => item.id === firstElement.mediaId,
        );

        if (mediaFile) {
          let thumbnailDataUrl: string | undefined;

          if (mediaFile.type === "video" && mediaFile.file) {
            thumbnailDataUrl = await generateThumbnail({
              videoFile: mediaFile.file,
              timeInSeconds: 1,
            });
          } else if (mediaFile.type === "image" && mediaFile.url) {
            thumbnailDataUrl = mediaFile.thumbnailUrl || mediaFile.url;
          }

          if (thumbnailDataUrl && !thumbnailDataUrl.startsWith("blob:")) {
            await this.updateProjectThumbnail({ thumbnail: thumbnailDataUrl });
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate project thumbnail on exit:", error);
    }
  }

  async updateProjectBackground({
    backgroundColor,
  }: {
    backgroundColor: string;
  }): Promise<void> {
    if (!this.activeProject) return;

    const updatedProject = {
      ...this.activeProject,
      backgroundColor,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      this.activeProject = updatedProject;
      this.notify();
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to update project background:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  }

  async updateBackgroundType({
    type,
    options,
  }: {
    type: "color" | "blur";
    options?: { backgroundColor?: string; blurIntensity?: number };
  }): Promise<void> {
    if (!this.activeProject) return;

    const updatedProject = {
      ...this.activeProject,
      backgroundType: type,
      ...(options?.backgroundColor && {
        backgroundColor: options.backgroundColor,
      }),
      ...(options?.blurIntensity !== undefined && {
        blurIntensity: options.blurIntensity,
      }),
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      this.activeProject = updatedProject;
      this.notify();
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to update background type:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  }

  async updateProjectFps({ fps }: { fps: number }): Promise<void> {
    if (!this.activeProject) return;

    const updatedProject = {
      ...this.activeProject,
      fps,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      this.activeProject = updatedProject;
      this.notify();
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to update project FPS:", error);
      toast.error("Failed to update project FPS", {
        description: "Please try again",
      });
    }
  }

  async updateCanvasSize({ size }: { size: TCanvasSize }): Promise<void> {
    if (!this.activeProject) return;

    const updatedProject: TProject = {
      ...this.activeProject,
      canvasSize: size,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      this.activeProject = updatedProject;
      this.notify();
      await this.loadAllProjects();
    } catch (error) {
      console.error("Failed to update canvas size:", error);
      toast.error("Failed to update canvas size", {
        description: "Please try again",
      });
    }
  }

  getFilteredAndSortedProjects({
    searchQuery,
    sortOption,
  }: {
    searchQuery: string;
    sortOption: string;
  }): TProject[] {
    const filteredProjects = this.savedProjects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sortedProjects = [...filteredProjects].sort((a, b) => {
      const [key, order] = sortOption.split("-");

      if (key !== "createdAt" && key !== "name") {
        console.warn(`Invalid sort key: ${key}`);
        return 0;
      }

      const aValue = a[key];
      const bValue = b[key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (order === "asc") {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      }
      if (aValue > bValue) return -1;
      if (aValue < bValue) return 1;
      return 0;
    });

    return sortedProjects;
  }

  isInvalidProjectId({ id }: { id: string }): boolean {
    return this.invalidProjectIds.has(id);
  }

  markProjectIdAsInvalid({ id }: { id: string }): void {
    this.invalidProjectIds.add(id);
    this.notify();
  }

  clearInvalidProjectIds(): void {
    this.invalidProjectIds.clear();
    this.notify();
  }

  getActive(): TProject | null {
    return this.activeProject;
  }

  getActiveFps(): number | undefined {
    return this.activeProject?.fps;
  }

  getSavedProjects(): TProject[] {
    return this.savedProjects;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  setActiveProject({ project }: { project: TProject }): void {
    this.activeProject = project;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
