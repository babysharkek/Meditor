import { TScene } from "@/types/project";
import { generateUUID } from "@/lib/utils";

export function getActiveScene({
  scenes,
  currentSceneId,
}: {
  scenes: TScene[];
  currentSceneId: string;
}): TScene | null {
  return scenes.find((s) => s.id === currentSceneId) ?? null;
}

export function getMainScene({ scenes }: { scenes: TScene[] }): TScene | null {
  return scenes.find((scene) => scene.isMain) || null;
}

export function ensureMainScene({ scenes }: { scenes: TScene[] }): TScene[] {
  const hasMain = scenes.some((scene) => scene.isMain);
  if (!hasMain) {
    const mainScene: TScene = {
      id: generateUUID(),
      name: "Main scene",
      isMain: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return [mainScene, ...scenes];
  }
  return scenes;
}

export function buildDefaultScene({
  name,
  isMain,
}: {
  name: string;
  isMain: boolean;
}): TScene {
  return {
    id: generateUUID(),
    name,
    isMain,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function canDeleteScene({ scene }: { scene: TScene }): {
  canDelete: boolean;
  reason?: string;
} {
  if (scene.isMain) {
    return { canDelete: false, reason: "Cannot delete main scene" };
  }
  return { canDelete: true };
}

export function getFallbackSceneAfterDelete({
  scenes,
  deletedSceneId,
  currentSceneId,
}: {
  scenes: TScene[];
  deletedSceneId: string;
  currentSceneId: string | null;
}): TScene | null {
  if (currentSceneId !== deletedSceneId) {
    return scenes.find((s) => s.id === currentSceneId) || null;
  }
  return getMainScene({ scenes });
}

export function normalizeScenes({ scenes }: { scenes: TScene[] }): TScene[] {
  return scenes.map((scene) => ({
    ...scene,
    isMain: scene.isMain || false,
  }));
}

export function findCurrentScene({
  scenes,
  currentSceneId,
}: {
  scenes: TScene[];
  currentSceneId: string;
}): TScene | null {
  return (
    scenes.find((s) => s.id === currentSceneId) ||
    getMainScene({ scenes }) ||
    scenes[0] ||
    null
  );
}

export function updateSceneInArray({
  scenes,
  sceneId,
  updates,
}: {
  scenes: TScene[];
  sceneId: string;
  updates: Partial<TScene>;
}): TScene[] {
  return scenes.map((scene) =>
    scene.id === sceneId ? { ...scene, ...updates } : scene,
  );
}
