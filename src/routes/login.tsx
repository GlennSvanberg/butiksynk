import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import * as React from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { redirect } = Route.useSearch()
  const { setSession } = useShopSession()

  const ensureDemoEnvironment = useMutation(api.taxonomy.ensureDemoEnvironment)
  const [seedDone, setSeedDone] = React.useState(false)

  React.useEffect(() => {
    void ensureDemoEnvironment({})
      .catch(console.error)
      .finally(() => setSeedDone(true))
  }, [ensureDemoEnvironment])

  const { data: shops = [], isLoading } = useQuery({
    ...convexQuery(api.shops.listForLogin, {}),
    enabled: seedDone,
  })

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [shopId, setShopId] = React.useState<Id<'shops'> | ''>('')
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!shopId) {
      setError('Välj en butik.')
      return
    }
    const shop = shops.find((s) => s._id === shopId)
    if (!shop) {
      setError('Ogiltig butik.')
      return
    }
    setSession({
      shopId: shop._id,
      shopName: shop.name,
      shopSlug: shop.slug,
    })
    void router.invalidate()
    const to = redirect && redirect.startsWith('/app') ? redirect : '/app'
    void navigate({ to })
  }

  return (
    <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Inloggning (demo)
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-brand-dark">
          Logga in
        </h1>
        <p className="mt-2 text-sm text-brand-dark/75">
          Det här är en simulerad inloggning: inget konto skapas och inga
          riktiga uppgifter sparas. Välj butik och fortsätt till admin.
        </p>

        <form
          onSubmit={onSubmit}
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
              disabled={!seedDone || isLoading}
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 focus:ring-2"
            >
              <option value="">
                {isLoading || !seedDone ? 'Laddar butiker…' : 'Välj butik'}
              </option>
              {shops.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-brand-dark"
            >
              E-post
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="du@butik.se"
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
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="••••••••"
            />
            <p className="text-xs text-brand-dark/55">
              Lösenord kontrolleras inte i demo — valfritt värde.
            </p>
          </div>

          <button
            type="submit"
            disabled={!seedDone}
            className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
          >
            Fortsätt till admin
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
