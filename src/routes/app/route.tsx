import { convexQuery } from '@convex-dev/react-query'
import { useAuthActions } from '@convex-dev/auth/react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useConvexAuth } from 'convex/react'
import * as React from 'react'
import { api } from '../../../convex/_generated/api'
import { AdminAppNav } from '~/components/AdminAppNav'
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
      <AdminAppNav
        variant="app-shell"
        shopSlug={session.shopSlug}
        shopName={session.shopName}
        onLogout={onLogout}
      />
      <Outlet />
    </div>
  )
}
