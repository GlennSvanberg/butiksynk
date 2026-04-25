import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import * as React from 'react'
import { api } from '../../../../convex/_generated/api'
import { AdminAppNav } from '~/components/AdminAppNav'
import { defaultLoginSearch } from '~/lib/loginSearch'
import { useShopSession } from '~/lib/shopSession'
import { cssVarsFromStorefrontBranding } from '~/lib/storefrontTheme'

export const Route = createFileRoute('/butik/$shopSlug')({
  component: ButikStorefrontLayout,
})

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
      <div className="flex min-h-dvh items-center justify-center bg-brand-bg bg-paper-grain px-4 font-sans text-sm text-brand-dark/75">
        <div className="w-full max-w-sm rounded-2xl border border-brand-dark/10 bg-brand-surface/90 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 size-10 rounded-full bg-brand-dark/8" />
          <p className="font-heading text-base font-semibold text-brand-dark">
            Laddar butik
          </p>
          <p className="mt-1 text-sm text-brand-dark/60">
            Vi hämtar sortiment och butiksprofil.
          </p>
        </div>
      </div>
    )
  }

  if (!branding) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-bg bg-paper-grain px-4 text-center font-sans">
        <div className="w-full max-w-md rounded-2xl border border-brand-dark/10 bg-brand-surface p-8 shadow-sm">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/45">
            Kundbutik
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold tracking-tight text-brand-dark">
            Butiken hittades inte
          </p>
          <p className="mt-3 text-sm leading-relaxed text-brand-dark/65">
            Kontrollera länken eller gå tillbaka till Selios startsida.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
          >
            Till startsidan
          </Link>
        </div>
      </div>
    )
  }

  const style = cssVarsFromStorefrontBranding(branding)

  const hasContact =
    !!(
      branding.contactEmail?.trim() ||
      branding.contactPhone?.trim() ||
      branding.contactWebsite?.trim() ||
      branding.contactNote?.trim()
    )

  return (
    <div
      className="flex min-h-dvh flex-col bg-paper-grain font-sans text-[var(--sf-text)]"
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
      <header className="relative z-10 border-b border-[color:var(--sf-primary)]/12 bg-[var(--sf-bg)]/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.displayName} logotyp`}
                className="h-11 max-w-[9rem] shrink-0 rounded-md object-contain sm:h-12 sm:max-w-[12rem]"
              />
            ) : (
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] font-heading text-lg font-bold text-[color:var(--sf-primary)] shadow-sm sm:size-12"
                aria-hidden
              >
                {branding.displayName.trim().charAt(0).toLocaleUpperCase('sv')}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[color:var(--sf-primary)]/50">
                Kundbutik
              </p>
              <h1 className="truncate font-heading text-xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-2xl">
                {branding.displayName}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {!showOwnerAdminNav ? (
              <Link
                to="/login"
                search={{ ...defaultLoginSearch, redirect: '/app/varor/ny' }}
                className="inline-flex items-center justify-center rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: 'var(--sf-primary)' }}
              >
                Sälj via Selio
              </Link>
            ) : null}
            <Link
              to="/"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--sf-primary)]/80 transition hover:bg-[color:var(--sf-primary)]/6"
            >
              Startsida
            </Link>
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="mt-auto border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)]/95 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <p className="font-heading text-base font-semibold text-[color:var(--sf-primary)]">
              {branding.displayName}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[color:var(--sf-primary)]/62">
              Aktuellt sortiment från butiken, uppdaterat när varorna ändras i
              Selio.
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)]/45 p-4 shadow-sm sm:min-w-72">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
              {hasContact ? 'Kontakt' : 'Kontaktuppgifter'}
            </p>
            {hasContact ? (
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--sf-primary)]/85">
                {branding.contactEmail?.trim() ? (
                  <li>
                    <a
                      href={`mailto:${branding.contactEmail.trim()}`}
                      className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 transition hover:decoration-[color:var(--sf-primary)]/55"
                    >
                      {branding.contactEmail.trim()}
                    </a>
                  </li>
                ) : null}
                {branding.contactPhone?.trim() ? (
                  <li>
                    <a
                      href={`tel:${branding.contactPhone.trim().replace(/\s+/g, '')}`}
                      className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 transition hover:decoration-[color:var(--sf-primary)]/55"
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
                      className="font-medium underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 transition hover:decoration-[color:var(--sf-primary)]/55"
                    >
                      {branding.contactWebsite.trim()}
                    </a>
                  </li>
                ) : null}
                {branding.contactNote?.trim() ? (
                  <li className="whitespace-pre-line pt-1 leading-relaxed text-[color:var(--sf-primary)]/70">
                    {branding.contactNote.trim()}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--sf-primary)]/62">
                Kontakta butiken direkt för frågor om varor och öppettider.
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
