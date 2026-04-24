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
    /** Full path from root to leaf, e.g. ["Sortiment","Kläder","Klänningar"] */
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
    unit: unitEnum.optional(),
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
    unit: unitEnum.optional(),
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

export type ProductListingAI = z.infer<typeof productListingAISchema>;
export type CategoryResolutionAI = z.infer<typeof categoryResolutionAISchema>;
