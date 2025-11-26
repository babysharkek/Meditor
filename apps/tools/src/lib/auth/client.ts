import { createAuthClient } from "better-auth/react";
import { toolsEnv } from "@opencut/env/tools";

export const { signIn, signUp, useSession } = createAuthClient({
  baseURL: toolsEnv.NEXT_PUBLIC_SITE_URL,
});
