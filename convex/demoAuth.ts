import { v } from "convex/values";
import { DEMO_AUTH_EMAIL } from "../shared/shopConstants";
import { api, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { ensureDemoShopForUser } from "./lib/demoShop";
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

/** Saknat lösenordskonto. Fel lösenord (`InvalidSecret`) ska inte tolkas som saknat. */
export function isMissingDemoAccount(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    message.includes("InvalidAccountId") ||
    message.toLowerCase().includes("invalid credentials")
  );
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

async function openOrCreateDemoAccount(
  ctx: ActionCtx,
  password: string,
): Promise<DemoTokens> {
  try {
    const existing = await signInWithFlow(ctx, password, "signIn");
    if (existing) {
      return existing;
    }
  } catch (error) {
    if (!isMissingDemoAccount(error)) {
      console.error("Demoinloggning misslyckades", errorMessage(error));
      throw new Error("Demokontot kunde inte öppnas.");
    }
  }

  try {
    const created = await signInWithFlow(ctx, password, "signUp");
    if (created) {
      return created;
    }
  } catch (error) {
    const message = errorMessage(error);
    if (message.toLowerCase().includes("already exists")) {
      try {
        const retry = await signInWithFlow(ctx, password, "signIn");
        if (retry) {
          return retry;
        }
      } catch (retryError) {
        console.error("Demoinloggning misslyckades", errorMessage(retryError));
        throw new Error("Demokontot kunde inte öppnas.");
      }
    } else {
      console.error("Demoregistrering misslyckades", message);
      throw new Error("Demokontot kunde inte öppnas.");
    }
  }

  throw new Error("Demokontot kunde inte öppnas.");
}

/**
 * Ser till att demokontot har exempelbutik och medlemskap,
 * även när kontot redan fanns och inloggningen inte skapar användaren på nytt.
 */
export const ensureDemoShopForAccount = internalMutation({
  args: {},
  returns: v.id("shops"),
  handler: async (ctx) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", DEMO_AUTH_EMAIL),
      )
      .unique();
    if (!account) {
      throw new Error("Demokontot saknas.");
    }
    return await ensureDemoShopForUser(ctx, account.userId);
  },
});

/**
 * Öppnar demokontot utan att lösenordet finns i klienten.
 * Skapar `demo@selio.local` med `DEMO_AUTH_PASSWORD` om kontot saknas,
 * och exempelbutiken plus medlemskapet om de saknas. Säkert att köra igen.
 */
export const signInDemo = action({
  args: {},
  returns: demoTokensValidator,
  handler: async (ctx): Promise<DemoTokens> => {
    const password = process.env.DEMO_AUTH_PASSWORD;
    if (!password || password.length < 4) {
      throw new Error("Demoinloggning är inte konfigurerad.");
    }

    const tokens = await openOrCreateDemoAccount(ctx, password);
    await ctx.runMutation(internal.demoAuth.ensureDemoShopForAccount, {});
    return tokens;
  },
});
