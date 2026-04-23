import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

// TODO: Skydda createProduct, generateUploadUrl och createProductFromPhotoCapture med auth när inloggning finns.

const productFields = {
  title: v.string(),
  description: v.string(),
  priceSek: v.number(),
  category: v.string(),
  attributes: v.array(
    v.object({
      label: v.string(),
      value: v.string(),
    }),
  ),
  imageStorageId: v.id("_storage"),
};

const attributeValidator = v.object({
  label: v.string(),
  value: v.string(),
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("products").order("desc").collect();
    const withUrls = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        imageUrl: await ctx.storage.getUrl(doc.imageStorageId),
        sourceImageUrl: doc.sourceImageStorageId
          ? await ctx.storage.getUrl(doc.sourceImageStorageId)
          : null,
      })),
    );
    return withUrls;
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
    await ctx.db.insert("products", args);
  },
});

export const createProductFromPhotoCapture = mutation({
  args: {
    rawImageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("products", {
      title: "Bearbetar…",
      description: "",
      priceSek: 0,
      category: "—",
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
    if (!doc || doc.captureStatus !== "processing") {
      return null;
    }
    const rawImageUrl = await ctx.storage.getUrl(doc.imageStorageId);
    return { rawImageUrl };
  },
});

export const applyAiListingResult = internalMutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    description: v.string(),
    priceSek: v.number(),
    category: v.string(),
    attributes: v.array(attributeValidator),
    /** Om utelämnad behålls befintlig visningsbild (t.ex. rå butiksbild om Gemini misslyckades). */
    processedImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get("products", args.productId);
    if (!doc || doc.captureStatus !== "processing") {
      return;
    }
    await ctx.db.patch("products", args.productId, {
      title: args.title,
      description: args.description,
      priceSek: args.priceSek,
      category: args.category,
      attributes: args.attributes,
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
    if (!doc || doc.captureStatus !== "processing") {
      return;
    }
    await ctx.db.patch("products", args.productId, {
      captureStatus: "error",
      captureError: args.error,
      title: doc.title === "Bearbetar…" ? "Kunde inte skapa" : doc.title,
    });
  },
});
