import { DEMO_AUTH_EMAIL } from "../../shared/shopConstants";
import { ensureRootStructure } from "../taxonomy";
import { getOrCreateDefaultShopId } from "./shops";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function isDemoAuthEmail(email: string): boolean {
  return email.trim().toLowerCase() === DEMO_AUTH_EMAIL.toLowerCase();
}

/** Skapar exempelbutiken och medlemskapet om de saknas. Säkert att köra igen. */
export async function ensureDemoShopForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Id<"shops">> {
  const demoShopId = await getOrCreateDefaultShopId(ctx);
  const memberships = await ctx.db
    .query("shopMemberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (!memberships.some((membership) => membership.shopId === demoShopId)) {
    await ctx.db.insert("shopMemberships", {
      userId,
      shopId: demoShopId,
    });
  }
  await ensureRootStructure(ctx, demoShopId);
  return demoShopId;
}
