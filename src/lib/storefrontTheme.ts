import type { CSSProperties } from 'react'

/** Default storefront CSS variables (kundbutik). */
export const STOREFRONT_THEME_DEFAULTS = {
  primary: '#1b3a29',
  accent: '#c05746',
  bg: '#f9f8f6',
  surface: '#ffffff',
  text: '#1a1a1a',
} as const

function pickColor(value: string, fallback: string) {
  const t = value.trim()
  return t || fallback
}

/** Tema från publik Convex-branding (butik per slug). */
export function cssVarsFromStorefrontBranding(branding: {
  storefrontColorPrimary?: string | null
  storefrontColorAccent?: string | null
  storefrontColorBackground?: string | null
  storefrontColorSurface?: string | null
}): CSSProperties & Record<string, string> {
  return {
    '--sf-primary':
      branding.storefrontColorPrimary ?? STOREFRONT_THEME_DEFAULTS.primary,
    '--sf-accent':
      branding.storefrontColorAccent ?? STOREFRONT_THEME_DEFAULTS.accent,
    '--sf-bg':
      branding.storefrontColorBackground ?? STOREFRONT_THEME_DEFAULTS.bg,
    '--sf-surface':
      branding.storefrontColorSurface ?? STOREFRONT_THEME_DEFAULTS.surface,
    '--sf-text': STOREFRONT_THEME_DEFAULTS.text,
  }
}

/** Tema från admin-formulärs strängar (tom sträng → fallback). */
export function cssVarsFromStorefrontDraft(colors: {
  colorPrimary: string
  colorAccent: string
  colorBg: string
  colorSurface: string
}): CSSProperties & Record<string, string> {
  return {
    '--sf-primary': pickColor(
      colors.colorPrimary,
      STOREFRONT_THEME_DEFAULTS.primary,
    ),
    '--sf-accent': pickColor(
      colors.colorAccent,
      STOREFRONT_THEME_DEFAULTS.accent,
    ),
    '--sf-bg': pickColor(colors.colorBg, STOREFRONT_THEME_DEFAULTS.bg),
    '--sf-surface': pickColor(
      colors.colorSurface,
      STOREFRONT_THEME_DEFAULTS.surface,
    ),
    '--sf-text': STOREFRONT_THEME_DEFAULTS.text,
  }
}
