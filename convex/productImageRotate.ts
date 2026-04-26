"use node";

import { v } from "convex/values";
import { Jimp } from "jimp";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Roterar visningsbilden 90° (EXIF kan inte rätta när Orientation=1 men motivet är fysiskt upp och ner).
 * Jimp: positiv deg = moturs; medurs = -90.
 */
export const rotateProductDisplayImage = action({
  args: {
    productId: v.id("products"),
    shopId: v.id("shops"),
    direction: v.union(
      v.literal("cw"),
      v.literal("ccw"),
      /** Helt upp och ner (t.ex. förpackningstext) — ett klick räcker. */
      v.literal("180"),
    ),
  },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(api.products.getProductForEdit, {
      productId: args.productId,
      shopId: args.shopId,
    });
    if (!product?.imageUrl) {
      throw new Error("Produkten eller bilden hittades inte.");
    }
    if (
      product.captureStudioImagePending === true ||
      (product.captureStatus === "processing" &&
        product.captureListingReady !== true)
    ) {
      throw new Error(
        "Vänta tills butiksbilden är klar innan du roterar bilden.",
      );
    }

    const res = await fetch(product.imageUrl, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      throw new Error("Kunde inte hämta bilden för rotation.");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const image = await Jimp.read(buf);
    const deg =
      args.direction === "cw"
        ? -90
        : args.direction === "ccw"
          ? 90
          : 180;
    image.rotate(deg);
    const png = await image.getBuffer("image/png");

    const postUrl: string = await ctx.runMutation(
      api.products.generateUploadUrl,
      { shopId: args.shopId },
    );
    const uploadRes = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: new Uint8Array(png),
      signal: AbortSignal.timeout(60_000),
    });
    if (!uploadRes.ok) {
      throw new Error("Kunde inte spara roterad bild.");
    }
    const uploadJson = (await uploadRes.json()) as { storageId?: string };
    if (!uploadJson.storageId) {
      throw new Error("Uppladdningssvar saknar storageId.");
    }

    await ctx.runMutation(api.products.applyRotatedProductImage, {
      productId: args.productId,
      shopId: args.shopId,
      newImageStorageId: uploadJson.storageId as Id<"_storage">,
    });
  },
});
