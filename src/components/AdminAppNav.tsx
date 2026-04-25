import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import * as React from 'react'
import { SelioLogoMark } from '~/components/SelioLogoMark'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'

export type AdminAppNavProps = {
  shopSlug: string
  shopName: string | null
  onLogout: () => void
}

const navLinkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/85 transition hover:bg-brand-dark/5 hover:text-brand-dark'

export function AdminAppNav({
  shopSlug,
  shopName,
  onLogout,
}: AdminAppNavProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (!mobileOpen) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  const navItems = (
    <>
      <Link to="/app/varor" className={navLinkClass} onClick={closeMobile}>
        Varor
      </Link>
      <Link to="/app/varor/ny" className={navLinkClass} onClick={closeMobile}>
        Ny vara
      </Link>
      <Link to="/app/butik/design" className={navLinkClass} onClick={closeMobile}>
        Butiksdesign
      </Link>
      <Link
        to="/butik/$shopSlug"
        params={{ shopSlug }}
        search={emptyButikListingSearch}
        className={navLinkClass}
        onClick={closeMobile}
      >
        Kundbutik
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark/10 bg-brand-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-brand-dark transition hover:bg-brand-dark/5 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna verktygsmeny'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="size-5" strokeWidth={2} />
            ) : (
              <Menu className="size-5" strokeWidth={2} />
            )}
          </button>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              to="/app"
              className="flex items-center gap-2"
              onClick={closeMobile}
            >
              <SelioLogoMark />
              <span className="font-heading text-lg font-bold tracking-tight text-brand-dark">
                Selio
              </span>
            </Link>
            <span className="hidden font-mono text-xs text-brand-dark/50 sm:inline">
              Verktyg
            </span>
          </div>
        </div>

        <nav
          className="hidden shrink-0 items-center gap-1 md:flex"
          aria-label="Verktyg"
        >
          {navItems}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {shopName ? (
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-brand-dark lg:inline">
              {shopName}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              closeMobile()
              onLogout()
            }}
            className="rounded-lg px-2 py-2 text-sm font-medium text-brand-dark/80 transition hover:bg-brand-dark/5 hover:text-brand-dark sm:px-3"
          >
            Logga ut
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            aria-label="Stäng meny"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="admin-mobile-nav"
            className="fixed inset-x-0 top-14 z-[70] max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto border-b border-brand-dark/10 bg-brand-bg px-4 py-4 shadow-lg sm:top-16 md:hidden"
          >
            <nav
              className="mx-auto flex max-w-6xl flex-col gap-1"
              aria-label="Verktyg"
            >
              {navItems}
            </nav>
          </div>
        </>
      ) : null}
    </header>
  )
}
