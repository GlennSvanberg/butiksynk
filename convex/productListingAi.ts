"use node";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { Jimp } from "jimp";
import { v } from "convex/values";
import {
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  PRODUCT_ATTRIBUTE_KEYS,
} from "../shared/attributes";
import { productListingAISchema } from "../shared/productAiSchema";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ProductAttribute } from "./lib/productAttributes";
import type { ProductListingAI } from "../shared/productAiSchema";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Output pixels (1:1). Gemini may still return non-square; crop to square PNG before storage. */
const PRODUCT_IMAGE_SQUARE_PX = 1024;

const STUDIO_PROMPT = `Du är en e-handelsfotograf. Gör om denna bild till ett proffsigt produktfoto för en second hand- eller vintagebutik:
- Bildformat: strikt kvadratisk (1:1 bildförhållande), t.ex. varan centrerad i en kvadratisk komposition.
- Neutral bakgrund: ren vit eller mycket ljusgrå studio, mjuk skugga under varan om det passar.
- Centrera varan, behåll äkta färger och texturer (inga överdrivna filter).
- Ta bort stökig butiksmiljö; fokus enbart på varan.
Svara med en ny bild (image output) enligt modellens image modality.`;

async function toSquarePng(buf: Buffer): Promise<Buffer> {
  const image = await Jimp.read(buf);
  image.cover({
    w: PRODUCT_IMAGE_SQUARE_PX,
    h: PRODUCT_IMAGE_SQUARE_PX,
  });
  return await image.getBuffer("image/png");
}

function bufferFromGeminiResponse(data: unknown): Buffer | null {
  const root = data as {
    candidates?: Array<{
      content?: { parts?: Array<unknown> };
    }>;
  };
  const parts = root.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }
    const p = part as Record<string, unknown>;
    const inline =
      (p.inlineData as Record<string, unknown> | undefined) ??
      (p.inline_data as Record<string, unknown> | undefined);
    if (!inline) {
      continue;
    }
    const dataB64 =
      (inline.data as string | undefined) ??
      (inline.data_base64 as string | undefined);
    if (typeof dataB64 === "string" && dataB64.length > 0) {
      return Buffer.from(dataB64, "base64");
    }
  }
  return null;
}

async function runGeminiProductImage(
  base64: string,
  mimeType: string,
): Promise<Buffer | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY saknas i Convex-miljön.");
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: base64,
            },
          },
          { text: STUDIO_PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 400)}`);
  }

  const json: unknown = await res.json();
  return bufferFromGeminiResponse(json);
}

/** Normaliserar AI-attribut till Convex-validerad struktur */
function normalizeAiAttributes(ai: ProductListingAI["attributes"]): Array<ProductAttribute> {
  const out: Array<ProductAttribute> = [];
  for (const raw of ai) {
    if (raw.type === "enum") {
      out.push({
        key: "condition",
        type: "enum",
        enumKey: raw.enumKey,
      });
      continue;
    }
    if (raw.key === "custom" && raw.type === "custom_text") {
      out.push({
        key: "custom",
        type: "text",
        customLabelSv: raw.customLabelSv,
        text: raw.text,
      });
      continue;
    }
    if (raw.type === "custom_number") {
      out.push({
        key: "custom",
        type: "number",
        customLabelSv: raw.customLabelSv,
        value: raw.value,
        unit: raw.unit,
      });
      continue;
    }
    if (raw.type === "text") {
      out.push({
        key: raw.key,
        type: "text",
        text: raw.text,
      });
      continue;
    }
    out.push({
      key: raw.key,
      type: "number",
      value: raw.value,
      unit: raw.unit,
    });
  }
  return out;
}

async function runOpenAIListing(
  openai: OpenAI,
  base64: string,
  mimeType: string,
  taxonomySnapshot: string,
): Promise<ProductListingAI> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const allowedKeys = PRODUCT_ATTRIBUTE_KEYS.join(", ");
  const units = COMMON_UNITS.join(", ");
  const conditionHints = Object.entries(CONDITION_LABEL_SV)
    .map(([k, sv]) => `${k} (${sv})`)
    .join("; ");

  const taxonomyBlock =
    taxonomySnapshot.trim().length > 0
      ? `\nBefintlig kategoriträd (välj exakt path i läget existing, eller new_leaf för ny undernod):\n${taxonomySnapshot}\n`
      : "\n(Inget kategoriträd finns än — använd new_leaf under tomt föräldravärde eller existing med path [\"Sortiment\"] efter seed.)\n";

  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Du hjälper svenska vintage- och second hand-butiker. Alla texter ska vara på svenska. " +
          "Priset priceSek är ett heltal i svenska kronor, rimligt för begagnat. " +
          "Kategori: ange categoryResolution.mode existing med path-array som matchar ett befintligt spår ordagrant, " +
          "eller mode new_leaf med parentPath och suggestedNameSv om ingen nod passar. " +
          "Undvik överlapp — välj mest specifika befintliga bladnod om möjligt." +
          taxonomyBlock +
          `\nTillåtna attributnycklar (key): ${allowedKeys}. Skick (condition) ska som enumKey vara ett av: ${conditionHints}. ` +
          `Numeriska attribut använder type "number", value är tal, och unit är valfri (${units}). ` +
          'Custom: type "custom_text" eller "custom_number" med customLabelSv. ' +
          "Storlek, märke m.m. är ordinarie text-attribut.",
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text:
              "Analysera fotot och fyll i produktdata för en annons. Beskrivning ska vara säljande men ärlig om skick.",
          },
        ],
      },
    ],
    response_format: zodResponseFormat(productListingAISchema, "product_listing"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("OpenAI returnerade ingen strukturerad produktdata.");
  }
  return parsed;
}

export const runPipeline = internalAction({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const fail = async (message: string) => {
      await ctx.runMutation(internal.products.markCaptureFailed, {
        productId: args.productId,
        error: message,
      });
    };

    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        await fail("OPENAI_API_KEY saknas i Convex-miljön.");
        return;
      }

      const meta = await ctx.runQuery(internal.products.getProductForPipeline, {
        productId: args.productId,
      });

      if (!meta?.rawImageUrl) {
        return;
      }

      if (!meta.shopId) {
        await fail("Butik saknas för produkten — kunde inte koppla taxonomi.");
        return;
      }

      const taxonomySnapshot: string = await ctx.runQuery(
        internal.taxonomy.getTaxonomySnapshotForAi,
        {
          shopId: meta.shopId,
        },
      );

      const imageRes = await fetch(meta.rawImageUrl, {
        signal: AbortSignal.timeout(60_000),
      });
      if (!imageRes.ok) {
        await fail("Kunde inte hämta uppladdad bild.");
        return;
      }

      const arrayBuf = await imageRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const base64 = buf.toString("base64");
      const mimeType =
        imageRes.headers.get("content-type")?.split(";")[0]?.trim() ||
        "image/jpeg";

      const openai = new OpenAI({ apiKey: openaiKey });

      const [listingOutcome, geminiOutcome] = await Promise.allSettled([
        runOpenAIListing(openai, base64, mimeType, taxonomySnapshot),
        runGeminiProductImage(base64, mimeType),
      ]);

      if (listingOutcome.status === "rejected") {
        const reason = listingOutcome.reason;
        const message =
          reason instanceof Error
            ? reason.message
            : "Okänt fel vid produktdata (OpenAI).";
        await fail(message);
        return;
      }

      const listing = listingOutcome.value;

      const revalidate = productListingAISchema.safeParse(listing);
      if (!revalidate.success) {
        await fail("AI-metadata var ogiltig.");
        return;
      }

      const priceSek = Math.max(
        1,
        Math.min(1_000_000, Math.round(Math.abs(revalidate.data.priceSek))),
      );

      const resolved = await ctx.runMutation(
        internal.taxonomy.resolveCategoryProposal,
        {
          shopId: meta.shopId,
          categoryResolution: revalidate.data.categoryResolution,
        },
      );

      const attributes = normalizeAiAttributes(revalidate.data.attributes);

      const geminiBuf =
        geminiOutcome.status === "fulfilled" ? geminiOutcome.value : null;

      const baseApply = {
        productId: args.productId,
        title: revalidate.data.title,
        description: revalidate.data.description,
        priceSek,
        categoryId: resolved.categoryId,
        categoryPathCached: resolved.categoryPathCached,
        attributes,
      };

      if (!geminiBuf || geminiBuf.length < 100) {
        await ctx.runMutation(internal.products.applyAiListingResult, baseApply);
        return;
      }

      let pngToUpload: Buffer;
      try {
        pngToUpload = await toSquarePng(geminiBuf);
      } catch {
        pngToUpload = geminiBuf;
      }

      const postUrl: string = await ctx.runMutation(
        api.products.generateUploadUrl,
        {},
      );

      const uploadRes = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(pngToUpload),
        signal: AbortSignal.timeout(60_000),
      });

      if (!uploadRes.ok) {
        await fail("Kunde inte spara processad bild.");
        return;
      }

      const uploadJson = (await uploadRes.json()) as { storageId?: string };
      if (!uploadJson.storageId) {
        await fail("Svar från fillagring saknar storageId.");
        return;
      }

      await ctx.runMutation(internal.products.applyAiListingResult, {
        ...baseApply,
        processedImageStorageId: uploadJson.storageId as Id<"_storage">,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Okänt fel vid AI-bearbetning.";
      await fail(message);
    }
  },
});
