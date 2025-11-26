import { betterAuth, RateLimit } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "@upstash/redis";
import { db } from "@/lib/db";
import { toolsEnv } from "@opencut/env/tools";

const redis = new Redis({
  url: toolsEnv.UPSTASH_REDIS_REST_URL,
  token: toolsEnv.UPSTASH_REDIS_REST_TOKEN,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: toolsEnv.BETTER_AUTH_SECRET,
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    storage: "secondary-storage",
    customStorage: {
      get: async (key) => {
        const value = await redis.get(key);
        return value as RateLimit | undefined;
      },
      set: async (key, value) => {
        await redis.set(key, value);
      },
    },
  },
  baseURL: toolsEnv.NEXT_PUBLIC_SITE_URL,
  appName: "OpenCut Tools",
  trustedOrigins: [toolsEnv.NEXT_PUBLIC_SITE_URL],
});

export type Auth = typeof auth;
