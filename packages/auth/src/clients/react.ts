import { createAuthClient } from "better-auth/react";
import { env } from "@opencut/env";

export const { signIn, signUp, useSession } = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SITE_URL,
});
