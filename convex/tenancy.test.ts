/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { DEMO_AUTH_EMAIL } from "../shared/shopConstants";
import { api, internal } from "./_generated/api";
import { isMissingDemoAccount } from "./demoAuth";
import schema from "./schema";
import * as shopsApi from "./shops";
import { ensureDemoEnvironment } from "./taxonomy";
import type { TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./productListingAi.ts",
  "!./productEnrichFromNotes.ts",
  "!./productImageRotate.ts",
  "!./**/*.test.ts",
]);

type ProductSeed = {
  title: string;
  description?: string;
  priceSek?: number;
  shopId?: string;
  userContext?: string;
  captureError?: string;
  userContextEpoch?: number;
  captureStatus?: "processing" | "ready" | "error";
  soldAt?: number;
  category?: string;
  attributes?: Array<{ label: string; value: string }>;
};

async function seedProduct(
  t: ReturnType<typeof convexTest>,
  imageStorageId: string,
  seed: ProductSeed,
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("products", {
      title: seed.title,
      description: seed.description ?? "",
      priceSek: seed.priceSek ?? 100,
      ...(seed.shopId !== undefined ? { shopId: seed.shopId as never } : {}),
      attributes: seed.attributes ?? [],
      imageStorageId: imageStorageId as never,
      ...(seed.userContext !== undefined ? { userContext: seed.userContext } : {}),
      ...(seed.captureError !== undefined
        ? { captureError: seed.captureError }
        : {}),
      ...(seed.userContextEpoch !== undefined
        ? { userContextEpoch: seed.userContextEpoch }
        : {}),
      ...(seed.captureStatus !== undefined
        ? { captureStatus: seed.captureStatus }
        : {}),
      ...(seed.soldAt !== undefined ? { soldAt: seed.soldAt } : {}),
      ...(seed.category !== undefined ? { category: seed.category } : {}),
    });
  });
}

describe("butiksgräns", () => {
  test("listProducts visar bara den inloggades butiker", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.run(async (ctx) => {
      const shopA = await ctx.db.insert("shops", { name: "Butik A", slug: "butik-a" });
      const shopB = await ctx.db.insert("shops", { name: "Butik B", slug: "butik-b" });
      const userA = await ctx.db.insert("users", {});
      const userBoth = await ctx.db.insert("users", {});
      await ctx.db.insert("shopMemberships", { userId: userA, shopId: shopA });
      await ctx.db.insert("shopMemberships", { userId: userBoth, shopId: shopA });
      await ctx.db.insert("shopMemberships", { userId: userBoth, shopId: shopB });
      const imageStorageId = await ctx.storage.store(new Blob(["bild"]));
      return { shopA, shopB, userA, userBoth, imageStorageId };
    });

    const productA = await seedProduct(t, fixture.imageStorageId, {
      title: "Vara A",
      shopId: fixture.shopA,
      userContext: "anteckning A",
    });
    const productB = await seedProduct(t, fixture.imageStorageId, {
      title: "Vara B",
      shopId: fixture.shopB,
      userContext: "anteckning B",
    });
    await seedProduct(t, fixture.imageStorageId, {
      title: "Utan butik",
    });

    await expect(t.query(api.products.listProducts, {})).rejects.toThrow(
      "Du måste vara inloggad.",
    );

    const asA = t.withIdentity({ subject: fixture.userA });
    const own = await asA.query(api.products.listProducts, {});
    expect(own.map((product) => product._id)).toEqual([productA]);
    expect(own[0]?.userContext).toBe("anteckning A");
    expect(JSON.stringify(own)).not.toContain("anteckning B");

    await expect(
      asA.query(api.products.listProductsByShop, { shopId: fixture.shopB }),
    ).rejects.toThrow("Du har inte tillgång till den här butiken.");

    const asBoth = t.withIdentity({ subject: fixture.userBoth });
    const both = await asBoth.query(api.products.listProducts, {});
    expect(both.map((product) => product._id).sort()).toEqual(
      [productA, productB].sort(),
    );
  });

  test("kundbutiken lämnar inte ut personalens fritext", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.run(async (ctx) => {
      const shop = await ctx.db.insert("shops", {
        name: "Internbutik",
        slug: "publik",
        storefrontDisplayName: "Publik butik",
        contactNote: "Öppet lördagar",
        logoStorageId: await ctx.storage.store(new Blob(["logo"])),
      });
      const imageStorageId = await ctx.storage.store(new Blob(["bild"]));
      const productId = await ctx.db.insert("products", {
        title: "Synlig vas",
        description: "Blå vas",
        priceSek: 120,
        shopId: shop,
        attributes: [],
        imageStorageId,
        userContext: "spricka i foten, nämn inte",
        captureError: "internt fel",
        userContextEpoch: 4,
        category: "Vaser",
      });
      await ctx.db.insert("products", {
        title: "Såld vas",
        description: "Dold",
        priceSek: 80,
        shopId: shop,
        attributes: [],
        imageStorageId,
        userContext: "såld anteckning",
        soldAt: 1,
      });
      return { productId };
    });

    const listed = await t.query(api.products.listProductsForPublicStorefront, {
      slug: "publik",
    });
    expect(listed.map((product) => product.title)).toEqual(["Synlig vas"]);
    const listedJson = JSON.stringify(listed);
    expect(listedJson).not.toContain("spricka i foten");
    expect(listedJson).not.toContain("internt fel");
    expect(listedJson).not.toContain("såld anteckning");
    expect(listedJson).not.toContain("userContext");
    expect(listedJson).not.toContain("captureError");
    expect(listedJson).not.toContain("userContextEpoch");
    expect(listedJson).not.toContain("imageStorageId");
    expect(listed[0]?.category).toBe("Vaser");

    const detail = await t.query(api.products.getProductForPublicStorefront, {
      slug: "publik",
      productId: fixture.productId,
    });
    expect(detail?.title).toBe("Synlig vas");
    expect(detail && "userContext" in detail).toBe(false);
    expect(detail && "captureError" in detail).toBe(false);

    const branding = await t.query(api.shops.getStorefrontBrandingBySlug, {
      slug: "publik",
    });
    expect(branding?.displayName).toBe("Publik butik");
    expect(branding?.contactNote).toBe("Öppet lördagar");
    expect(branding && "logoStorageId" in branding).toBe(false);

    const bySlug = await t.query(api.shops.getBySlug, { slug: "publik" });
    expect(bySlug && "logoStorageId" in bySlug).toBe(false);
    expect(bySlug?.displayName).toBe("Publik butik");

    await t.run(async (ctx) => {
      await ctx.db.insert("shops", { name: "Naken", slug: "naken" });
    });
    const bare = await t.query(api.shops.getStorefrontBrandingBySlug, {
      slug: "naken",
    });
    expect(bare).toEqual({
      slug: "naken",
      displayName: "Naken",
      logoUrl: null,
    });
  });

  test("ensureDemoEnvironment rör bara exempelbutiken och är idempotent", async () => {
    const t = convexTest(schema, modules);
    expect(ensureDemoEnvironment.isInternal).toBe(true);
    expect("ensureDemoShopAndBackfill" in shopsApi).toBe(false);
    expect(modules["./myFunctions.ts"]).toBeUndefined();

    const ids = await t.run(async (ctx) => {
      const demoShop = await ctx.db.insert("shops", {
        name: "Exempelbutik",
        slug: "demo",
      });
      const otherShop = await ctx.db.insert("shops", {
        name: "Annan",
        slug: "annan",
      });
      const imageStorageId = await ctx.storage.store(new Blob(["bild"]));
      const otherProduct = await ctx.db.insert("products", {
        title: "Annan vara",
        description: "stannar",
        priceSek: 40,
        shopId: otherShop,
        attributes: [{ label: "Märke", value: "Acne" }],
        imageStorageId,
        category: "Jackor",
        userContext: "lämna inte ut",
      });
      const orphan = await ctx.db.insert("products", {
        title: "Utan butik",
        description: "",
        priceSek: 10,
        attributes: [],
        imageStorageId,
      });
      const demoProduct = await ctx.db.insert("products", {
        title: "Demovara",
        description: "",
        priceSek: 20,
        shopId: demoShop,
        attributes: [{ label: "Storlek", value: "M" }],
        imageStorageId,
        category: "Skjortor",
      });
      const processing = await ctx.db.insert("products", {
        title: "Bearbetar",
        description: "",
        priceSek: 0,
        shopId: demoShop,
        attributes: [],
        imageStorageId,
        captureStatus: "processing",
      });
      return { demoShop, otherShop, otherProduct, orphan, demoProduct, processing };
    });

    const first = await t.mutation(internal.taxonomy.ensureDemoEnvironment, {});
    expect(first.shopId).toBe(ids.demoShop);
    const second = await t.mutation(internal.taxonomy.ensureDemoEnvironment, {});
    expect(second.shopId).toBe(ids.demoShop);

    const after = await t.run(async (ctx) => {
      const other = await ctx.db.get("products", ids.otherProduct);
      const orphan = await ctx.db.get("products", ids.orphan);
      const demo = await ctx.db.get("products", ids.demoProduct);
      const processing = await ctx.db.get("products", ids.processing);
      const otherNodes = await ctx.db
        .query("taxonomyNodes")
        .withIndex("by_shop", (q) => q.eq("shopId", ids.otherShop))
        .collect();
      const demoNodes = await ctx.db
        .query("taxonomyNodes")
        .withIndex("by_shop", (q) => q.eq("shopId", ids.demoShop))
        .collect();
      return { other, orphan, demo, processing, otherNodes, demoNodes };
    });

    expect(after.other?.shopId).toBe(ids.otherShop);
    expect(after.other?.categoryId).toBeUndefined();
    expect(after.other?.category).toBe("Jackor");
    expect(after.other?.userContext).toBe("lämna inte ut");
    expect(after.other?.attributes).toEqual([{ label: "Märke", value: "Acne" }]);
    expect(after.otherNodes).toHaveLength(0);
    expect(after.orphan?.shopId).toBeUndefined();
    expect(after.processing?.categoryId).toBeUndefined();
    expect(after.demo?.shopId).toBe(ids.demoShop);
    expect(after.demo?.category).toBeUndefined();
    expect(after.demo?.categoryId).toBeDefined();
    expect(after.demo?.attributes[0]).toMatchObject({
      key: "size",
      type: "text",
    });
    expect(after.demoNodes.length).toBeGreaterThan(0);

    const categoryId = after.demo?.categoryId;
    const nodeCount = after.demoNodes.length;
    await t.mutation(internal.taxonomy.ensureDemoEnvironment, {});
    const rerun = await t.run(async (ctx) => {
      const demo = await ctx.db.get("products", ids.demoProduct);
      const demoNodes = await ctx.db
        .query("taxonomyNodes")
        .withIndex("by_shop", (q) => q.eq("shopId", ids.demoShop))
        .collect();
      return { demo, nodeCount: demoNodes.length };
    });
    expect(rerun.demo?.categoryId).toBe(categoryId);
    expect(rerun.nodeCount).toBe(nodeCount);
  });

  test("demoinloggning kräver miljövariabel och mall-API:t är borta", async () => {
    const previous = process.env.DEMO_AUTH_PASSWORD;
    delete process.env.DEMO_AUTH_PASSWORD;
    const t = convexTest(schema, modules);
    try {
      await expect(t.action(api.demoAuth.signInDemo, {})).rejects.toThrow(
        /inte konfigurerad/,
      );
      const removedTemplate = api as unknown as {
        myFunctions: {
          listNumbers: FunctionReference<"query", "public", { count: number }>;
        };
        shops: {
          ensureDemoShopAndBackfill: FunctionReference<"mutation", "public">;
        };
      };
      await expect(
        t.query(removedTemplate.myFunctions.listNumbers, { count: 1 }),
      ).rejects.toThrow();
      await expect(
        t.mutation(removedTemplate.shops.ensureDemoShopAndBackfill, {}),
      ).rejects.toThrow();
    } finally {
      if (previous === undefined) {
        delete process.env.DEMO_AUTH_PASSWORD;
      } else {
        process.env.DEMO_AUTH_PASSWORD = previous;
      }
    }
  });

  test("saknat demokonto tolkas inte som fel lösenord", () => {
    expect(isMissingDemoAccount(new Error("InvalidAccountId"))).toBe(true);
    expect(
      isMissingDemoAccount(
        new Error(
          "[CONVEX A(auth:signIn)] Server Error Uncaught Error: InvalidAccountId",
        ),
      ),
    ).toBe(true);
    expect(isMissingDemoAccount(new Error("Invalid credentials"))).toBe(true);
    expect(isMissingDemoAccount(new Error("InvalidSecret"))).toBe(false);
    expect(isMissingDemoAccount(new Error("TooManyFailedAttempts"))).toBe(false);
  });

  test(
    "signInDemo skapar demokonto, butik och medlemskap och är idempotent",
    async () => {
      const previous = {
        password: process.env.DEMO_AUTH_PASSWORD,
        jwt: process.env.JWT_PRIVATE_KEY,
        site: process.env.CONVEX_SITE_URL,
      };
      process.env.DEMO_AUTH_PASSWORD = "test-demo-pass";
      process.env.JWT_PRIVATE_KEY = await rsaPrivateKeyPem();
      process.env.CONVEX_SITE_URL = "http://127.0.0.1:3210";
      const t = convexTest(schema, modules);
      try {
        await t.run(async (ctx) => {
          await ctx.db.insert("shops", {
            name: "Redan exempel",
            slug: "demo",
          });
        });

        const first = await t.action(api.demoAuth.signInDemo, {});
        expect(first.token.length).toBeGreaterThan(20);
        expect(first.refreshToken.length).toBeGreaterThan(10);

        const created = await demoSnapshot(t);
        expect(created.accounts).toHaveLength(1);
        expect(created.accounts[0]?.providerAccountId).toBe(DEMO_AUTH_EMAIL);
        expect(created.shops).toHaveLength(1);
        expect(created.shops[0]?.name).toBe("Redan exempel");
        expect(created.memberships).toHaveLength(1);
        expect(created.memberships[0]?.userId).toBe(created.accounts[0]?.userId);
        expect(created.roots).toHaveLength(1);

        await t.run(async (ctx) => {
          const membership = await ctx.db.query("shopMemberships").first();
          if (membership) {
            await ctx.db.delete("shopMemberships", membership._id);
          }
        });

        const second = await t.action(api.demoAuth.signInDemo, {});
        expect(second.token.length).toBeGreaterThan(20);
        const repaired = await demoSnapshot(t);
        expect(repaired.accounts).toHaveLength(1);
        expect(repaired.shops).toHaveLength(1);
        expect(repaired.shops[0]?._id).toBe(created.shops[0]?._id);
        expect(repaired.memberships).toHaveLength(1);
        expect(repaired.memberships[0]?.userId).toBe(created.accounts[0]?.userId);
        expect(repaired.roots).toHaveLength(1);

        await expect(
          t.action(api.auth.signIn, {
            provider: "password",
            params: {
              email: DEMO_AUTH_EMAIL,
              password: "test-demo-pass",
              flow: "signIn",
            },
          }),
        ).resolves.toMatchObject({
          tokens: { token: expect.any(String), refreshToken: expect.any(String) },
        });
      } finally {
        restoreEnv(previous);
      }
    },
    60_000,
  );

  test(
    "signInDemo skriver inte över ett demokonto med annat lösenord",
    async () => {
      const previous = {
        password: process.env.DEMO_AUTH_PASSWORD,
        jwt: process.env.JWT_PRIVATE_KEY,
        site: process.env.CONVEX_SITE_URL,
      };
      process.env.DEMO_AUTH_PASSWORD = "test-demo-pass";
      process.env.JWT_PRIVATE_KEY = await rsaPrivateKeyPem();
      process.env.CONVEX_SITE_URL = "http://127.0.0.1:3210";
      const t = convexTest(schema, modules);
      try {
        await t.action(api.auth.signIn, {
          provider: "password",
          params: {
            email: DEMO_AUTH_EMAIL,
            password: "annat-losenord",
            flow: "signUp",
          },
        });
        await expect(t.action(api.demoAuth.signInDemo, {})).rejects.toThrow(
          /kunde inte öppnas/,
        );
        const snapshot = await demoSnapshot(t);
        expect(snapshot.accounts).toHaveLength(1);
        expect(snapshot.shops).toHaveLength(1);
        expect(snapshot.memberships).toHaveLength(1);
        await expect(
          t.action(api.auth.signIn, {
            provider: "password",
            params: {
              email: DEMO_AUTH_EMAIL,
              password: "annat-losenord",
              flow: "signIn",
            },
          }),
        ).resolves.toMatchObject({
          tokens: { token: expect.any(String) },
        });
      } finally {
        restoreEnv(previous);
      }
    },
    60_000,
  );
});

function restoreEnv(previous: {
  password: string | undefined;
  jwt: string | undefined;
  site: string | undefined;
}) {
  if (previous.password === undefined) {
    delete process.env.DEMO_AUTH_PASSWORD;
  } else {
    process.env.DEMO_AUTH_PASSWORD = previous.password;
  }
  if (previous.jwt === undefined) {
    delete process.env.JWT_PRIVATE_KEY;
  } else {
    process.env.JWT_PRIVATE_KEY = previous.jwt;
  }
  if (previous.site === undefined) {
    delete process.env.CONVEX_SITE_URL;
  } else {
    process.env.CONVEX_SITE_URL = previous.site;
  }
}

async function rsaPrivateKeyPem(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key.privateKey);
  const bytes = new Uint8Array(pkcs8);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

async function demoSnapshot(t: TestConvex<typeof schema>) {
  return await t.run(async (ctx) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", DEMO_AUTH_EMAIL),
      )
      .collect();
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", "demo"))
      .collect();
    const shopId = shops[0]?._id;
    const memberships = shopId
      ? (
          await ctx.db
            .query("shopMemberships")
            .withIndex("by_shop", (q) => q.eq("shopId", shopId))
            .collect()
        ).filter((membership) => membership.userId === accounts[0]?.userId)
      : [];
    const roots = shopId
      ? (
          await ctx.db
            .query("taxonomyNodes")
            .withIndex("by_shop", (q) => q.eq("shopId", shopId))
            .collect()
        ).filter((node) => node.slug === "sortiment" && node.parentId === null)
      : [];
    return { accounts, shops, memberships, roots };
  });
}
