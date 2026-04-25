import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import * as React from 'react'

export type StorefrontOwnerBarProps = {
  shopName: string | null
  onLogout: () => void
}

const linkClass =
  'rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-dark/88 transition hover:bg-brand-dark/8 hover:text-brand-dark sm:px-3 sm:text-sm'

export function StorefrontOwnerBar({
  shopName,
  onLogout,
}: StorefrontOwnerBarProps) {
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
      <Link to="/app" className={linkClass} onClick={closeMobile}>
        Till verktyget
      </Link>
      <Link to="/app/varor" className={linkClass} onClick={closeMobile}>
        Varor
      </Link>
      <Link to="/app/varor/ny" className={linkClass} onClick={closeMobile}>
        Ny vara
      </Link>
      <Link to="/app/butik/design" className={linkClass} onClick={closeMobile}>
        Butiksdesign
      </Link>
    </>
  )

  return (
    <div
      className="sticky top-0 z-[45] border-b border-brand-dark/12 bg-brand-bg/96 backdrop-blur-md"
      role="region"
      aria-label="Förhandsvisning som ägare"
    >
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-2 px-4 sm:h-12 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-brand-dark transition hover:bg-brand-dark/5 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="storefront-owner-mobile-nav"
            aria-label={mobileOpen ? 'Stäng verktygslänkar' : 'Öppna verktygslänkar'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="size-4" strokeWidth={2} />
            ) : (
              <Menu className="size-4" strokeWidth={2} />
            )}
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-brand-dark/48 sm:text-[0.68rem] sm:tracking-[0.16em]">
              Förhandsvisning
            </p>
            {shopName ? (
              <p className="truncate text-xs font-medium text-brand-dark/80 sm:text-sm">
                {shopName}
              </p>
            ) : null}
          </div>
        </div>

        <nav
          className="hidden shrink-0 flex-wrap items-center gap-0.5 md:flex"
          aria-label="Snabblänkar till verktyget"
        >
          {navItems}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              closeMobile()
              onLogout()
            }}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-dark/75 transition hover:bg-brand-dark/5 hover:text-brand-dark sm:px-3 sm:text-sm"
          >
            Logga ut
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[46] bg-black/35 md:hidden"
            aria-label="Stäng meny"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="storefront-owner-mobile-nav"
            className="fixed inset-x-0 top-11 z-[47] max-h-[min(70vh,calc(100dvh-2.75rem))] overflow-y-auto border-b border-brand-dark/10 bg-brand-bg px-4 py-3 shadow-lg sm:top-12 md:hidden"
          >
            <nav
              className="mx-auto flex max-w-7xl flex-col gap-0.5"
              aria-label="Snabblänkar till verktyget"
            >
              {navItems}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  )
}
