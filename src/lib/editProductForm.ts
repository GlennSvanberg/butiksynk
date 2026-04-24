import { z } from 'zod'
import type { Doc } from '../../convex/_generated/dataModel'

export type StoredProductAttribute = Doc<'products'>['attributes'][number]

export type EditFieldKey = 'title' | 'description' | 'priceSek' | 'categoryId'

export type EditFieldErrors = Partial<Record<EditFieldKey, string>>

export function parsePriceSekToNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  if (normalized === '') {
    return null
  }
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) {
    return null
  }
  return Math.round(n)
}

/** Tillåt endast siffror, mellanslag, komma och punkt i prisfältet. */
export function sanitizePriceInput(raw: string): string {
  return raw.replace(/[^\d\s,.]/g, '')
}

const editProductFormSchema = z.object({
  title: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, 'Titel krävs.')
        .max(500, 'Titel får max 500 tecken.'),
    ),
  description: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'Beskrivning krävs.')),
  priceSek: z.string().superRefine((val, ctx) => {
    const n = parsePriceSekToNumber(val)
    if (n === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ange ett giltigt pris (heltal SEK).',
      })
    }
  }),
  categoryId: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, 'Välj kategori.')),
})

export function validateEditProductForm(input: {
  title: string
  description: string
  priceSek: string
  categoryId: string
}):
  | {
      ok: true
      title: string
      description: string
      priceSek: number
      categoryId: string
    }
  | { ok: false; errors: EditFieldErrors } {
  const parsed = editProductFormSchema.safeParse(input)
  if (!parsed.success) {
    const errors: EditFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path[0]
      if (
        path === 'title' ||
        path === 'description' ||
        path === 'priceSek' ||
        path === 'categoryId'
      ) {
        if (!errors[path]) {
          errors[path] = issue.message
        }
      }
    }
    return { ok: false, errors }
  }
  const priceSek = parsePriceSekToNumber(input.priceSek)
  if (priceSek === null) {
    return {
      ok: false,
      errors: { priceSek: 'Ange ett giltigt pris (heltal SEK).' },
    }
  }
  return {
    ok: true,
    title: parsed.data.title,
    description: parsed.data.description,
    priceSek,
    categoryId: parsed.data.categoryId,
  }
}

function isLegacyAttr(
  attr: StoredProductAttribute,
): attr is { label: string; value: string } {
  return !('key' in attr)
}

/** Rader som är tomma eller ofullständiga tas bort innan mutation. */
export function filterAttributesForMutation(
  attrs: Array<StoredProductAttribute>,
): Array<StoredProductAttribute> {
  const out: Array<StoredProductAttribute> = []
  for (const attr of attrs) {
    if (isLegacyAttr(attr)) {
      if (attr.label.trim() && attr.value.trim()) {
        out.push(attr)
      }
      continue
    }
    if (attr.type === 'enum') {
      out.push(attr)
      continue
    }
    if (attr.key === 'custom') {
      if (attr.type === 'text') {
        if (attr.customLabelSv.trim() && attr.text.trim()) {
          out.push(attr)
        }
        continue
      }
      if (
        attr.customLabelSv.trim() &&
        Number.isFinite(attr.value)
      ) {
        out.push(attr)
      }
      continue
    }
    if (attr.type === 'text' && attr.text.trim()) {
      out.push(attr)
      continue
    }
    if (attr.type === 'number' && Number.isFinite(attr.value)) {
      out.push(attr)
    }
  }
  return out
}

export function serverFormSnapshot(product: {
  title: string
  description: string
  priceSek: number
  categoryId?: string | undefined
  attributes: Array<StoredProductAttribute>
}): string {
  return JSON.stringify({
    title: product.title,
    description: product.description,
    priceSek: product.priceSek,
    categoryId: product.categoryId,
    attributes: product.attributes,
  })
}
