"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { productListingAISchema } from "../shared/productAiSchema";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ProductListingAI } from "../shared/productAiSchema";

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const STUDIO_PROMPT = `Du är en e-handelsfotograf. Gör om denna bild till ett proffsigt produktfoto för en second hand- eller vintagebutik:
- Neutral bakgrund: ren vit eller mycket ljusgrå studio, mjuk skugga under varan om det passar.
- Centrera varan, behåll äkta färger och texturer (inga överdrivna filter).
- Ta bort stökig butiksmiljö; fokus enbart på varan.
Svara med en ny bild (image output) enligt modellens image modality.`;

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
    throw new Error(
      `Gemini ${res.status}: ${errText.slice(0, 400)}`,
    );
  }

  const json: unknown = await res.json();
  return bufferFromGeminiResponse(json);
}

async function runOpenAIListing(
  openai: OpenAI,
  base64: string,
  mimeType: string,
): Promise<ProductListingAI> {
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Du hjälper svenska vintage- och second hand-butiker. Alla texter ska vara på svenska. " +
          "Priset priceSek är ett heltal i svenska kronor, rimligt för begagnat. " +
          "Kategori ska vara kort (t.ex. Klänningar, Ytterplagg, Skor). " +
          "Attribut: använd tydliga etiketter (Märke, Storlek, Material, Skick, Färg, …).",
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

      const [listing, geminiBuf] = await Promise.all([
        runOpenAIListing(openai, base64, mimeType),
        runGeminiProductImage(base64, mimeType),
      ]);

      const revalidate = productListingAISchema.safeParse(listing);
      if (!revalidate.success) {
        await fail("AI-metadata var ogiltig.");
        return;
      }

      const priceSek = Math.max(
        1,
        Math.min(1_000_000, Math.round(Math.abs(revalidate.data.priceSek))),
      );

      if (!geminiBuf || geminiBuf.length < 100) {
        await fail("Kunde inte skapa produktfoto (Gemini).");
        return;
      }

      const postUrl: string = await ctx.runMutation(
        api.products.generateUploadUrl,
        {},
      );

      const uploadRes = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array(geminiBuf),
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
        productId: args.productId,
        title: revalidate.data.title,
        description: revalidate.data.description,
        priceSek,
        category: revalidate.data.category,
        attributes: revalidate.data.attributes,
        processedImageStorageId: uploadJson.storageId as Id<"_storage">,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Okänt fel vid AI-bearbetning.";
      await fail(message);
    }
  },
});
