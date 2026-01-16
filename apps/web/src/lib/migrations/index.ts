export { StorageMigration } from "./base";
export { StorageVersionManager } from "./version-manager";
export { runStorageMigrations } from "./runner";
import { V0toV1Migration } from "./v0-to-v1";
import { V1toV2Migration } from "./v1-to-v2";

export const CURRENT_STORAGE_VERSION = 2;

export const migrations = [new V0toV1Migration(), new V1toV2Migration()];
