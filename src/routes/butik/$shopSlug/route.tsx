import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import type { CSSProperties } from 'react'
import * as React from 'react'
import { api } from '../../../../convex/_generated/api'
import { AdminAppNav } from '~/components/AdminAppNav'
import { defaultLoginSearch } from '~/lib/loginSearch'
import { useShopSession } from '~/lib/shopSession'

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
  const navigate = useNavigate()
  const { session, setSession } = useShopSession()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()

  const { data: branding, isPending } = useQuery(
    convexQuery(api.shops.getStorefrontBrandingBySlug, { slug: shopSlug }),
  )

  const { data: myShops, isPending: myShopsPending } = useQuery({
    ...convexQuery(api.shops.listMyShops, {}),
    enabled: isAuthenticated,
  })

  const myShopForSlug = React.useMemo(
    () => myShops?.find((s) => s.slug === shopSlug),
    [myShops, shopSlug],
  )

  React.useEffect(() => {
    if (!myShopForSlug) {
      return
    }
    if (!session || session.shopId !== myShopForSlug._id) {
      setSession({
        shopId: myShopForSlug._id,
        shopName: myShopForSlug.name,
        shopSlug: myShopForSlug.slug,
      })
    }
  }, [myShopForSlug, session, setSession])

  const showOwnerAdminNav =
    isAuthenticated &&
    !authLoading &&
    !myShopsPending &&
    !!myShopForSlug

  const onLogout = () => {
    void signOut().finally(() => {
      setSession(null)
      void navigate({ to: '/login', search: defaultLoginSearch })
    })
  }

  const adminNavShopName =
    session?.shopSlug === shopSlug
      ? session.shopName
      : (myShopForSlug?.name ?? branding?.displayName ?? null)

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
      {showOwnerAdminNav ? (
        <AdminAppNav
          variant="storefront"
          shopSlug={shopSlug}
          shopName={adminNavShopName}
          onLogout={onLogout}
        />
      ) : null}
      <header className="relative z-10 border-b border-[color:var(--sf-primary)]/15 bg-[var(--sf-bg)]/95 backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
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
            {!showOwnerAdminNav ? (
              <Link
                to="/login"
                search={{ ...defaultLoginSearch, redirect: '/app/snabb' }}
                className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: 'var(--sf-primary)' }}
              >
                Sälj via Selio
              </Link>
            ) : null}
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
        <footer className="mt-auto border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
          <div className="w-full">
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
