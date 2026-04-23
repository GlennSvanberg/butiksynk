import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  products: defineTable({
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
    /** Original butiksfoto; samma som imageStorageId tills Nano Banana 2 ersätter visningsbilden. */
    sourceImageStorageId: v.optional(v.id("_storage")),
    captureStatus: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("ready"),
        v.literal("error"),
      ),
    ),
    captureError: v.optional(v.string()),
  }).index("by_category", ["category"]),
});
