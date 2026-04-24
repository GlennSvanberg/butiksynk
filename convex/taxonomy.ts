import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireShopMembership } from "./lib/shopAccess";
import { slugifyTaxonomySegment } from "./lib/slugify";
import { getOrCreateDefaultShopId } from "./lib/shops";
import type { Doc, Id } from "./_generated/dataModel";
import type { ProductAttribute } from "./lib/productAttributes";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ROOT_NAME = "Sortiment";
const ROOT_SLUG = "sortiment";

const categoryResolutionValidator = v.union(
  v.object({
    mode: v.literal("existing"),
    path: v.array(v.string()),
  }),
  v.object({
    mode: v.literal("new_leaf"),
    parentPath: v.array(v.string()),
    suggestedNameSv: v.string(),
  }),
);

async function uniqueSlugForParent(
  ctx: { db: MutationCtx["db"] },
  shopId: Id<"shops">,
  parentId: Id<"taxonomyNodes"> | null,
  baseSlug: string,
): Promise<string> {
  const siblings = await ctx.db
    .query("taxonomyNodes")
    .withIndex("by_shop_and_parent", (q) =>
      q.eq("shopId", shopId).eq("parentId", parentId),
    )
    .collect();
  const taken = new Set(siblings.map((s) => s.slug));
  let candidate = baseSlug;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }
  return candidate;
}

async function listChildren(
  ctx: { db: QueryCtx["db"] },
  shopId: Id<"shops">,
  parentId: Id<"taxonomyNodes"> | null,
): Promise<Array<Doc<"taxonomyNodes">>> {
  return ctx.db
    .query("taxonomyNodes")
    .withIndex("by_shop_and_parent", (q) =>
      q.eq("shopId", shopId).eq("parentId", parentId),
    )
    .collect();
}

function matchSegment(
  children: Array<Doc<"taxonomyNodes">>,
  segment: string,
): Doc<"taxonomyNodes"> | null {
  const trimmed = segment.trim();
  if (!trimmed) {
    return null;
  }
  const slug = slugifyTaxonomySegment(trimmed);
  const lower = trimmed.toLowerCase();
  return (
    children.find((c) => c.slug === slug) ??
    children.find((c) => c.name.trim().toLowerCase() === lower) ??
    null
  );
}

async function walkExistingPath(
  ctx: { db: QueryCtx["db"] },
  shopId: Id<"shops">,
  segments: Array<string>,
): Promise<Id<"taxonomyNodes"> | null> {
  let parentId: Id<"taxonomyNodes"> | null = null;
  let children = await listChildren(ctx, shopId, parentId);
  for (const seg of segments) {
    const node = matchSegment(children, seg);
    if (!node) {
      return null;
    }
    parentId = node._id;
    children = await listChildren(ctx, shopId, parentId);
  }
  return parentId;
}

export async function computePathLabel(
  ctx: { db: QueryCtx["db"] },
  nodeId: Id<"taxonomyNodes">,
): Promise<string> {
  const parts = await computePathSegments(ctx, nodeId);
  return parts.join(" > ");
}

/** Namn från rot till nod (för UI-steg / brödsmulor). */
export async function computePathSegments(
  ctx: { db: QueryCtx["db"] },
  nodeId: Id<"taxonomyNodes">,
): Promise<Array<string>> {
  const parts: Array<string> = [];
  let currentId: Id<"taxonomyNodes"> | null = nodeId;
  while (currentId) {
    const node: Doc<"taxonomyNodes"> | null = await ctx.db.get(
      "taxonomyNodes",
      currentId,
    );
    if (!node) {
      break;
    }
    parts.push(node.name);
    currentId = node.parentId;
  }
  return parts.reverse();
}

export type TaxonomyNodeByIdMap = Map<
  Id<"taxonomyNodes">,
  Doc<"taxonomyNodes">
>;

export async function loadTaxonomyNodesByShop(
  ctx: QueryCtx,
  shopId: Id<"shops">,
): Promise<TaxonomyNodeByIdMap> {
  const nodes = await ctx.db
    .query("taxonomyNodes")
    .withIndex("by_shop", (q) => q.eq("shopId", shopId))
    .collect();
  return new Map(nodes.map((n) => [n._id, n] as const));
}

export function pathSegmentsFromTaxonomyMap(
  categoryId: Id<"taxonomyNodes"> | undefined,
  byId: TaxonomyNodeByIdMap,
): Array<string> {
  if (categoryId === undefined) {
    return [];
  }
  const parts: Array<string> = [];
  let cur: Doc<"taxonomyNodes"> | undefined = byId.get(categoryId);
  const seen = new Set<string>();
  while (cur && !seen.has(String(cur._id))) {
    seen.add(String(cur._id));
    parts.push(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.reverse();
}

export function pathSearchBlobFromTaxonomyMap(
  categoryId: Id<"taxonomyNodes"> | undefined,
  byId: TaxonomyNodeByIdMap,
): string {
  return pathSegmentsFromTaxonomyMap(categoryId, byId)
    .join("\n")
    .toLocaleLowerCase("sv");
}

export type TaxonomyTreeNode = {
  id: Id<"taxonomyNodes">;
  name: string;
  slug: string;
  sortOrder?: number;
  children: Array<TaxonomyTreeNode>;
};

function sortTaxonomyDocs(
  a: Doc<"taxonomyNodes">,
  b: Doc<"taxonomyNodes">,
): number {
  const ao = a.sortOrder ?? 0;
  const bo = b.sortOrder ?? 0;
  if (ao !== bo) {
    return ao - bo;
  }
  return a.name.localeCompare(b.name, "sv");
}

export function buildTaxonomyTree(
  nodes: Array<Doc<"taxonomyNodes">>,
): Array<TaxonomyTreeNode> {
  const byParent = new Map<string, Array<Doc<"taxonomyNodes">>>();
  for (const n of nodes) {
    const key =
      n.parentId === null ? "__root__" : String(n.parentId);
    const list = byParent.get(key);
    if (list) {
      list.push(n);
    } else {
      byParent.set(key, [n]);
    }
  }
  for (const list of byParent.values()) {
    list.sort(sortTaxonomyDocs);
  }
  const toDto = (node: Doc<"taxonomyNodes">): TaxonomyTreeNode => {
    const rawChildren = byParent.get(String(node._id)) ?? [];
    return {
      id: node._id,
      name: node.name,
      slug: node.slug,
      sortOrder: node.sortOrder,
      children: rawChildren.map(toDto),
    };
  };
  const roots = byParent.get("__root__") ?? [];
  return roots.map(toDto);
}

export async function ensureRootStructure(
  ctx: MutationCtx,
  shopId: Id<"shops">,
): Promise<{ rootId: Id<"taxonomyNodes"> }> {
  const roots = await listChildren(ctx, shopId, null);
  let root = roots.find((r) => r.slug === ROOT_SLUG);
  if (!root) {
    const rootId = await ctx.db.insert("taxonomyNodes", {
      shopId,
      parentId: null,
      name: ROOT_NAME,
      slug: ROOT_SLUG,
      sortOrder: 0,
    });
    root = (await ctx.db.get("taxonomyNodes", rootId))!;
  }

  return { rootId: root._id };
}

const AUTO_LEAF_MAX_LEN = 72;

function autoLeafNameFromListingTitle(title: string): string {
  const t = title.trim();
  if (!t) {
    return "Ny kategori";
  }
  return t.length <= AUTO_LEAF_MAX_LEN ? t : `${t.slice(0, AUTO_LEAF_MAX_LEN - 1)}…`;
}

async function createAutoLeafUnderSortiment(
  ctx: MutationCtx,
  shopId: Id<"shops">,
  listingTitleSv: string,
): Promise<Id<"taxonomyNodes">> {
  const { rootId } = await ensureRootStructure(ctx, shopId);
  const name = autoLeafNameFromListingTitle(listingTitleSv);
  const baseSlug = slugifyTaxonomySegment(name);
  const slug = await uniqueSlugForParent(ctx, shopId, rootId, baseSlug);
  return ctx.db.insert("taxonomyNodes", {
    shopId,
    parentId: rootId,
    name,
    slug,
    sortOrder: Date.now(),
  });
}

/** Legacy: skapar blad direkt under Sortiment (ersätter tidigare \"Importerade\"-gren). */
export async function findOrCreateLeafUnderSortiment(
  ctx: MutationCtx,
  shopId: Id<"shops">,
  categoryLabel: string,
): Promise<Id<"taxonomyNodes">> {
  const { rootId } = await ensureRootStructure(ctx, shopId);
  const name = categoryLabel.trim() || autoLeafNameFromListingTitle("");
  const children = await listChildren(ctx, shopId, rootId);
  const lower = name.toLowerCase();
  const existing =
    children.find((c) => c.name.trim().toLowerCase() === lower) ??
    children.find((c) => slugifyTaxonomySegment(c.name) === slugifyTaxonomySegment(name));
  if (existing) {
    return existing._id;
  }
  const baseSlug = slugifyTaxonomySegment(name);
  const slug = await uniqueSlugForParent(ctx, shopId, rootId, baseSlug);
  return ctx.db.insert("taxonomyNodes", {
    shopId,
    parentId: rootId,
    name,
    slug,
    sortOrder: Date.now(),
  });
}

/** Builds multi-line snapshot for LLM: one full path per line using " > ". */
export const getTaxonomySnapshotForAi = internalQuery({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const nodes = await ctx.db
      .query("taxonomyNodes")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    if (nodes.length === 0) {
      return "";
    }
    const byId = new Map(nodes.map((n) => [n._id, n] as const));
    const lines: Array<string> = [];
    for (const n of nodes) {
      const parts: Array<string> = [];
      let cur: Doc<"taxonomyNodes"> | undefined = n;
      while (cur) {
        parts.push(`${cur.name} [${cur.slug}]`);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      lines.push(parts.reverse().join(" > "));
    }
    lines.sort();
    return lines.join("\n");
  },
});

export const resolveCategoryProposal = internalMutation({
  args: {
    shopId: v.id("shops"),
    /** Används när befintlig path saknas — skapar ny bladnod under Sortiment. */
    listingTitleSv: v.string(),
    categoryResolution: categoryResolutionValidator,
  },
  handler: async (ctx, args) => {
    await ensureRootStructure(ctx, args.shopId);

    if (args.categoryResolution.mode === "existing") {
      const segments = args.categoryResolution.path.map((s) => s.trim()).filter(Boolean);
      if (segments.length === 0) {
        const id = await createAutoLeafUnderSortiment(
          ctx,
          args.shopId,
          args.listingTitleSv,
        );
        return { categoryId: id };
      }
      const id = await walkExistingPath(ctx, args.shopId, segments);
      if (id) {
        return { categoryId: id };
      }
      const autoId = await createAutoLeafUnderSortiment(
        ctx,
        args.shopId,
        args.listingTitleSv,
      );
      return { categoryId: autoId };
    }

    const parentSegments = args.categoryResolution.parentPath
      .map((s) => s.trim())
      .filter(Boolean);
    let parentId: Id<"taxonomyNodes"> | null =
      parentSegments.length === 0
        ? (await ensureRootStructure(ctx, args.shopId)).rootId
        : await walkExistingPath(ctx, args.shopId, parentSegments);

    if (!parentId) {
      const { rootId } = await ensureRootStructure(ctx, args.shopId);
      parentId = rootId;
    }

    const resolvedParentId: Id<"taxonomyNodes"> = parentId;

    const name =
      args.categoryResolution.suggestedNameSv.trim() ||
      autoLeafNameFromListingTitle(args.listingTitleSv);
    const baseSlug = slugifyTaxonomySegment(name);
    const slug = await uniqueSlugForParent(
      ctx,
      args.shopId,
      resolvedParentId,
      baseSlug,
    );
    const newId = await ctx.db.insert("taxonomyNodes", {
      shopId: args.shopId,
      parentId: resolvedParentId,
      name,
      slug,
      sortOrder: Date.now(),
    });
    return { categoryId: newId };
  },
});

type LegacyAttr = { label: string; value: string };

function isLegacyAttribute(
  a: unknown,
): a is LegacyAttr {
  return (
    typeof a === "object" &&
    a !== null &&
    "label" in a &&
    "value" in a &&
    !("type" in a)
  );
}

function migrateLegacyAttribute(a: LegacyAttr): ProductAttribute {
  const label = a.label.trim().toLowerCase();
  const value = a.value.trim();

  const brandKeys = ["märke", "brand"];
  const sizeKeys = ["storlek", "size"];
  const materialKeys = ["material"];
  const colorKeys = ["färg", "color"];
  const conditionKeys = ["skick", "condition"];

  if (brandKeys.some((k) => label.includes(k))) {
    return { key: "brand", type: "text", text: value || "—" };
  }
  if (sizeKeys.some((k) => label.includes(k))) {
    return { key: "size", type: "text", text: value || "—" };
  }
  if (materialKeys.some((k) => label.includes(k))) {
    return { key: "material", type: "text", text: value || "—" };
  }
  if (colorKeys.some((k) => label.includes(k))) {
    return { key: "color", type: "text", text: value || "—" };
  }
  if (conditionKeys.some((k) => label.includes(k))) {
    const lower = value.toLowerCase();
    let enumKey:
      | "new_with_tags"
      | "excellent"
      | "good"
      | "fair"
      | "poor" = "good";
    if (lower.includes("prislapp") || lower.includes("ny")) {
      enumKey = "new_with_tags";
    } else if (lower.includes("mycket")) {
      enumKey = "excellent";
    } else if (lower.includes("bra") && !lower.includes("mycket")) {
      enumKey = "good";
    } else if (lower.includes("accept") || lower.includes("sliten")) {
      enumKey = lower.includes("sliten") ? "poor" : "fair";
    }
    return { key: "condition", type: "enum", enumKey };
  }

  const numMatch = /^([\d.,]+)\s*(cm|mm|m|g|kg|ml|l)?$/i.exec(value);
  if (numMatch && numMatch[1]) {
    const n = Number(numMatch[1].replace(",", "."));
    const unit = numMatch[2] ? numMatch[2].toLowerCase() : "";
    if (Number.isFinite(n)) {
      if (label.includes("vikt") || label.includes("weight")) {
        return {
          key: "weight",
          type: "number",
          value: n,
          unit: unit || "g",
        };
      }
      return {
        key: "dimensions",
        type: "number",
        value: n,
        unit: unit || "cm",
      };
    }
  }

  return {
    key: "custom",
    type: "text",
    customLabelSv: a.label.trim() || "Attribut",
    text: value || "—",
  };
}

export const ensureDemoEnvironment = mutation({
  args: {},
  handler: async (ctx) => {
    if ((await getAuthUserId(ctx)) === null) {
      throw new Error("Du måste vara inloggad.");
    }
    const shopId = await getOrCreateDefaultShopId(ctx);
    await ensureRootStructure(ctx, shopId);

    const products = await ctx.db.query("products").collect();
    for (const p of products) {
      if (p.captureStatus === "processing") {
        continue;
      }

      const patch: Record<string, unknown> = {};

      if (!p.shopId) {
        patch.shopId = shopId;
      }

      const legacyCategory =
        "category" in p &&
        typeof (p as { category?: string }).category === "string"
          ? (p as { category?: string }).category
          : undefined;

      if (!p.categoryId) {
        const label =
          legacyCategory && legacyCategory !== "—"
            ? legacyCategory
            : "Ny kategori";
        const leafId = await findOrCreateLeafUnderSortiment(ctx, shopId, label);
        patch.categoryId = leafId;
      }

      const attrs = p.attributes as Array<unknown>;
      if (attrs.length > 0 && isLegacyAttribute(attrs[0])) {
        patch.attributes = (attrs as Array<LegacyAttr>).map(migrateLegacyAttribute);
      }

      if (legacyCategory !== undefined) {
        patch.category = undefined;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch("products", p._id, patch as never);
      }
    }

    return { shopId };
  },
});

export const ensureTaxonomyForShop = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    await ensureRootStructure(ctx, args.shopId);
    return { ok: true as const };
  },
});

export const listCategoryOptions = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    const nodes = await ctx.db
      .query("taxonomyNodes")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    const byId = new Map(nodes.map((n) => [n._id, n] as const));
    const rows: Array<{ id: Id<"taxonomyNodes">; pathLabel: string }> = [];
    for (const n of nodes) {
      const parts: Array<string> = [];
      let cur: Doc<"taxonomyNodes"> | undefined = n;
      while (cur) {
        parts.push(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      rows.push({
        id: n._id,
        pathLabel: parts.reverse().join(" > "),
      });
    }
    rows.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "sv"));
    return rows;
  },
});

/** Hierarki för admin-UI (välj kategori). */
export const listTaxonomyTree = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    const nodes = await ctx.db
      .query("taxonomyNodes")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return buildTaxonomyTree(nodes);
  },
});

/** Publik butik: kategoriträd för filter. */
export const listTaxonomyTreeByShopSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!shop) {
      return [];
    }
    const nodes = await ctx.db
      .query("taxonomyNodes")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect();
    return buildTaxonomyTree(nodes);
  },
});

/** Publik butik: kategorier för filter, keyed av butiksslug. */
export const listCategoryOptionsByShopSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!shop) {
      return [];
    }
    const nodes = await ctx.db
      .query("taxonomyNodes")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect();
    const byId = new Map(nodes.map((n) => [n._id, n] as const));
    const rows: Array<{ id: Id<"taxonomyNodes">; pathLabel: string }> = [];
    for (const n of nodes) {
      const parts: Array<string> = [];
      let cur: Doc<"taxonomyNodes"> | undefined = n;
      while (cur) {
        parts.push(cur.name);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      rows.push({
        id: n._id,
        pathLabel: parts.reverse().join(" > "),
      });
    }
    rows.sort((a, b) => a.pathLabel.localeCompare(b.pathLabel, "sv"));
    return rows;
  },
});
