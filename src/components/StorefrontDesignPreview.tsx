import type { CSSProperties } from 'react'

const defaultPrimary = '#1b3a29'
const defaultAccent = '#c05746'
const defaultBg = '#f9f8f6'
const defaultSurface = '#ffffff'
const defaultText = '#1a1a1a'

function pickColor(value: string, fallback: string) {
  const t = value.trim()
  return t || fallback
}

export type StorefrontDesignPreviewProps = {
  internalName: string
  storefrontDisplayName: string
  contactEmail: string
  contactPhone: string
  contactWebsite: string
  contactNote: string
  colorPrimary: string
  colorAccent: string
  colorBg: string
  colorSurface: string
  logoUrl: string | null | undefined
}

/**
 * Live preview of storefront chrome (header + contact footer) using draft form values.
 */
export function StorefrontDesignPreview({
  internalName,
  storefrontDisplayName,
  contactEmail,
  contactPhone,
  contactWebsite,
  contactNote,
  colorPrimary,
  colorAccent,
  colorBg,
  colorSurface,
  logoUrl,
}: StorefrontDesignPreviewProps) {
  const style: CSSProperties & Record<string, string> = {
    '--sf-primary': pickColor(colorPrimary, defaultPrimary),
    '--sf-accent': pickColor(colorAccent, defaultAccent),
    '--sf-bg': pickColor(colorBg, defaultBg),
    '--sf-surface': pickColor(colorSurface, defaultSurface),
    '--sf-text': defaultText,
  }

  const displayName =
    storefrontDisplayName.trim() || internalName

  const hasContact =
    !!(
      contactEmail.trim() ||
      contactPhone.trim() ||
      contactWebsite.trim() ||
      contactNote.trim()
    )

  return (
    <div
      className="overflow-hidden rounded-xl border border-brand-dark/15 bg-paper-grain font-sans text-[var(--sf-text)] shadow-md"
      style={{ ...style, backgroundColor: 'var(--sf-bg)' }}
    >
      <header className="border-b border-[color:var(--sf-primary)]/15 bg-[var(--sf-bg)]/95">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-9 max-w-[9rem] shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50 sm:text-xs">
                Butik
              </p>
              <p className="font-heading text-lg font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-xl">
                {displayName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 opacity-60">
            <span
              className="inline-flex rounded-lg px-2 py-1.5 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: 'var(--sf-primary)' }}
            >
              Sälj via …
            </span>
            <span className="rounded-lg px-2 py-1.5 text-xs font-medium text-[color:var(--sf-primary)]/80">
              Startsida
            </span>
          </div>
        </div>
      </header>

      <div
        className="border-b border-[color:var(--sf-primary)]/8 border-l-[3px] px-3 py-6 sm:px-4"
        style={{ borderLeftColor: 'var(--sf-accent)' }}
      >
        <p className="text-xs leading-relaxed text-[color:var(--sf-primary)]/55 sm:text-sm">
          Produktlistan visas här i den riktiga butiken. Ovanför ser du sidhuvud som
          kunderna möter.
        </p>
      </div>

      {hasContact ? (
        <footer className="border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)] px-3 py-5 sm:px-4">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50 sm:text-xs">
            Kontakt
          </p>
          <ul className="mt-2 space-y-1 text-xs text-[color:var(--sf-primary)]/85 sm:text-sm">
            {contactEmail.trim() ? (
              <li>
                <span className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2">
                  {contactEmail.trim()}
                </span>
              </li>
            ) : null}
            {contactPhone.trim() ? (
              <li>
                <span className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2">
                  {contactPhone.trim()}
                </span>
              </li>
            ) : null}
            {contactWebsite.trim() ? (
              <li>
                <span className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2">
                  {contactWebsite.trim()}
                </span>
              </li>
            ) : null}
            {contactNote.trim() ? (
              <li className="whitespace-pre-line pt-0.5">
                {contactNote.trim()}
              </li>
            ) : null}
          </ul>
        </footer>
      ) : (
        <footer className="border-t border-dashed border-[color:var(--sf-primary)]/15 bg-[var(--sf-surface)]/50 px-3 py-4 sm:px-4">
          <p className="text-xs text-[color:var(--sf-primary)]/50 sm:text-sm">
            Ingen kontaktruta visas förrän minst ett kontaktfält är ifyllt.
          </p>
        </footer>
      )}
    </div>
  )
}
