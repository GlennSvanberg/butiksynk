import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = MutationCtx | QueryCtx;

export async function requireShopMembership(
  ctx: AuthCtx,
  shopId: Id<"shops">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Du måste vara inloggad.");
  }
  const row = await ctx.db
    .query("shopMemberships")
    .withIndex("by_user_and_shop", (q) =>
      q.eq("userId", userId).eq("shopId", shopId),
    )
    .unique();
  if (!row) {
    throw new Error("Du har inte tillgång till den här butiken.");
  }
  return userId;
}
