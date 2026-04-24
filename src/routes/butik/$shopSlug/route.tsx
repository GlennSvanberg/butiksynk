import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../convex/_generated/api'
import type { CSSProperties } from 'react'

export const Route = createFileRoute('/butik/$shopSlug')({
  component: ButikStorefrontLayout,
})

const defaultPrimary = '#1b3a29'
const defaultAccent = '#c05746'
const defaultBg = '#f9f8f6'
const defaultSurface = '#ffffff'
const defaultText = '#1a1a1a'

function ButikStorefrontLayout() {
  const { shopSlug } = Route.useParams()
  const { data: branding, isPending } = useQuery(
    convexQuery(api.shops.getStorefrontBrandingBySlug, { slug: shopSlug }),
  )

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f9f8f6] font-sans text-sm text-[#1b3a29]/75">
        Laddar …
      </div>
    )
  }

  if (!branding) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f9f8f6] px-4 text-center font-sans">
        <p className="font-heading text-xl font-semibold text-[#1b3a29]">
          Butiken hittades inte
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-[#1b3a29] underline decoration-[#1b3a29]/30 underline-offset-4"
        >
          Till startsidan
        </Link>
      </div>
    )
  }

  const style: CSSProperties & Record<string, string> = {
    '--sf-primary': branding.storefrontColorPrimary ?? defaultPrimary,
    '--sf-accent': branding.storefrontColorAccent ?? defaultAccent,
    '--sf-bg': branding.storefrontColorBackground ?? defaultBg,
    '--sf-surface': branding.storefrontColorSurface ?? defaultSurface,
    '--sf-text': defaultText,
  }

  const hasContact =
    !!(
      branding.contactEmail?.trim() ||
      branding.contactPhone?.trim() ||
      branding.contactWebsite?.trim() ||
      branding.contactNote?.trim()
    )

  return (
    <div
      className="min-h-dvh bg-paper-grain font-sans text-[var(--sf-text)]"
      style={{ ...style, backgroundColor: 'var(--sf-bg)' }}
    >
      <header className="border-b border-[color:var(--sf-primary)]/15 bg-[var(--sf-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt=""
                className="h-10 max-w-[10rem] shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
                Butik
              </p>
              <h1 className="font-heading text-xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-2xl">
                {branding.displayName}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to="/login"
              search={{ redirect: '/app/snabb' }}
              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: 'var(--sf-primary)' }}
            >
              Sälj via Butiksynk
            </Link>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--sf-primary)]/80 transition hover:bg-[color:var(--sf-primary)]/5"
            >
              Startsida
            </Link>
          </div>
        </div>
      </header>

      <Outlet />

      {hasContact ? (
        <footer className="mt-auto border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)] px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
              Kontakt
            </p>
            <ul className="mt-3 space-y-1 text-sm text-[color:var(--sf-primary)]/85">
              {branding.contactEmail?.trim() ? (
                <li>
                  <a
                    href={`mailto:${branding.contactEmail.trim()}`}
                    className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2"
                  >
                    {branding.contactEmail.trim()}
                  </a>
                </li>
              ) : null}
              {branding.contactPhone?.trim() ? (
                <li>
                  <a
                    href={`tel:${branding.contactPhone.trim().replace(/\s+/g, '')}`}
                    className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2"
                  >
                    {branding.contactPhone.trim()}
                  </a>
                </li>
              ) : null}
              {branding.contactWebsite?.trim() ? (
                <li>
                  <a
                    href={branding.contactWebsite.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-[color:var(--sf-primary)]/25 underline-offset-2"
                  >
                    {branding.contactWebsite.trim()}
                  </a>
                </li>
              ) : null}
              {branding.contactNote?.trim() ? (
                <li className="whitespace-pre-line pt-1">
                  {branding.contactNote.trim()}
                </li>
              ) : null}
            </ul>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
