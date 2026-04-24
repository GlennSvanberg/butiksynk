import { slugifyTaxonomySegment } from "./slugify";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function createShopForNewUser(
  ctx: MutationCtx,
  emailLocalPart: string,
): Promise<Id<"shops">> {
  const raw = emailLocalPart.trim() || "butik";
  const base = slugifyTaxonomySegment(raw).slice(0, 48) || "butik";
  let slug = base;
  let n = 2;
  for (;;) {
    const clash = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!clash) {
      break;
    }
    slug = `${base}-${n}`;
    n += 1;
  }
  const name = raw.length > 0 ? raw : "Min butik";
  return ctx.db.insert("shops", { name, slug });
}
