import { betterAuth, RateLimit } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "@upstash/redis";
import { db } from "@opencut/db";
import { env } from "@opencut/env";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  secret: env.BETTER_AUTH_SECRET,
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
  baseURL: env.NEXT_PUBLIC_SITE_URL,
  appName: "OpenCut",
  trustedOrigins: ["http://localhost:3000"],
});

export type Auth = typeof auth;
