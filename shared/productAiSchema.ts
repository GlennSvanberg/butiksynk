import { z } from "zod";
import {
  COMMON_UNITS,
  CONDITION_ENUM_KEYS,
  NUMBER_ATTRIBUTE_KEYS,
  TEXT_ATTRIBUTE_KEYS,
} from "./attributes";

export const categoryResolutionAISchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    /** Visible path from parent to leaf, e.g. ["Kläder","Jackor"]. */
    path: z.array(z.string()).min(1).max(12),
  }),
  z.object({
    mode: z.literal("new_leaf"),
    /** Path to parent node (may be empty to attach under root). */
    parentPath: z.array(z.string()).max(12),
    suggestedNameSv: z.string().min(1).max(120),
  }),
]);

const textKeyEnum = z.enum(TEXT_ATTRIBUTE_KEYS);
const numberKeyEnum = z.enum(NUMBER_ATTRIBUTE_KEYS);
const unitEnum = z.enum(COMMON_UNITS);

/** z.union (not discriminated on `type`) — fixed keys share type "text" with custom. */
export const productAttributeAISchema = z.union([
  z.object({
    key: textKeyEnum,
    type: z.literal("text"),
    text: z.string().min(1).max(400),
  }),
  z.object({
    key: numberKeyEnum,
    type: z.literal("number"),
    value: z.number(),
    /** Required key for OpenAI structured outputs; use null when no unit. */
    unit: unitEnum.nullable(),
  }),
  z.object({
    key: z.literal("condition"),
    type: z.literal("enum"),
    enumKey: z.enum(CONDITION_ENUM_KEYS),
  }),
  z.object({
    key: z.literal("custom"),
    type: z.literal("custom_text"),
    customLabelSv: z.string().min(1).max(120),
    text: z.string().min(1).max(400),
  }),
  z.object({
    key: z.literal("custom"),
    type: z.literal("custom_number"),
    customLabelSv: z.string().min(1).max(120),
    value: z.number(),
    /** Required key for OpenAI structured outputs; use null when no unit. */
    unit: unitEnum.nullable(),
  }),
]);

/** Strukturerad produktdata från vision-modell (svenska texter). */
export const productListingAISchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  /** SEK; avrundas/normaliseras i pipeline. */
  priceSek: z.number().min(1).max(1_000_000),
  categoryResolution: categoryResolutionAISchema,
  attributes: z.array(productAttributeAISchema).max(24),
});

/** Endast pris — parallellt vision-anrop vid inskanning. */
export const productPriceAISchema = z.object({
  /** SEK; avrundas/normaliseras i pipeline. */
  priceSek: z.number().min(1).max(1_000_000),
});

/** Titel, beskrivning, kategori, attribut utan pris — parallellt med productPriceAISchema. */
export const productListingBodyAISchema = productListingAISchema.omit({
  priceSek: true,
});

export type ProductListingAI = z.infer<typeof productListingAISchema>;
export type ProductPriceAI = z.infer<typeof productPriceAISchema>;
export type ProductListingBodyAI = z.infer<typeof productListingBodyAISchema>;
export type CategoryResolutionAI = z.infer<typeof categoryResolutionAISchema>;
