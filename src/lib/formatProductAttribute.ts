import {
  ATTRIBUTE_LABEL_SV,
  CONDITION_LABEL_SV,
} from '../../shared/attributes'
import type { ProductAttributeKey } from '../../shared/attributes'
import type { Doc } from '../../convex/_generated/dataModel'

type ProductAttr = Doc<"products">["attributes"][number];

const numFmt = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 6 });

function isLegacyLabelValueAttr(
  attr: ProductAttr,
): attr is { label: string; value: string } {
  return !("key" in attr);
}

/** Visningsrad för produktattribut (etikett + formatterat värde med enhet om det finns). */
export function formatProductAttributeDisplay(attr: ProductAttr): {
  label: string;
  value: string;
} {
  if (isLegacyLabelValueAttr(attr)) {
    return { label: attr.label, value: attr.value };
  }

  if (attr.key === "custom") {
    if (attr.type === "number") {
      const v = `${numFmt.format(attr.value)}${attr.unit ? ` ${attr.unit}` : ""}`;
      return {
        label: attr.customLabelSv,
        value: v,
      };
    }
    return {
      label: attr.customLabelSv,
      value: attr.text,
    };
  }

  const label = ATTRIBUTE_LABEL_SV[attr.key as ProductAttributeKey];

  if (attr.type === "enum") {
    const sv = CONDITION_LABEL_SV[attr.enumKey];
    return { label, value: sv };
  }

  if (attr.type === "number") {
    const v = `${numFmt.format(attr.value)}${attr.unit ? ` ${attr.unit}` : ""}`;
    return { label, value: v };
  }

  return { label, value: attr.text };
}
