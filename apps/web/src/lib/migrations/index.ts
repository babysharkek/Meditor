import { TProject } from "@/types/project";
import { migrateV0ToV1, needsV0ToV1Migration } from "./v0-to-v1";

export const CURRENT_VERSION = 1;

type Migration = {
  from: number;
  to: number;
  migrate: ({ project }: { project: TProject }) => TProject;
  needsMigration: ({ project }: { project: TProject }) => boolean;
};

const migrations: Migration[] = [
  {
    from: 0,
    to: 1,
    migrate: migrateV0ToV1,
    needsMigration: needsV0ToV1Migration,
  },
];

export interface MigrationResult {
  project: TProject;
  migrated: boolean;
  fromVersion?: number;
  toVersion?: number;
}

/**
 * Runs all necessary migrations on a project to bring it to the current version
 */
export function runMigrations({
  project,
}: {
  project: TProject;
}): MigrationResult {
  let currentProject = { ...project };
  let currentVersion = project.version ?? inferVersion({ project });
  let migrated = false;
  const originalVersion = currentVersion;

  for (const migration of migrations) {
    if (currentVersion === migration.from) {
      if (migration.needsMigration({ project: currentProject })) {
        currentProject = migration.migrate({ project: currentProject });
        currentVersion = migration.to;
        migrated = true;
      } else {
        currentProject.version = migration.to;
        currentVersion = migration.to;
      }
    }
  }

  return {
    project: currentProject,
    migrated,
    fromVersion: migrated ? originalVersion : undefined,
    toVersion: migrated ? currentVersion : undefined,
  };
}

/**
 * Infer the version of a legacy project that has no version field
 */
function inferVersion({ project }: { project: TProject }): number {
  if (!project.scenes || project.scenes.length === 0) {
    return 0;
  }

  return CURRENT_VERSION;
}
