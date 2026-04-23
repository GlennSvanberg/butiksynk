import { z } from "zod";

export const productAttributeAISchema = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(400),
});

/** Strukturerad produktdata från vision-modell (svenska texter). */
export const productListingAISchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  /** SEK; avrundas/normaliseras i pipeline. */
  priceSek: z.number().min(1).max(1_000_000),
  category: z.string().min(1).max(120),
  attributes: z.array(productAttributeAISchema).max(24),
});

export type ProductListingAI = z.infer<typeof productListingAISchema>;
