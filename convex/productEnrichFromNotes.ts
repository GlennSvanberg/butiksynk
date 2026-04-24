"use node";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { v } from "convex/values";
import {
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  PRODUCT_ATTRIBUTE_KEYS,
} from "../shared/attributes";
import { productListingAISchema } from "../shared/productAiSchema";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { normalizeAiAttributes } from "./lib/normalizeAiAttributes";
import type { Id } from "./_generated/dataModel";
import type { ProductAttribute } from "./lib/productAttributes";

const OPENAI_LISTING_MODEL = "gpt-5.4-mini";
const OPENAI_LISTING_REASONING_EFFORT = "low" as const;

export const enrichProductFromNotes = action({
  args: {
    productId: v.id("products"),
    shopId: v.id("shops"),
    notes: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    title: string;
    description: string;
    priceSek: number;
    categoryId: Id<"taxonomyNodes">;
    attributes: Array<ProductAttribute>;
  }> => {
    const notes = args.notes.trim();
    if (!notes) {
      throw new Error("Skriv något i rutan för att berika med AI.");
    }

    const product = await ctx.runQuery(api.products.getProductForEdit, {
      productId: args.productId,
      shopId: args.shopId,
    });
    if (!product) {
      throw new Error("Produkten hittades inte.");
    }
    if (product.captureStatus === "processing") {
      throw new Error("Vänta tills AI är klar innan du berikar.");
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY saknas i Convex-miljön.");
    }

    const taxonomySnapshot: string = await ctx.runQuery(
      internal.taxonomy.getTaxonomySnapshotForAi,
      { shopId: args.shopId },
    );

    const allowedKeys = PRODUCT_ATTRIBUTE_KEYS.join(", ");
    const units = COMMON_UNITS.join(", ");
    const conditionHints = Object.entries(CONDITION_LABEL_SV)
      .map(([k, sv]) => `${k} (${sv})`)
      .join("; ");

    const taxonomyBlock =
      taxonomySnapshot.trim().length > 0
        ? `\nBefintlig kategoriträd (välj exakt path i läget existing, eller new_leaf för ny undernod):\n${taxonomySnapshot}\n`
        : "\n(Inget kategoriträd finns än — använd new_leaf under tomt föräldravärde eller existing med path [\"Sortiment\"] efter seed.)\n";

    const currentPayload = {
      title: product.title,
      description: product.description,
      priceSek: product.priceSek,
      categoryPathSegments: product.categoryPathSegments,
      categoryId: product.categoryId,
      attributes: product.attributes,
    };

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.beta.chat.completions.parse({
      model: OPENAI_LISTING_MODEL,
      reasoning_effort: OPENAI_LISTING_REASONING_EFFORT,
      messages: [
        {
          role: "system",
          content:
            "Du hjälper svenska vintage- och second hand-butiker att uppdatera befintliga produktlistor. " +
            "Alla texter ska vara på svenska. " +
            "Du får nuvarande produktdata (JSON) plus användarens fria instruktioner. " +
            "Uppdatera listan enligt instruktionerna: ändra bara det som instruktionerna berör eller som rimligen följer av dem; " +
            "behåll i övrigt samma innehåll och ton som i nuvarande data om inget annat anges. " +
            "Priset priceSek är ett heltal i svenska kronor. " +
            "Kategori: ange categoryResolution.mode existing med path-array som matchar ett befintligt spår ordagrant, " +
            "eller mode new_leaf med parentPath och suggestedNameSv om ingen nod passar. " +
            "Välj aldrig generiska fångstkategorier som \"Övrigt\", \"Diverse\" eller liknande — skapa i stället new_leaf med ett beskrivande svenskt namn. " +
            "Använd inte kategorier som \"Importerade\" — välj sortimentsgren eller new_leaf. " +
            taxonomyBlock +
            `\nTillåtna attributnycklar (key): ${allowedKeys}. Skick (condition) ska som enumKey vara ett av: ${conditionHints}. ` +
            `Numeriska attribut använder type "number", value är tal, och unit är valfri (${units}). ` +
            'Custom: type "custom_text" eller "custom_number" med customLabelSv. ' +
            "Returnera en fullständig giltig produktlista enligt schemat (samma fält som vid ny listning från foto).",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              nuvarandeProdukt: currentPayload,
              anvandarensInstruktioner: notes,
            },
            null,
            0,
          ),
        },
      ],
      response_format: zodResponseFormat(
        productListingAISchema,
        "product_listing",
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("AI returnerade ingen parsad data.");
    }

    const revalidate = productListingAISchema.safeParse(parsed);
    if (!revalidate.success) {
      throw new Error("AI-metadata var ogiltig.");
    }

    const priceSek = Math.max(
      1,
      Math.min(1_000_000, Math.round(Math.abs(revalidate.data.priceSek))),
    );

    const resolved: { categoryId: Id<"taxonomyNodes"> } =
      await ctx.runMutation(internal.taxonomy.resolveCategoryProposal, {
        shopId: args.shopId,
        listingTitleSv: revalidate.data.title,
        categoryResolution: revalidate.data.categoryResolution,
      });

    const attributes = normalizeAiAttributes(revalidate.data.attributes);

    await ctx.runMutation(api.products.updateProduct, {
      productId: args.productId,
      shopId: args.shopId,
      title: revalidate.data.title,
      description: revalidate.data.description,
      priceSek,
      categoryId: resolved.categoryId,
      attributes,
    });

    return {
      title: revalidate.data.title,
      description: revalidate.data.description,
      priceSek,
      categoryId: resolved.categoryId,
      attributes,
    };
  },
});
