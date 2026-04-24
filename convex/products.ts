import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { softDeletePurgeBeforeTimestamp } from "./lib/retention";
import {
  productAttributeValidator,
  storedProductAttributeValidator,
} from "./lib/productAttributes";
import { getOrCreateDefaultShopId } from "./lib/shops";
import { computePathLabel } from "./taxonomy";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// TODO: Skydda createProduct, generateUploadUrl och createProductFromPhotoCapture med auth när inloggning finns.

const productFields = {
  title: v.string(),
  description: v.string(),
  priceSek: v.number(),
  shopId: v.optional(v.id("shops")),
  categoryId: v.id("taxonomyNodes"),
  attributes: v.array(productAttributeValidator),
  imageStorageId: v.id("_storage"),
};

async function assertCategoryBelongsToShop(
  ctx: MutationCtx,
  shopId: Id<"shops">,
  categoryId: Id<"taxonomyNodes">,
): Promise<void> {
  const node = await ctx.db.get("taxonomyNodes", categoryId);
  if (!node || node.shopId !== shopId) {
    throw new Error("Ogiltig kategori för vald butik.");
  }
}

async function requireActiveProductForShop(
  ctx: MutationCtx,
  productId: Id<"products">,
  shopId: Id<"shops">,
): Promise<Doc<"products">> {
  const doc = await ctx.db.get("products", productId);
  if (!doc || doc.deletedAt !== undefined) {
    throw new Error("Produkten hittades inte.");
  }
  if (doc.shopId !== shopId) {
    throw new Error("Produkten tillhör inte den här butiken.");
  }
  return doc;
}

function isActiveProduct(doc: Doc<"products">): boolean {
  return doc.deletedAt === undefined;
}

/** Publik butik: inte under AI-bearbetning eller fel, och inte borttagen. */
function isPubliclyVisibleProduct(doc: Doc<"products">): boolean {
  if (!isActiveProduct(doc)) {
    return false;
  }
  if (doc.captureStatus === "processing" || doc.captureStatus === "error") {
    return false;
  }
  return true;
}

async function enrichProductDoc(ctx: QueryCtx, doc: Doc<"products">) {
  return {
    ...doc,
    categoryLabel:
      doc.categoryPathCached ??
      (doc.categoryId
        ? await computePathLabel(ctx, doc.categoryId)
        : undefined),
    imageUrl: await ctx.storage.getUrl(doc.imageStorageId),
    sourceImageUrl: doc.sourceImageStorageId
      ? await ctx.storage.getUrl(doc.sourceImageStorageId)
      : null,
  };
}

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("products")
      .order("desc")
      .collect();
    const active = docs.filter(isActiveProduct);
    return Promise.all(active.map((doc) => enrichProductDoc(ctx, doc)));
  },
});

export const listProductsByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("products")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();
    const active = docs.filter(isActiveProduct);
    return Promise.all(active.map((doc) => enrichProductDoc(ctx, doc)));
  },
});

export const listProductsForPublicStorefront = query({
  args: {
    slug: v.string(),
    searchQuery: v.optional(v.string()),
    categoryId: v.optional(v.id("taxonomyNodes")),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!shop) {
      return [];
    }
    let docs = await ctx.db
      .query("products")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .order("desc")
      .collect();
    docs = docs.filter(isPubliclyVisibleProduct);

    if (args.categoryId !== undefined) {
      const node = await ctx.db.get("taxonomyNodes", args.categoryId);
      if (!node || node.shopId !== shop._id) {
        return [];
      }
      docs = docs.filter((d) => d.categoryId === args.categoryId);
    }

    const rawQuery = args.searchQuery?.trim();
    if (rawQuery && rawQuery.length > 0) {
      const needle = rawQuery.toLocaleLowerCase("sv");
      docs = docs.filter((d) => {
        const hay = [
          d.title,
          d.description,
          d.categoryPathCached ?? "",
        ]
          .join("\n")
          .toLocaleLowerCase("sv");
        return hay.includes(needle);
      });
    }

    return Promise.all(docs.map((doc) => enrichProductDoc(ctx, doc)));
  },
});

export const getProductForPublicStorefront = query({
  args: {
    slug: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!shop) {
      return null;
    }
    const doc = await ctx.db.get("products", args.productId);
    if (
      !doc ||
      !isPubliclyVisibleProduct(doc) ||
      doc.shopId !== shop._id
    ) {
      return null;
    }
    return enrichProductDoc(ctx, doc);
  },
});

export const getProductForEdit = query({
  args: {
    productId: v.id("products"),
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("products", args.productId);
    if (!doc || !isActiveProduct(doc) || doc.shopId !== args.shopId) {
      return null;
    }
    return enrichProductDoc(ctx, doc);
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    shopId: v.id("shops"),
    title: v.string(),
    description: v.string(),
    priceSek: v.number(),
    categoryId: v.id("taxonomyNodes"),
    attributes: v.array(storedProductAttributeValidator),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await requireActiveProductForShop(
      ctx,
      args.productId,
      args.shopId,
    );
    await assertCategoryBelongsToShop(ctx, args.shopId, args.categoryId);
    if (existing.captureStatus === "processing") {
      throw new Error("Vänta tills AI listan är klar innan du redigerar.");
    }
    const categoryId = args.categoryId;
    const categoryPathCached = await computePathLabel(ctx, categoryId);
    const imageStorageId = args.imageStorageId ?? existing.imageStorageId;
    await ctx.db.patch("products", args.productId, {
      title: args.title,
      description: args.description,
      priceSek: args.priceSek,
      categoryId,
      categoryPathCached,
      attributes: args.attributes,
      imageStorageId,
    });
  },
});

export const softDeleteProduct = mutation({
  args: {
    productId: v.id("products"),
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    await requireActiveProductForShop(ctx, args.productId, args.shopId);
    await ctx.db.patch("products", args.productId, { deletedAt: Date.now() });
  },
});

export const purgeOldSoftDeleted = internalMutation({
  args: {},
  handler: async (ctx) => {
    const before = softDeletePurgeBeforeTimestamp();
    const batch = await ctx.db
      .query("products")
      .withIndex("by_deleted", (q) => q.lte("deletedAt", before))
      .take(100);

    for (const doc of batch) {
      if (doc.deletedAt === undefined) {
        continue;
      }
      try {
        await ctx.storage.delete(doc.imageStorageId);
      } catch {
        /* borttagen fil eller id ogiltig */
      }
      if (doc.sourceImageStorageId) {
        try {
          await ctx.storage.delete(doc.sourceImageStorageId);
        } catch {
          /* samma */
        }
      }
      await ctx.db.delete("products", doc._id);
    }

    if (batch.length === 100) {
      await ctx.scheduler.runAfter(0, internal.products.purgeOldSoftDeleted, {});
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createProduct = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    const shopId = args.shopId ?? (await getOrCreateDefaultShopId(ctx));
    await assertCategoryBelongsToShop(ctx, shopId, args.categoryId);
    const categoryPathCached = await computePathLabel(ctx, args.categoryId);
    await ctx.db.insert("products", {
      title: args.title,
      description: args.description,
      priceSek: args.priceSek,
      shopId,
      categoryId: args.categoryId,
      categoryPathCached,
      attributes: args.attributes,
      imageStorageId: args.imageStorageId,
    });
  },
});

export const createProductFromPhotoCapture = mutation({
  args: {
    rawImageStorageId: v.id("_storage"),
    shopId: v.optional(v.id("shops")),
  },
  handler: async (ctx, args) => {
    const shopId = args.shopId ?? (await getOrCreateDefaultShopId(ctx));
    const productId = await ctx.db.insert("products", {
      title: "Bearbetar…",
      description: "",
      priceSek: 0,
      shopId,
      attributes: [],
      imageStorageId: args.rawImageStorageId,
      sourceImageStorageId: args.rawImageStorageId,
      captureStatus: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.productListingAi.runPipeline, {
      productId,
    });

    return productId;
  },
});

export const getProductForPipeline = internalQuery({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("products", args.productId);
    if (
      !doc ||
      doc.deletedAt !== undefined ||
      doc.captureStatus !== "processing"
    ) {
      return null;
    }
    const rawImageUrl = await ctx.storage.getUrl(doc.imageStorageId);
    let shopId = doc.shopId ?? null;
    if (!shopId) {
      shopId =
        (
          await ctx.db
            .query("shops")
            .withIndex("by_slug", (q) => q.eq("slug", "demo"))
            .unique()
        )?._id ?? null;
    }
    return { rawImageUrl, shopId };
  },
});

export const applyAiListingResult = internalMutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    description: v.string(),
    priceSek: v.number(),
    categoryId: v.id("taxonomyNodes"),
    categoryPathCached: v.string(),
    attributes: v.array(productAttributeValidator),
    /** Om utelämnad behålls befintlig visningsbild (t.ex. rå butiksbild om Gemini misslyckades). */
    processedImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("products", args.productId);
    if (!doc || doc.deletedAt !== undefined || doc.captureStatus !== "processing") {
      return;
    }
    await ctx.db.patch("products", args.productId, {
      title: args.title,
      description: args.description,
      priceSek: args.priceSek,
      categoryId: args.categoryId,
      categoryPathCached: args.categoryPathCached,
      attributes: args.attributes,
      category: undefined,
      ...(args.processedImageStorageId !== undefined
        ? { imageStorageId: args.processedImageStorageId }
        : {}),
      captureStatus: "ready",
      captureError: undefined,
    });
  },
});

export const markCaptureFailed = internalMutation({
  args: {
    productId: v.id("products"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("products", args.productId);
    if (!doc || doc.deletedAt !== undefined || doc.captureStatus !== "processing") {
      return;
    }
    await ctx.db.patch("products", args.productId, {
      captureStatus: "error",
      captureError: args.error,
      title: doc.title === "Bearbetar…" ? "Kunde inte skapa" : doc.title,
    });
  },
});
