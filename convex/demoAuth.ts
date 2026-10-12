import { v } from "convex/values";
import { DEMO_AUTH_EMAIL } from "../shared/shopConstants";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";

const demoTokensValidator = v.object({
  token: v.string(),
  refreshToken: v.string(),
});

type DemoTokens = {
  token: string;
  refreshToken: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isInvalidCredentials(error: unknown): boolean {
  return errorMessage(error).toLowerCase().includes("invalid credentials");
}

function readTokens(result: unknown): DemoTokens | null {
  if (typeof result !== "object" || result === null || !("tokens" in result)) {
    return null;
  }
  const tokens = result.tokens;
  if (typeof tokens !== "object" || tokens === null) {
    return null;
  }
  if (
    !("token" in tokens) ||
    !("refreshToken" in tokens) ||
    typeof tokens.token !== "string" ||
    typeof tokens.refreshToken !== "string"
  ) {
    return null;
  }
  return { token: tokens.token, refreshToken: tokens.refreshToken };
}

async function signInWithFlow(
  ctx: ActionCtx,
  password: string,
  flow: "signIn" | "signUp",
): Promise<DemoTokens | null> {
  const result: unknown = await ctx.runAction(api.auth.signIn, {
    provider: "password",
    params: {
      email: DEMO_AUTH_EMAIL,
      password,
      flow,
    },
  });
  return readTokens(result);
}

/**
 * Öppnar demokontot utan att lösenordet finns i klienten.
 * Kräver `DEMO_AUTH_PASSWORD` i Convex-miljön. Samma lösenord som kontot
 * `demo@selio.local` redan har.
 */
export const signInDemo = action({
  args: {},
  returns: demoTokensValidator,
  handler: async (ctx): Promise<DemoTokens> => {
    const password = process.env.DEMO_AUTH_PASSWORD;
    if (!password || password.length < 4) {
      throw new Error("Demoinloggning är inte konfigurerad.");
    }

    try {
      const existing = await signInWithFlow(ctx, password, "signIn");
      if (existing) {
        return existing;
      }
    } catch (error) {
      if (!isInvalidCredentials(error)) {
        console.error("Demoinloggning misslyckades", errorMessage(error));
        throw new Error("Demokontot kunde inte öppnas.");
      }
    }

    try {
      const created = await signInWithFlow(ctx, password, "signUp");
      if (!created) {
        throw new Error("Demokontot kunde inte öppnas.");
      }
      return created;
    } catch (error) {
      if (error instanceof Error && error.message === "Demokontot kunde inte öppnas.") {
        throw error;
      }
      console.error("Demoregistrering misslyckades", errorMessage(error));
      throw new Error("Demokontot kunde inte öppnas.");
    }
  },
});
