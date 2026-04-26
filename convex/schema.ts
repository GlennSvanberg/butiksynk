import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { storedProductAttributeValidator } from "./lib/productAttributes";

export default defineSchema({
  ...authTables,

  shopMemberships: defineTable({
    userId: v.id("users"),
    shopId: v.id("shops"),
  })
    .index("by_user", ["userId"])
    .index("by_shop", ["shopId"])
    .index("by_user_and_shop", ["userId", "shopId"]),

  numbers: defineTable({
    value: v.number(),
  }),

  shops: defineTable({
    name: v.string(),
    slug: v.string(),
    /** Visas i kundbutiken; annars används `name`. */
    storefrontDisplayName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactWebsite: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    /** Hex #RRGGBB */
    storefrontColorPrimary: v.optional(v.string()),
    storefrontColorAccent: v.optional(v.string()),
    storefrontColorBackground: v.optional(v.string()),
    storefrontColorSurface: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  }).index("by_slug", ["slug"]),

  taxonomyNodes: defineTable({
    shopId: v.id("shops"),
    /** `null` for roots */
    parentId: v.union(v.null(), v.id("taxonomyNodes")),
    name: v.string(),
    slug: v.string(),
    sortOrder: v.optional(v.number()),
  })
    .index("by_shop_and_parent", ["shopId", "parentId"])
    .index("by_shop", ["shopId"]),

  products: defineTable({
    title: v.string(),
    description: v.string(),
    priceSek: v.number(),
    /** Deprecated; removed after ensureDemoEnvironment migrates legacy rows */
    category: v.optional(v.string()),
    shopId: v.optional(v.id("shops")),
    categoryId: v.optional(v.id("taxonomyNodes")),
    /** Legacy; ej längre skriven — kategori visas via `categoryId` + taxonomiträd. */
    categoryPathCached: v.optional(v.string()),
    attributes: v.array(storedProductAttributeValidator),
    imageStorageId: v.id("_storage"),
    /** Original butiksfoto; samma som imageStorageId tills Nano Banana 2 ersätter visningsbilden. */
    sourceImageStorageId: v.optional(v.id("_storage")),
    /** Fritext från användaren vid inskanning (skick, detaljer, defekter) */
    userContext: v.optional(v.string()),
    captureStatus: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("ready"),
        v.literal("error"),
      ),
    ),
    captureError: v.optional(v.string()),
    /** AI-listning (titel/beskrivning/pris/kategori) klar medan studiobild ev. fortfarande körs. */
    captureListingReady: v.optional(v.boolean()),
    /** Studiobild (Gemini) pågår eller väntas; UI visar spinner tills false. */
    captureStudioImagePending: v.optional(v.boolean()),
    /** Ökas vid ändring av userContext så sena text-regenereringar inte skriver över nyare. */
    userContextEpoch: v.optional(v.number()),
    /** Sätts när varan säljs; raden behålls för butikens historik och KPI:er. */
    soldAt: v.optional(v.number()),
    /** Pris vid försäljning om det skiljer sig från aktuellt listpris. */
    soldPriceSek: v.optional(v.number()),
    /** Sätt vid mjuk borttagning; efter 14 dagar rensas raden hårt (se cron + `shared/retention.ts`). */
    deletedAt: v.optional(v.number()),
  })
    .index("by_shop", ["shopId"])
    .index("by_category_node", ["categoryId"])
    .index("by_deleted", ["deletedAt"]),
});
