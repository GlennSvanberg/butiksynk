import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useConvexAuth, useMutation } from 'convex/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_PASSWORD,
} from '../../shared/shopConstants'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' ? search.redirect : undefined,
    demo: typeof search.demo === 'string' ? search.demo : undefined,
  }),
  component: LoginPage,
})

function normalizeAuthEmail(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (t === 'demo') {
    return DEMO_AUTH_EMAIL
  }
  return raw.trim()
}

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { redirect, demo: demoSearch } = Route.useSearch()
  const { setSession } = useShopSession()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signIn } = useAuthActions()

  const ensureDemoEnvironment = useMutation(api.taxonomy.ensureDemoEnvironment)

  const { data: myShops = [], isLoading: shopsLoading } = useQuery({
    ...convexQuery(api.shops.listMyShops, {}),
    enabled: isAuthenticated,
  })

  const { data: bootstrap } = useQuery({
    ...convexQuery(api.shops.bootstrapViewerShopSession, {}),
    enabled: isAuthenticated,
  })

  const [flowMode, setFlowMode] = React.useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [shopId, setShopId] = React.useState<Id<'shops'> | ''>('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const autoNavigated = React.useRef(false)
  const demoAutologinStarted = React.useRef(false)

  /** Endast `?demo=1` — inte i vanlig DEV, annars kan man aldrig testa annat konto. */
  const shouldAutoDemoLogin = demoSearch === '1'

  React.useEffect(() => {
    if (!shouldAutoDemoLogin || demoAutologinStarted.current || authLoading) {
      return
    }
    if (isAuthenticated) {
      return
    }
    demoAutologinStarted.current = true
    const run = async () => {
      const fdIn = new FormData()
      fdIn.set('email', DEMO_AUTH_EMAIL)
      fdIn.set('password', DEMO_AUTH_PASSWORD)
      fdIn.set('flow', 'signIn')
      try {
        await signIn('password', fdIn)
      } catch {
        const fdUp = new FormData()
        fdUp.set('email', DEMO_AUTH_EMAIL)
        fdUp.set('password', DEMO_AUTH_PASSWORD)
        fdUp.set('flow', 'signUp')
        await signIn('password', fdUp)
      }
    }
    void run().catch(console.error)
  }, [
    authLoading,
    isAuthenticated,
    shouldAutoDemoLogin,
    signIn,
  ])

  React.useEffect(() => {
    if (bootstrap && shopId === '') {
      setShopId(bootstrap.shopId)
    }
  }, [bootstrap, shopId])

  const finishLogin = React.useCallback(
    async (picked: {
      shopId: Id<'shops'>
      shopName: string
      shopSlug: string
    }) => {
      await ensureDemoEnvironment({}).catch(console.error)
      await queryClient.invalidateQueries()
      setSession({
        shopId: picked.shopId,
        shopName: picked.shopName,
        shopSlug: picked.shopSlug,
      })
      void router.invalidate()
      const to = redirect && redirect.startsWith('/app') ? redirect : '/app'
      void navigate({ to })
    },
    [ensureDemoEnvironment, navigate, queryClient, redirect, router, setSession],
  )

  React.useEffect(() => {
    if (
      !isAuthenticated ||
      authLoading ||
      shopsLoading ||
      myShops.length !== 1 ||
      autoNavigated.current
    ) {
      return
    }
    autoNavigated.current = true
    const s = myShops[0]
    void finishLogin({
      shopId: s._id,
      shopName: s.name,
      shopSlug: s.slug,
    })
  }, [
    authLoading,
    finishLogin,
    isAuthenticated,
    myShops,
    shopsLoading,
  ])

  const onCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const fd = new FormData()
    fd.set('email', normalizeAuthEmail(email))
    fd.set('password', password)
    fd.set('flow', flowMode)
    try {
      await signIn('password', fd)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Inloggningen misslyckades.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const onPickShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!shopId) {
      setError('Välj en butik.')
      return
    }
    const shop = myShops.find((s) => s._id === shopId)
    if (!shop) {
      setError('Ogiltig butik.')
      return
    }
    setBusy(true)
    try {
      await finishLogin({
        shopId: shop._id,
        shopName: shop.name,
        shopSlug: shop.slug,
      })
    } finally {
      setBusy(false)
    }
  }

  if (isAuthenticated && shopsLoading) {
    return (
      <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
          <p className="text-sm text-brand-dark/75">Hämtar dina butiker …</p>
        </div>
      </main>
    )
  }

  if (isAuthenticated && myShops.length === 1) {
    return (
      <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
          <p className="text-sm text-brand-dark/75">Öppnar verktyget …</p>
        </div>
      </main>
    )
  }

  if (isAuthenticated && myShops.length > 1) {
    return (
      <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
            Välj butik
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-brand-dark">
            Fortsätt till verktyget
          </h1>
          <p className="mt-2 text-sm text-brand-dark/75">
            Du har tillgång till flera butiker. Välj vilken du vill öppna.
          </p>
          <form
            onSubmit={onPickShopSubmit}
            className="mt-8 flex flex-col gap-5 rounded-lg border border-brand-dark/8 bg-brand-surface p-6 shadow-sm"
          >
            {error ? (
              <p
                className="rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="shop"
                className="text-sm font-medium text-brand-dark"
              >
                Butik
              </label>
              <select
                id="shop"
                required
                value={shopId}
                onChange={(e) =>
                  setShopId(e.target.value as Id<'shops'> | '')
                }
                className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 focus:ring-2"
              >
                <option value="">Välj butik</option>
                {myShops.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
            >
              Fortsätt till verktyget
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-brand-dark/65">
            <Link
              to="/"
              className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
            >
              ← Till startsidan
            </Link>
          </p>
        </div>
      </main>
    )
  }

  if (isAuthenticated && myShops.length === 0 && !shopsLoading) {
    return (
      <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
          <p className="text-sm text-brand-dark/75">
            Ditt konto har ingen butik kopplad. Kontakta support eller skapa ett
            nytt konto.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Inloggning
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-brand-dark">
          {flowMode === 'signIn' ? 'Logga in' : 'Skapa konto'}
        </h1>
        <p className="mt-2 text-sm text-brand-dark/75">
          Använd e-post och lösenord. Demokonto: skriv{' '}
          <span className="font-mono">demo</span> som e-post och{' '}
          <span className="font-mono">demo</span> som lösenord (mappas till{' '}
          <span className="font-mono">{DEMO_AUTH_EMAIL}</span>). Vill du slippa
          formuläret helt kan du öppna{' '}
          <span className="font-mono">/login?demo=1</span>.
        </p>

        <form
          onSubmit={onCredentialsSubmit}
          className="mt-8 flex flex-col gap-5 rounded-lg border border-brand-dark/8 bg-brand-surface p-6 shadow-sm"
        >
          {error ? (
            <p
              className="rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-brand-dark"
            >
              E-post
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="du@butik.se eller demo"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-brand-dark"
            >
              Lösenord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                flowMode === 'signIn' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="••••••••"
            />
            <p className="text-xs text-brand-dark/55">
              Minst 4 tecken. Vid nytt konto skapas en butik åt dig automatiskt.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || authLoading}
            className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
          >
            {flowMode === 'signIn' ? 'Logga in' : 'Skapa konto'}
          </button>

          <button
            type="button"
            className="text-sm font-medium text-brand-dark/80 underline decoration-brand-dark/25 underline-offset-4 hover:text-brand-dark"
            onClick={() =>
              setFlowMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
            }
          >
            {flowMode === 'signIn'
              ? 'Behöver du ett konto? Registrera dig'
              : 'Har du redan konto? Logga in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-brand-dark/65">
          <Link
            to="/"
            className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
          >
            ← Till startsidan
          </Link>
        </p>
      </div>
    </main>
  )
}
