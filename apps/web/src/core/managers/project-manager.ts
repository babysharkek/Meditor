import type { EditorCore } from "@/core";
import type {
  TProject,
  TProjectMetadata,
  TProjectSettings,
} from "@/types/project";
import type { TimelineElement } from "@/types/timeline";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { generateUUID } from "@/lib/utils";
import { UpdateProjectSettingsCommand } from "@/lib/commands/project";
import {
  DEFAULT_FPS,
  DEFAULT_CANVAS_SIZE,
  DEFAULT_COLOR,
} from "@/constants/project-constants";
import { buildDefaultScene } from "@/lib/scene-utils";
import { generateThumbnail } from "@/lib/media-processing-utils";
import {
  CURRENT_STORAGE_VERSION,
  migrations,
  runStorageMigrations,
} from "@/lib/migrations";

export interface MigrationState {
  isMigrating: boolean;
  fromVersion: number | null;
  toVersion: number | null;
  projectName: string | null;
}

export class ProjectManager {
  private active: TProject | null = null;
  private savedProjects: TProjectMetadata[] = [];
  private isLoading = true;
  private isInitialized = false;
  private invalidProjectIds = new Set<string>();
  private storageMigrationPromise: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private migrationState: MigrationState = {
    isMigrating: false,
    fromVersion: null,
    toVersion: null,
    projectName: null,
  };

  constructor(private editor: EditorCore) {}

  private async ensureStorageMigrations(): Promise<void> {
    if (this.storageMigrationPromise) {
      await this.storageMigrationPromise;
      return;
    }

    this.storageMigrationPromise = (async () => {
      let hasShownState = false;

      await runStorageMigrations({
        migrations,
        callbacks: {
          onMigrationStart: ({ fromVersion, toVersion }) => {
            hasShownState = true;
            this.setMigrationState({
              isMigrating: true,
              fromVersion,
              toVersion,
              projectName: null,
            });
          },
        },
      });

      if (hasShownState) {
        this.setMigrationState({
          isMigrating: false,
          fromVersion: null,
          toVersion: null,
          projectName: null,
        });
      }
    })();

    await this.storageMigrationPromise;
  }

  async createNewProject({ name }: { name: string }): Promise<string> {
    const mainScene = buildDefaultScene({ name: "Main scene", isMain: true });
    const newProject: TProject = {
      metadata: {
        id: generateUUID(),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      scenes: [mainScene],
      currentSceneId: mainScene.id,
      settings: {
        fps: DEFAULT_FPS,
        canvasSize: DEFAULT_CANVAS_SIZE,
        background: {
          type: "color",
          color: DEFAULT_COLOR,
        },
      },
      version: CURRENT_STORAGE_VERSION,
    };

    this.active = newProject;
    this.notify();

    this.editor.media.clearAllAssets();
    this.editor.scenes.initializeScenes({
      scenes: newProject.scenes,
      currentSceneId: newProject.currentSceneId,
    });

    try {
      await storageService.saveProject({ project: newProject });
      this.updateMetadata(newProject);

      return newProject.metadata.id;
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

    this.editor.save.pause();
    await this.ensureStorageMigrations();
    this.editor.media.clearAllAssets();
    this.editor.scenes.clearScenes();

    try {
      const result = await storageService.loadProject({ id });
      if (!result) {
        throw new Error(`Project with id ${id} not found`);
      }

      const project = result.project;

      this.active = project;
      this.notify();

      if (project.scenes && project.scenes.length > 0) {
        this.editor.scenes.initializeScenes({
          scenes: project.scenes,
          currentSceneId: project.currentSceneId,
        });
      }

      await this.editor.media.loadProjectMedia({ projectId: id });
    } catch (error) {
      console.error("Failed to load project:", error);
      throw error;
    } finally {
      this.isLoading = false;
      this.notify();
      this.editor.save.resume();
    }
  }

  async saveCurrentProject(): Promise<void> {
    if (!this.active) return;

    try {
      const updatedProject = {
        ...this.active,
        scenes: this.editor.scenes.getScenes(),
        metadata: {
          ...this.active.metadata,
          updatedAt: new Date(),
        },
      };

      await storageService.saveProject({ project: updatedProject });
      this.active = updatedProject;
      this.updateMetadata(updatedProject);
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  }

  async loadAllProjects(): Promise<void> {
    if (!this.isInitialized) {
      this.isLoading = true;
      this.notify();
    }

    await this.ensureStorageMigrations();
    try {
      const metadata = await storageService.loadAllProjectsMetadata();
      this.savedProjects = metadata;
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
        storageService.deleteProject({ id }),
      ]);

      this.savedProjects = this.savedProjects.filter((p) => p.id !== id);
      this.notify();

      if (this.active?.metadata.id === id) {
        this.active = null;
        this.notify();

        this.editor.media.clearAllAssets();
        this.editor.scenes.clearScenes();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  }

  closeProject(): void {
    this.active = null;
    this.notify();

    this.editor.media.clearAllAssets();
    this.editor.scenes.clearScenes();
  }

  async renameProject({
    id,
    name,
  }: {
    id: string;
    name: string;
  }): Promise<void> {
    try {
      const result = await storageService.loadProject({ id });
      if (!result) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        return;
      }

      const updatedProject: TProject = {
        ...result.project,
        metadata: {
          ...result.project.metadata,
          name,
          updatedAt: new Date(),
        },
      };

      await storageService.saveProject({ project: updatedProject });

      if (this.active?.metadata.id === id) {
        this.active = updatedProject;
        this.notify();
      }

      this.updateMetadata(updatedProject);
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("Failed to rename project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  }

  async duplicateProject({ id }: { id: string }): Promise<string> {
    try {
      const result = await storageService.loadProject({ id });
      if (!result) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        throw new Error("Project not found");
      }

      const project = result.project;
      const numberMatch = project.metadata.name.match(/^\((\d+)\)\s+(.+)$/);
      const baseName = numberMatch ? numberMatch[2] : project.metadata.name;
      const existingNumbers: number[] = [];

      this.savedProjects.forEach((p) => {
        const match = p.name.match(/^\((\d+)\)\s+(.+)$/);
        if (match && match[2] === baseName) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newProjectId = generateUUID();
      const newProject: TProject = {
        ...project,
        metadata: {
          ...project.metadata,
          id: newProjectId,
          name: `(${nextNumber}) ${baseName}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      await storageService.saveProject({ project: newProject });

      const sourceMediaAssets = await storageService.loadAllMediaAssets({
        projectId: id,
      });
      for (const asset of sourceMediaAssets) {
        await storageService.saveMediaAsset({
          projectId: newProjectId,
          mediaAsset: asset,
        });
      }

      this.updateMetadata(newProject);

      return newProjectId;
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      throw error;
    }
  }

  async updateSettings({
    settings,
    pushHistory = true,
  }: {
    settings: Partial<TProjectSettings>;
    pushHistory?: boolean;
  }): Promise<void> {
    if (!this.active) return;

    const command = new UpdateProjectSettingsCommand(settings);
    if (pushHistory) {
      this.editor.command.execute({ command });
      return;
    }

    command.execute();
  }

  async updateThumbnail({ thumbnail }: { thumbnail: string }): Promise<void> {
    if (!this.active) return;

    const updatedProject: TProject = {
      ...this.active,
      metadata: { ...this.active.metadata, thumbnail, updatedAt: new Date() },
    };
    this.active = updatedProject;
    this.notify();
    this.updateMetadata(updatedProject);
    this.editor.save.markDirty();
  }

  async prepareExit(): Promise<void> {
    if (!this.active) return;

    try {
      const tracks = this.editor.timeline.getTracks();
      const mediaAssets = this.editor.media.getAssets();

      const allElements: TimelineElement[] = tracks.flatMap(
        (track) => track.elements as TimelineElement[],
      );
      const sortedElements = allElements.sort(
        (a, b) => a.startTime - b.startTime,
      );
      const firstElement = sortedElements[0];

      if (
        firstElement &&
        (firstElement.type === "video" || firstElement.type === "image")
      ) {
        const mediaAsset = mediaAssets.find(
          (asset) => asset.id === firstElement.mediaId,
        );

        if (mediaAsset) {
          let thumbnailDataUrl: string | undefined;

          if (mediaAsset.type === "video" && mediaAsset.file) {
            thumbnailDataUrl = await generateThumbnail({
              videoFile: mediaAsset.file,
              timeInSeconds: 1,
            });
          } else if (mediaAsset.type === "image" && mediaAsset.url) {
            thumbnailDataUrl = mediaAsset.thumbnailUrl || mediaAsset.url;
          }

          if (thumbnailDataUrl && !thumbnailDataUrl.startsWith("blob:")) {
            await this.updateThumbnail({ thumbnail: thumbnailDataUrl });
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate project thumbnail on exit:", error);
    }
  }

  getFilteredAndSortedProjects({
    searchQuery,
    sortOption,
  }: {
    searchQuery: string;
    sortOption: string;
  }): TProjectMetadata[] {
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

  getActive(): TProject {
    if (!this.active) {
      throw new Error("No active project");
    }
    return this.active;
  }

  getActiveOrNull(): TProject | null {
    return this.active;
  }

  getSavedProjects(): TProjectMetadata[] {
    return this.savedProjects;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getMigrationState(): MigrationState {
    return this.migrationState;
  }

  private setMigrationState(state: Partial<MigrationState>): void {
    this.migrationState = { ...this.migrationState, ...state };
    this.notify();
  }

  setActiveProject({ project }: { project: TProject }): void {
    this.active = project;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateMetadata(project: TProject): void {
    const index = this.savedProjects.findIndex(
      (p) => p.id === project.metadata.id,
    );

    if (index !== -1) {
      this.savedProjects[index] = project.metadata;
    } else {
      this.savedProjects = [project.metadata, ...this.savedProjects];
    }

    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
