import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { toolsEnv } from "@opencut/env/tools";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const client = postgres(toolsEnv.DATABASE_URL);
    _db = drizzle(client, { schema });
  }

  return _db;
}

export const db = getDb();

export * from "./schema";
