import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { DEMO_SHOP_SLUG } from "../shared/shopConstants";
import {
  MAX_CONTACT,
  MAX_DISPLAY_NAME,
  MAX_NOTE,
  normalizeOptionalHex,
  trimToMax,
} from "./lib/shopBranding";
import { requireShopMembership } from "./lib/shopAccess";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export { DEMO_SHOP_SLUG };

/** Butiker som den inloggade användaren har tillgång till. */
export const listMyShops = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    const links = await ctx.db
      .query("shopMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out: Array<{ _id: Id<"shops">; name: string; slug: string }> = [];
    for (const m of links) {
      const shop = await ctx.db.get("shops", m.shopId);
      if (shop) {
        out.push({ _id: shop._id, name: shop.name, slug: shop.slug });
      }
    }
    return out;
  },
});

/** Välj butik för klientsession efter inloggning (föredrar demosbutik om den finns). */
export const bootstrapViewerShopSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const links = await ctx.db
      .query("shopMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (links.length === 0) {
      return null;
    }
    const shops: Array<Doc<"shops">> = [];
    for (const m of links) {
      const shop = await ctx.db.get("shops", m.shopId);
      if (shop) {
        shops.push(shop);
      }
    }
    if (shops.length === 0) {
      return null;
    }
    const preferred =
      shops.find((s) => s.slug === DEMO_SHOP_SLUG) ?? shops[0];
    return {
      shopId: preferred._id,
      shopName: preferred.name,
      shopSlug: preferred.slug,
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return shop;
  },
});

function brandingFromShopDoc(shop: Doc<"shops">) {
  return {
    storefrontDisplayName: shop.storefrontDisplayName,
    contactEmail: shop.contactEmail,
    contactPhone: shop.contactPhone,
    contactWebsite: shop.contactWebsite,
    contactNote: shop.contactNote,
    storefrontColorPrimary: shop.storefrontColorPrimary,
    storefrontColorAccent: shop.storefrontColorAccent,
    storefrontColorBackground: shop.storefrontColorBackground,
    storefrontColorSurface: shop.storefrontColorSurface,
    logoStorageId: shop.logoStorageId,
  };
}

/** Publik butikspresentation (tema + kontakt + logga-URL). */
export const getStorefrontBrandingBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!shop) {
      return null;
    }
    const logoUrl = shop.logoStorageId
      ? await ctx.storage.getUrl(shop.logoStorageId)
      : null;
    return {
      slug: shop.slug,
      displayName: shop.storefrontDisplayName?.trim() || shop.name,
      contactEmail: shop.contactEmail,
      contactPhone: shop.contactPhone,
      contactWebsite: shop.contactWebsite,
      contactNote: shop.contactNote,
      storefrontColorPrimary: shop.storefrontColorPrimary,
      storefrontColorAccent: shop.storefrontColorAccent,
      storefrontColorBackground: shop.storefrontColorBackground,
      storefrontColorSurface: shop.storefrontColorSurface,
      logoUrl,
    };
  },
});

/** Admin: ladda nuvarande butiksdesign för formulär. */
export const getShopBrandingForAdmin = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    const shop = await ctx.db.get("shops", args.shopId);
    if (!shop) {
      return null;
    }
    const logoUrl = shop.logoStorageId
      ? await ctx.storage.getUrl(shop.logoStorageId)
      : null;
    return {
      ...brandingFromShopDoc(shop),
      logoUrl,
      internalName: shop.name,
      slug: shop.slug,
    };
  },
});

type BrandingPatch = {
  storefrontDisplayName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWebsite?: string;
  contactNote?: string;
  storefrontColorPrimary?: string;
  storefrontColorAccent?: string;
  storefrontColorBackground?: string;
  storefrontColorSurface?: string;
  logoStorageId?: Id<"_storage">;
};

function mergeShopBranding(
  shop: Doc<"shops">,
  args: {
    storefrontDisplayName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWebsite?: string;
    contactNote?: string;
    storefrontColorPrimary?: string;
    storefrontColorAccent?: string;
    storefrontColorBackground?: string;
    storefrontColorSurface?: string;
    logoStorageId?: Id<"_storage">;
    clearLogo?: boolean;
  },
): BrandingPatch {
  const storefrontDisplayName = (() => {
    if (args.storefrontDisplayName !== undefined) {
      return trimToMax(args.storefrontDisplayName, MAX_DISPLAY_NAME);
    }
    return shop.storefrontDisplayName;
  })();

  const contactEmail = (() => {
    if (args.contactEmail !== undefined) {
      return trimToMax(args.contactEmail, MAX_CONTACT);
    }
    return shop.contactEmail;
  })();

  const contactPhone = (() => {
    if (args.contactPhone !== undefined) {
      return trimToMax(args.contactPhone, MAX_CONTACT);
    }
    return shop.contactPhone;
  })();

  const contactWebsite = (() => {
    if (args.contactWebsite !== undefined) {
      return trimToMax(args.contactWebsite, MAX_CONTACT);
    }
    return shop.contactWebsite;
  })();

  const contactNote = (() => {
    if (args.contactNote !== undefined) {
      return trimToMax(args.contactNote, MAX_NOTE);
    }
    return shop.contactNote;
  })();

  const storefrontColorPrimary = (() => {
    if (args.storefrontColorPrimary !== undefined) {
      return normalizeOptionalHex(
        args.storefrontColorPrimary,
        "Primärfärg",
      );
    }
    return shop.storefrontColorPrimary;
  })();

  const storefrontColorAccent = (() => {
    if (args.storefrontColorAccent !== undefined) {
      return normalizeOptionalHex(args.storefrontColorAccent, "Accentfärg");
    }
    return shop.storefrontColorAccent;
  })();

  const storefrontColorBackground = (() => {
    if (args.storefrontColorBackground !== undefined) {
      return normalizeOptionalHex(
        args.storefrontColorBackground,
        "Bakgrundsfärg",
      );
    }
    return shop.storefrontColorBackground;
  })();

  const storefrontColorSurface = (() => {
    if (args.storefrontColorSurface !== undefined) {
      return normalizeOptionalHex(
        args.storefrontColorSurface,
        "Ytfärg (kort)",
      );
    }
    return shop.storefrontColorSurface;
  })();

  let logoStorageId: Id<"_storage"> | undefined;
  if (args.clearLogo) {
    logoStorageId = undefined;
  } else if (args.logoStorageId !== undefined) {
    logoStorageId = args.logoStorageId;
  } else {
    logoStorageId = shop.logoStorageId;
  }

  return {
    storefrontDisplayName,
    contactEmail,
    contactPhone,
    contactWebsite,
    contactNote,
    storefrontColorPrimary,
    storefrontColorAccent,
    storefrontColorBackground,
    storefrontColorSurface,
    logoStorageId,
  };
}

export const updateStorefrontBranding = mutation({
  args: {
    shopId: v.id("shops"),
    storefrontDisplayName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactWebsite: v.optional(v.string()),
    contactNote: v.optional(v.string()),
    storefrontColorPrimary: v.optional(v.string()),
    storefrontColorAccent: v.optional(v.string()),
    storefrontColorBackground: v.optional(v.string()),
    storefrontColorSurface: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    clearLogo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    const shop = await ctx.db.get("shops", args.shopId);
    if (!shop) {
      throw new Error("Butiken hittades inte.");
    }
    const merged = mergeShopBranding(shop, args);
    const nextDoc: Record<string, unknown> = {
      name: shop.name,
      slug: shop.slug,
    };
    const brandingKeys = [
      "storefrontDisplayName",
      "contactEmail",
      "contactPhone",
      "contactWebsite",
      "contactNote",
      "storefrontColorPrimary",
      "storefrontColorAccent",
      "storefrontColorBackground",
      "storefrontColorSurface",
      "logoStorageId",
    ] as const satisfies ReadonlyArray<keyof BrandingPatch>;
    for (const key of brandingKeys) {
      const val = merged[key];
      if (val !== undefined) {
        nextDoc[key] = val;
      }
    }
    await ctx.db.replace("shops", args.shopId, nextDoc as never);
  },
});

export const generateStorefrontLogoUploadUrl = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopMembership(ctx, args.shopId);
    const shop = await ctx.db.get("shops", args.shopId);
    if (!shop) {
      throw new Error("Butiken hittades inte.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Idempotent: skapar demosbutik om den saknas och sätter shopId på produkter utan butik.
 * Anropas från klienten vid behov (t.ex. innan demoshop) så befintliga deployment får data.
 */
export const ensureDemoShopAndBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    if ((await getAuthUserId(ctx)) === null) {
      throw new Error("Du måste vara inloggad.");
    }
    let demo = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", DEMO_SHOP_SLUG))
      .unique();

    if (!demo) {
      const id = await ctx.db.insert("shops", {
        name: "Demoshop",
        slug: DEMO_SHOP_SLUG,
      });
      demo = await ctx.db.get("shops", id);
    }

    if (!demo) {
      throw new Error("Kunde inte skapa eller läsa demosbutik.");
    }

    const products = await ctx.db.query("products").collect();
    for (const p of products) {
      if (p.shopId === undefined) {
        await ctx.db.patch("products", p._id, { shopId: demo._id });
      }
    }

    return { demoShopId: demo._id };
  },
});
