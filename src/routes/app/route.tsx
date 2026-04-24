import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import * as React from 'react'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { readShopSession, useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app')({
  beforeLoad: ({ location }) => {
    if (typeof window !== 'undefined' && !readShopSession()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      })
    }
  },
  component: AppShell,
})

function AppShell() {
  const navigate = useNavigate()
  const { session, setSession } = useShopSession()

  React.useEffect(() => {
    if (typeof window !== 'undefined' && !readShopSession()) {
      void navigate({ to: '/login', search: { redirect: '/app' } })
    }
  }, [navigate])

  const onLogout = () => {
    setSession(null)
    void navigate({ to: '/login', search: { redirect: undefined } })
  }

  return (
    <div className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
      <header className="sticky top-0 z-40 border-b border-brand-dark/10 bg-brand-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/app"
              className="font-heading text-lg font-bold tracking-tight text-brand-dark"
            >
              Butiksynk
            </Link>
            <span className="hidden font-mono text-xs text-brand-dark/50 sm:inline">
              Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {session ? (
              <>
                <Link
                  to="/app/butik/design"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/85 transition hover:bg-brand-dark/5 hover:text-brand-dark sm:inline"
                >
                  Butiksdesign
                </Link>
                <Link
                  to="/butik/$shopSlug"
                  params={{ shopSlug: session.shopSlug }}
                  search={emptyButikListingSearch}
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/85 transition hover:bg-brand-dark/5 hover:text-brand-dark md:inline"
                >
                  Kundbutik
                </Link>
                <span className="hidden max-w-[12rem] truncate text-sm font-medium text-brand-dark lg:inline">
                  {session.shopName}
                </span>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => onLogout()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/80 transition hover:bg-brand-dark/5 hover:text-brand-dark"
            >
              Logga ut
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
