import { v } from "convex/values";

const textKeys = v.union(
  v.literal("brand"),
  v.literal("size"),
  v.literal("material"),
  v.literal("color"),
  v.literal("era"),
  v.literal("gender"),
  v.literal("fit"),
);

const numberKeys = v.union(
  v.literal("weight"),
  v.literal("dimensions"),
  v.literal("heel_height"),
  v.literal("chest"),
  v.literal("waist"),
  v.literal("inseam"),
  v.literal("sleeve"),
  v.literal("length"),
  v.literal("width"),
);

export type ProductAttribute =
  | {
      key:
        | "brand"
        | "size"
        | "material"
        | "color"
        | "era"
        | "gender"
        | "fit";
      type: "text";
      text: string;
    }
  | {
      key:
        | "weight"
        | "dimensions"
        | "heel_height"
        | "chest"
        | "waist"
        | "inseam"
        | "sleeve"
        | "length"
        | "width";
      type: "number";
      value: number;
      unit?: string;
    }
  | {
      key: "condition";
      type: "enum";
      enumKey:
        | "new_with_tags"
        | "excellent"
        | "good"
        | "fair"
        | "poor";
    }
  | {
      key: "custom";
      type: "text";
      customLabelSv: string;
      text: string;
    }
  | {
      key: "custom";
      type: "number";
      customLabelSv: string;
      value: number;
      unit?: string;
    };

export const productAttributeValidator = v.union(
  v.object({
    key: textKeys,
    type: v.literal("text"),
    text: v.string(),
  }),
  v.object({
    key: numberKeys,
    type: v.literal("number"),
    value: v.number(),
    unit: v.optional(v.string()),
  }),
  v.object({
    key: v.literal("condition"),
    type: v.literal("enum"),
    enumKey: v.union(
      v.literal("new_with_tags"),
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor"),
    ),
  }),
  v.object({
    key: v.literal("custom"),
    type: v.literal("text"),
    customLabelSv: v.string(),
    text: v.string(),
  }),
  v.object({
    key: v.literal("custom"),
    type: v.literal("number"),
    customLabelSv: v.string(),
    value: v.number(),
    unit: v.optional(v.string()),
  }),
);

/**
 * Pre-migration rows used `{ label, value }` without `key`/`type`.
 * Allowed on stored documents until `ensureDemoEnvironment` rewrites them.
 */
export const legacyProductAttributeValidator = v.object({
  label: v.string(),
  value: v.string(),
});

export const storedProductAttributeValidator = v.union(
  productAttributeValidator,
  legacyProductAttributeValidator,
);
