import { TProject } from "@/types/project";
import { buildDefaultScene } from "../scene-utils";

/**
 * Migration v0 → v1: Add scenes support to legacy projects
 *
 * Legacy projects (v0) had no scenes array or an empty scenes array.
 * This migration creates a main scene for such projects.
 */
export function migrateV0ToV1({ project }: { project: TProject }): TProject {
  const mainScene = buildDefaultScene({ isMain: true, name: "Main scene" });

  return {
    ...project,
    scenes: [mainScene],
    currentSceneId: mainScene.id,
    version: 1,
    metadata: {
      ...project.metadata,
      updatedAt: new Date(),
    },
  };
}

/**
 * Check if project needs v0→v1 migration
 */
export function needsV0ToV1Migration({
  project,
}: {
  project: TProject;
}): boolean {
  return !project.scenes || project.scenes.length === 0;
}
