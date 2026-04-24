import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const DEFAULT_SHOP_SLUG = "demo";

export async function getOrCreateDefaultShopId(
  ctx: MutationCtx,
): Promise<Id<"shops">> {
  const existing = await ctx.db
    .query("shops")
    .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_SHOP_SLUG))
    .unique();
  if (existing) {
    return existing._id;
  }
  return await ctx.db.insert("shops", {
    name: "Demo",
    slug: DEFAULT_SHOP_SLUG,
  });
}
