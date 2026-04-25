import { cssVarsFromStorefrontDraft } from '~/lib/storefrontTheme'

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
  const style = cssVarsFromStorefrontDraft({
    colorPrimary,
    colorAccent,
    colorBg,
    colorSurface,
  })

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
      className="overflow-hidden rounded-2xl border border-brand-dark/15 bg-paper-grain font-sans text-[var(--sf-text)] shadow-md"
      style={{ ...style, backgroundColor: 'var(--sf-bg)' }}
    >
      <header className="border-b border-[color:var(--sf-primary)]/12 bg-[var(--sf-bg)]/95">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${displayName} logotyp`}
                className="h-10 max-w-[8rem] shrink-0 rounded-md object-contain"
              />
            ) : (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] font-heading text-base font-bold text-[color:var(--sf-primary)] shadow-sm"
                aria-hidden
              >
                {displayName.trim().charAt(0).toLocaleUpperCase('sv')}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--sf-primary)]/50">
                Kundbutik
              </p>
              <p className="truncate font-heading text-lg font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-xl">
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
        className="border-b border-[color:var(--sf-primary)]/8 px-3 py-5 sm:px-4"
        style={{ borderLeftColor: 'var(--sf-accent)' }}
      >
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--sf-primary)]/45">
          Sortiment
        </p>
        <p className="mt-2 font-heading text-xl font-bold tracking-tight text-[color:var(--sf-primary)]">
          Upptäck varorna i butiken
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--sf-primary)]/60 sm:text-sm">
          Produktlistan visas här i den riktiga butiken. Sök, filter och kort
          använder samma färger som förhandsvisningen.
        </p>
      </div>

      <footer className="border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)]/95 px-3 py-5 sm:px-4">
        <p className="font-heading text-sm font-semibold text-[color:var(--sf-primary)]">
          {displayName}
        </p>
        <div className="mt-3 rounded-xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)]/45 p-3">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
            {hasContact ? 'Kontakt' : 'Kontaktuppgifter'}
          </p>
          {hasContact ? (
            <ul className="mt-2 space-y-1 text-xs text-[color:var(--sf-primary)]/85 sm:text-sm">
              {contactEmail.trim() ? (
                <li>
                  <span className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4">
                    {contactEmail.trim()}
                  </span>
                </li>
              ) : null}
              {contactPhone.trim() ? (
                <li>
                  <span className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4">
                    {contactPhone.trim()}
                  </span>
                </li>
              ) : null}
              {contactWebsite.trim() ? (
                <li>
                  <span className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4">
                    {contactWebsite.trim()}
                  </span>
                </li>
              ) : null}
              {contactNote.trim() ? (
                <li className="whitespace-pre-line pt-0.5 leading-relaxed text-[color:var(--sf-primary)]/70">
                  {contactNote.trim()}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--sf-primary)]/55 sm:text-sm">
              Kontakta butiken direkt för frågor om varor och öppettider.
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
