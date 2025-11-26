import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@opencut/env";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const client = postgres(env.DATABASE_URL);
    _db = drizzle(client, { schema });
  }

  return _db;
}

export const db = getDb();

export * from "./schema";

export {
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  exists,
  notExists,
  sql,
} from "drizzle-orm";
