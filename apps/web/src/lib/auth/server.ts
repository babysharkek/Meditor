import { betterAuth, type RateLimit } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "@upstash/redis";
import { db } from "@/lib/db";
import { webEnv } from "@opencut/env/web";

const trustedOrigins = Array.from(
	new Set(
		[
			webEnv.NEXT_PUBLIC_SITE_URL,
			process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
			"http://localhost:3000",
			"http://127.0.0.1:3000",
		].filter((value): value is string => Boolean(value)),
	),
);

const baseURL =
	process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : trustedOrigins[0];

const secret =
	webEnv.BETTER_AUTH_SECRET ??
	process.env.BETTER_AUTH_SECRET ??
	process.env.VERCEL_GIT_COMMIT_SHA ??
	"development-secret";

const redis =
	webEnv.UPSTASH_REDIS_REST_URL && webEnv.UPSTASH_REDIS_REST_TOKEN
		? new Redis({
				url: webEnv.UPSTASH_REDIS_REST_URL,
				token: webEnv.UPSTASH_REDIS_REST_TOKEN,
			})
		: null;

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	secret,
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	...(redis
		? {
				rateLimit: {
					storage: "secondary-storage" as const,
					customStorage: {
						get: async (key: string) => {
							const value = await redis.get(key);
							return value as RateLimit | undefined;
						},
						set: async (key: string, value: RateLimit) => {
							await redis.set(key, value);
						},
					},
				},
			}
		: {}),
	baseURL,
	appName: "OpenCut",
	trustedOrigins,
});

export type Auth = typeof auth;
