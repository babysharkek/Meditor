import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import { toolsEnv } from "@opencut/env/tools";

// Load the right env file based on environment
if (toolsEnv.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.local" });
}

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  migrations: {
    table: "drizzle_migrations",
  },
  dbCredentials: {
    url: toolsEnv.DATABASE_URL,
  },
  out: "./migrations",
  strict: toolsEnv.NODE_ENV === "production",
} satisfies Config;
