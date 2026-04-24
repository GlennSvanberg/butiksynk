import type { ProductListingAI } from "../../shared/productAiSchema";
import type { ProductAttribute } from "./productAttributes";

/** Normaliserar AI-attribut till Convex-validerad struktur. */
export function normalizeAiAttributes(
  ai: ProductListingAI["attributes"],
): Array<ProductAttribute> {
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
