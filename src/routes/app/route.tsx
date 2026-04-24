import { convexQuery } from '@convex-dev/react-query'
import { useAuthActions } from '@convex-dev/auth/react'
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useConvexAuth } from 'convex/react'
import * as React from 'react'
import { api } from '../../../convex/_generated/api'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { defaultLoginSearch } from '~/lib/loginSearch'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app')({
  component: AppShell,
})

function AppShell() {
  const navigate = useNavigate()
  const { session, setSession } = useShopSession()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()

  const {
    data: bootstrap,
    isFetched: bootstrapFetched,
    isPending: bootstrapPending,
  } = useQuery({
    ...convexQuery(api.shops.bootstrapViewerShopSession, {}),
    enabled: isAuthenticated && !session,
  })

  React.useEffect(() => {
    if (!bootstrap || session) {
      return
    }
    setSession({
      shopId: bootstrap.shopId,
      shopName: bootstrap.shopName,
      shopSlug: bootstrap.shopSlug,
    })
  }, [bootstrap, session, setSession])

  React.useEffect(() => {
    if (authLoading) {
      return
    }
    if (!isAuthenticated) {
      setSession(null)
      void navigate({
        to: '/login',
        search: { ...defaultLoginSearch, redirect: '/app' },
      })
    }
  }, [authLoading, isAuthenticated, navigate, setSession])

  const onLogout = () => {
    void signOut().finally(() => {
      setSession(null)
      void navigate({ to: '/login', search: defaultLoginSearch })
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-brand-bg bg-paper-grain px-4 py-10 text-sm text-brand-dark/75">
        Laddar …
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-brand-bg bg-paper-grain px-4 py-10 text-sm text-brand-dark/75">
        Omdirigerar till inloggning …
      </div>
    )
  }

  if (!session) {
    if (bootstrapPending || !bootstrapFetched) {
      return (
        <div className="min-h-dvh bg-brand-bg bg-paper-grain px-4 py-10 text-sm text-brand-dark/75">
          Laddar butik …
        </div>
      )
    }
    if (bootstrap === null) {
      return (
        <div className="min-h-dvh bg-brand-bg bg-paper-grain px-4 py-10 text-sm text-brand-dark/75">
          <p>Ditt konto saknar butikstilldelning.</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white"
            onClick={() => onLogout()}
          >
            Tillbaka till inloggning
          </button>
        </div>
      )
    }
    return (
      <div className="min-h-dvh bg-brand-bg bg-paper-grain px-4 py-10 text-sm text-brand-dark/75">
        Laddar butik …
      </div>
    )
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
