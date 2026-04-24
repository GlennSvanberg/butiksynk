import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DEMO_AUTH_EMAIL } from "../shared/shopConstants";
import { createShopForNewUser } from "./lib/newShopFromSignup";
import { getOrCreateDefaultShopId } from "./lib/shops";
import { ensureRootStructure } from "./taxonomy";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements: (password: string) => {
        if (!password || password.length < 4) {
          throw new Error("Lösenordet måste vara minst 4 tecken.");
        }
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx_, { userId, profile }) {
      const ctx = ctx_ as MutationCtx;
      const email =
        typeof profile.email === "string"
          ? profile.email.trim().toLowerCase()
          : "";

      const memberships = await ctx.db
        .query("shopMemberships")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      if (email === DEMO_AUTH_EMAIL.toLowerCase()) {
        const demoShopId = await getOrCreateDefaultShopId(ctx);
        const hasDemo = memberships.some((m) => m.shopId === demoShopId);
        if (!hasDemo) {
          await ctx.db.insert("shopMemberships", {
            userId,
            shopId: demoShopId,
          });
        }
        await ensureRootStructure(ctx, demoShopId);
        return;
      }

      if (memberships.length > 0) {
        return;
      }

      const localPart = email.includes("@") ? email.split("@")[0] : email;
      const shopId = await createShopForNewUser(ctx, localPart || "butik");
      await ensureRootStructure(ctx, shopId);
      await ctx.db.insert("shopMemberships", { userId, shopId });
    },
  },
});
