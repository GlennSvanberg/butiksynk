"use node";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { Jimp } from "jimp";
import exifParser from "exif-parser";
import { v } from "convex/values";
import {
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  PRODUCT_ATTRIBUTE_KEYS,
} from "../shared/attributes";
import { productListingAISchema } from "../shared/productAiSchema";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ProductAttribute } from "./lib/productAttributes";
import type { ProductListingAI } from "../shared/productAiSchema";

/** Vision + structured listing (svensk copy, kategori, pris). */
const OPENAI_LISTING_MODEL = "gpt-5.4-mini";
const OPENAI_LISTING_REASONING_EFFORT = "low" as const;

/**
 * Google marknadsför Gemini native image som "Nano Banana". Nano Banana 2 =
 * `gemini-3.1-flash-image-preview` (snabb/hög volym; motsvarar Pro-linjen "Nano Banana Pro").
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Output pixels (1:1). Matchar Nano Banana 2 / 3.1 Flash Image 1K 1024×1024; crop om modellen avviker. */
const PRODUCT_IMAGE_SQUARE_PX = 1024;

/** English prompt for Gemini image: pixels + simple webshop brief. */
const STUDIO_PROMPT = `From the attached photo, create one professional product image for an online shop (second-hand / vintage).

Show the same item, centered, on a clean white or very light gray studio background with a subtle shadow if it helps. Square 1:1 composition. Remove distracting background; keep natural colors and texture.

Present the product the way it should appear on a product page: right-side up, with any visible text and logos readable (left-to-right, not upside-down or sideways unless the product itself is designed that way).

Return only the final image.`;

function isJpegBuffer(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

function readExifOrientation(buf: Buffer): number {
  if (!isJpegBuffer(buf)) {
    return 1;
  }
  try {
    const result = exifParser.create(buf).parse();
    const o = result.tags?.Orientation;
    if (typeof o === "number" && o >= 1 && o <= 8) {
      return o;
    }
  } catch {
    // ignore
  }
  return 1;
}

/** Jimp roterar moturs (multipel av 90°). EXIF anger hur lagrade pixlar ska vändas för korrekt vy. */
function applyExifOrientationToJimp(
  image: Awaited<ReturnType<typeof Jimp.read>>,
  orientation: number,
): void {
  switch (orientation) {
    case 1:
      return;
    case 2:
      image.flip({ horizontal: true });
      return;
    case 3:
      image.rotate(180);
      return;
    case 4:
      image.flip({ vertical: true });
      return;
    case 5:
      image.rotate(270);
      image.flip({ horizontal: true });
      return;
    case 6:
      image.rotate(270);
      return;
    case 7:
      image.rotate(90);
      image.flip({ horizontal: true });
      return;
    case 8:
      image.rotate(90);
      return;
    default:
      return;
  }
}

/** Rätar JPEG enligt EXIF Orientation och kodar om till JPEG så vision-modeller får rätt pixlar. */
async function normalizeImageForVision(
  buf: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const orientation = readExifOrientation(buf);
    const image = await Jimp.read(buf);
    applyExifOrientationToJimp(image, orientation);
    const jpegBytes = await image.getBuffer("image/jpeg", { quality: 92 });
    return { buffer: Buffer.from(jpegBytes), mimeType: "image/jpeg" };
  } catch {
    return { buffer: buf, mimeType };
  }
}

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
  let lastImage: Buffer | null = null;
  for (const part of parts) {
    if (!part || typeof part !== "object") {
      continue;
    }
    const p = part as Record<string, unknown>;
    /** Thinking-steg kan innehålla interim-bilder; använd endast slutlig output (Gemini 3 image docs). */
    if (p.thought === true) {
      continue;
    }
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
      lastImage = Buffer.from(dataB64, "base64");
    }
  }
  return lastImage;
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
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
      thinkingConfig: {
        thinkingLevel: "minimal",
        includeThoughts: false,
      },
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
        ...(raw.unit != null ? { unit: raw.unit } : {}),
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
      ...(raw.unit != null ? { unit: raw.unit } : {}),
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
    model: OPENAI_LISTING_MODEL,
    reasoning_effort: OPENAI_LISTING_REASONING_EFFORT,
    messages: [
      {
        role: "system",
        content:
          "Du hjälper svenska vintage- och second hand-butiker. Alla texter ska vara på svenska. " +
          "Priset priceSek är ett heltal i svenska kronor, rimligt för begagnat. " +
          "Kategori: ange categoryResolution.mode existing med path-array som matchar ett befintligt spår ordagrant, " +
          "eller mode new_leaf med parentPath (oftast [\"Sortiment\"]) och suggestedNameSv om ingen nod passar. " +
          "Välj aldrig generiska fångstkategorier som \"Övrigt\", \"Diverse\" eller liknande — skapa i stället new_leaf med ett beskrivande svenskt namn " +
          "(t.ex. produkttyp: \"Brädspel\", \"Pussel\", \"Barnböcker\"). " +
          "Använd inte kategorier som \"Importerade\" (är föråldrade) — välj sortimentsgren eller new_leaf. " +
          "Undvik överlapp — välj mest specifika befintliga bladnod om den verkligen stämmer." +
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
      const rawBuf = Buffer.from(arrayBuf);
      const headerMime =
        imageRes.headers.get("content-type")?.split(";")[0]?.trim() ||
        "image/jpeg";
      const { buffer: visionBuf, mimeType: visionMime } =
        await normalizeImageForVision(rawBuf, headerMime);
      const base64 = visionBuf.toString("base64");

      const openai = new OpenAI({ apiKey: openaiKey });

      const [listingOutcome, geminiOutcome] = await Promise.allSettled([
        runOpenAIListing(openai, base64, visionMime, taxonomySnapshot),
        runGeminiProductImage(base64, visionMime),
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
          listingTitleSv: revalidate.data.title,
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
        attributes,
      };

      let pngToUpload: Buffer | null = null;
      if (geminiBuf && geminiBuf.length >= 100) {
        try {
          pngToUpload = await toSquarePng(geminiBuf);
        } catch {
          pngToUpload = geminiBuf;
        }
      }
      if (!pngToUpload || pngToUpload.length < 100) {
        try {
          pngToUpload = await toSquarePng(visionBuf);
        } catch {
          pngToUpload = null;
        }
      }

      if (!pngToUpload || pngToUpload.length < 100) {
        await ctx.runMutation(internal.products.applyAiListingResult, baseApply);
        return;
      }

      const postUrl: string = await ctx.runMutation(
        internal.products.internalGenerateUploadUrl,
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
