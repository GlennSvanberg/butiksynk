/** Stable attribute keys for search and AI; display labels are Swedish in the UI. */
export const TEXT_ATTRIBUTE_KEYS = [
  "brand",
  "size",
  "material",
  "color",
  "era",
  "gender",
  "fit",
] as const;

export const NUMBER_ATTRIBUTE_KEYS = [
  "weight",
  "dimensions",
  "heel_height",
  "chest",
  "waist",
  "inseam",
  "sleeve",
  "length",
  "width",
] as const;

export const PRODUCT_ATTRIBUTE_KEYS = [
  ...TEXT_ATTRIBUTE_KEYS,
  ...NUMBER_ATTRIBUTE_KEYS,
  "condition",
  "custom",
] as const;

export type ProductAttributeKey = (typeof PRODUCT_ATTRIBUTE_KEYS)[number];

export type TextAttributeKey = (typeof TEXT_ATTRIBUTE_KEYS)[number];
export type NumberAttributeKey = (typeof NUMBER_ATTRIBUTE_KEYS)[number];

export const CONDITION_ENUM_KEYS = [
  "new_with_tags",
  "excellent",
  "good",
  "fair",
  "poor",
] as const;

export type ConditionEnumKey = (typeof CONDITION_ENUM_KEYS)[number];

/** UI + search: canonical key → Swedish label */
export const ATTRIBUTE_LABEL_SV: Record<
  TextAttributeKey | NumberAttributeKey | "condition" | "custom",
  string
> = {
  brand: "Märke",
  size: "Storlek",
  material: "Material",
  color: "Färg",
  era: "Epok / årtal",
  gender: "Kön / passform",
  fit: "Passform",
  weight: "Vikt",
  dimensions: "Mått",
  heel_height: "Klack",
  chest: "Bröst",
  waist: "Midja",
  inseam: "Innerbenslängd",
  sleeve: "Ärm",
  length: "Längd",
  width: "Bredd",
  condition: "Skick",
  custom: "Övrigt",
};

export const CONDITION_LABEL_SV: Record<ConditionEnumKey, string> = {
  new_with_tags: "Ny med prislapp",
  excellent: "Mycket bra",
  good: "Bra",
  fair: "Acceptabelt",
  poor: "Slitet",
};

/** Allowed units hint for prompts and UI */
export const COMMON_UNITS = ["cm", "mm", "m", "g", "kg", "ml", "l"] as const;
