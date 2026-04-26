"use node";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { v } from "convex/values";
import {
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  PRODUCT_ATTRIBUTE_KEYS,
} from "../shared/attributes";
import { normalizeListingPriceSek } from "../shared/listingPrice";
import {
  productListingBodyAISchema,
  productPriceAISchema,
} from "../shared/productAiSchema";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { normalizeAiAttributes } from "./lib/normalizeAiAttributes";
import type { Id } from "./_generated/dataModel";
import type { ProductAttribute } from "./lib/productAttributes";

const OPENAI_LISTING_MODEL = "gpt-5.4-mini";
const OPENAI_LISTING_REASONING_EFFORT = "low" as const;
const ROOT_CATEGORY_NAME = "Sortiment";

function categoryPathForAi(segments: Array<string>): Array<string> {
  if (segments[0]?.trim().toLocaleLowerCase("sv") === ROOT_CATEGORY_NAME.toLocaleLowerCase("sv")) {
    return segments.slice(1);
  }
  return segments;
}

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
    if (
      product.captureStatus === "processing" &&
      product.captureListingReady !== true
    ) {
      throw new Error("Vänta tills AI-listan är klar innan du berikar.");
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
        ? `\nBefintligt kategoriträd (välj exakt path i läget existing, eller new_leaf för ny undernod):\n${taxonomySnapshot}\n`
        : "\n(Inga kategorier finns än — använd new_leaf med tom parentPath och ett konkret suggestedNameSv.)\n";

    const currentPayload = {
      title: product.title,
      description: product.description,
      priceSek: product.priceSek,
      categoryPathSegments: categoryPathForAi(product.categoryPathSegments),
      categoryId: product.categoryId,
      attributes: product.attributes,
    };

    const openai = new OpenAI({ apiKey: openaiKey });

    const userPayload = JSON.stringify(
      {
        nuvarandeProdukt: currentPayload,
        anvandarensInstruktioner: notes,
      },
      null,
      0,
    );

    const [priceCompletion, bodyCompletion] = await Promise.all([
      openai.beta.chat.completions.parse({
        model: OPENAI_LISTING_MODEL,
        reasoning_effort: OPENAI_LISTING_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content:
              "Du hjälper svenska vintage- och second hand-butiker att uppdatera pris på befintliga produktlistor. " +
              "Du får nuvarande produktdata (JSON) plus användarens fria instruktioner. " +
              "Uppdatera priset enligt instruktionerna när de berör pris eller när ett nytt pris rimligen följer av dem; annars behåll samma nivå som i nuvarande data. " +
              "priceSek är ett heltal i svenska kronor. Använd runda, enkla priser som 50, 200 eller 1000; använd inte priser som slutar på 9, t.ex. 49 eller 199.",
          },
          { role: "user", content: userPayload },
        ],
        response_format: zodResponseFormat(
          productPriceAISchema,
          "enrich_product_price",
        ),
      }),
      openai.beta.chat.completions.parse({
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
              "Identifiera först internt exakt vilken vara produktdatan och instruktionerna beskriver: produkttyp, användning och kategori. " +
              "Om närliggande produkttyper är möjliga, välj den som bäst matchar helheten och skriv inte ut osäkerhet. " +
              "Titel och beskrivning ska vara tydliga produkttexter med självförtroende, inte bildanalys. " +
              "Undvik formuleringar som \"på bilden\", \"ser ut\", \"verkar\", \"troligen\", \"kanske\" och liknande tveksamheter. " +
              "Kategori: ange categoryResolution.mode existing med path-array som matchar ett befintligt spår ordagrant utan teknisk rotnod, " +
              "eller mode new_leaf med parentPath till konkret förälder (t.ex. [\"Kläder\"]) och suggestedNameSv om ingen nod passar. " +
              "I läget existing får path aldrig vara enbart rotnoden Sortiment — minst en konkret gren eller blad under Sortiment, annars new_leaf. " +
              "Välj aldrig generiska fångstkategorier som \"Sortiment\", \"Övrigt\", \"Diverse\" eller liknande — skapa i stället new_leaf med ett beskrivande svenskt namn. " +
              "Använd inte kategorier som \"Importerade\" — välj en konkret kategori eller new_leaf. " +
              taxonomyBlock +
              `\nTillåtna attributnycklar (key): ${allowedKeys}. Skick (condition) ska som enumKey vara ett av: ${conditionHints}. ` +
              `Numeriska attribut använder type "number", value är tal, och unit är valfri (${units}). ` +
              'Custom: type "custom_text" eller "custom_number" med customLabelSv. ' +
              "Returnera titel, beskrivning, kategori och attribut enligt schemat (inte pris — det hanteras separat).",
          },
          { role: "user", content: userPayload },
        ],
        response_format: zodResponseFormat(
          productListingBodyAISchema,
          "enrich_product_listing_body",
        ),
      }),
    ]);

    const rawPrice = priceCompletion.choices[0]?.message?.parsed;
    const rawBody = bodyCompletion.choices[0]?.message?.parsed;
    if (!rawPrice || !rawBody) {
      throw new Error("AI returnerade ingen parsad data.");
    }

    const priceRe = productPriceAISchema.safeParse(rawPrice);
    const bodyRe = productListingBodyAISchema.safeParse(rawBody);
    if (!priceRe.success || !bodyRe.success) {
      throw new Error("AI-metadata var ogiltig.");
    }

    const priceSek = normalizeListingPriceSek(priceRe.data.priceSek);

    const resolved: { categoryId: Id<"taxonomyNodes"> } =
      await ctx.runMutation(internal.taxonomy.resolveCategoryProposal, {
        shopId: args.shopId,
        listingTitleSv: bodyRe.data.title,
        categoryResolution: bodyRe.data.categoryResolution,
      });

    const attributes = normalizeAiAttributes(bodyRe.data.attributes);

    await ctx.runMutation(api.products.updateProduct, {
      productId: args.productId,
      shopId: args.shopId,
      title: bodyRe.data.title,
      description: bodyRe.data.description,
      priceSek,
      categoryId: resolved.categoryId,
      attributes,
    });

    return {
      title: bodyRe.data.title,
      description: bodyRe.data.description,
      priceSek,
      categoryId: resolved.categoryId,
      attributes,
    };
  },
});
