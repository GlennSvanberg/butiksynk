import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useCallback, useEffect, useId, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { formatProductAttributeDisplay } from '~/lib/formatProductAttribute'

export const Route = createFileRoute('/butik/$shopSlug/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q:
      typeof search.q === 'string' && search.q.length > 0
        ? search.q
        : undefined,
    kategori:
      typeof search.kategori === 'string' && search.kategori.length > 0
        ? search.kategori
        : undefined,
  }),
  component: ButikShopHome,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

function ButikShopHome() {
  const { shopSlug } = Route.useParams()
  const searchState = Route.useSearch()
  const { q, kategori } = searchState
  const navigate = useNavigate()
  const formId = useId()
  const [draftQ, setDraftQ] = useState(q ?? '')

  useEffect(() => {
    setDraftQ(q ?? '')
  }, [q])

  const categoryId =
    kategori && kategori.length > 0
      ? (kategori as Id<'taxonomyNodes'>)
      : undefined

  const { data: products = [], isPending: productsPending } = useQuery({
    ...convexQuery(api.products.listProductsForPublicStorefront, {
      slug: shopSlug,
      searchQuery: q,
      categoryId,
    }),
  })

  const { data: categories = [] } = useQuery({
    ...convexQuery(api.taxonomy.listCategoryOptionsByShopSlug, {
      slug: shopSlug,
    }),
  })

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      void navigate({
        to: '/butik/$shopSlug',
        params: { shopSlug },
        search: {
          q: draftQ.trim() || undefined,
          kategori: searchState.kategori,
        },
      })
    },
    [draftQ, navigate, searchState.kategori, shopSlug],
  )

  const setKategori = (next: string | undefined) => {
    void navigate({
      to: '/butik/$shopSlug',
      params: { shopSlug },
      search: {
        q: searchState.q,
        kategori: next && next.length > 0 ? next : undefined,
      },
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 border-b border-[color:var(--sf-primary)]/10 pb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
            Sortiment
          </p>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--sf-primary)]/75">
            Sök bland varor — uppdateras i realtid.
          </p>
        </div>
        <form
          id={formId}
          onSubmit={onSearchSubmit}
          className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label htmlFor={`${formId}-q`} className="sr-only">
            Sök
          </label>
          <input
            id={`${formId}-q`}
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Sök titel, beskrivning, kategori …"
            className="w-full rounded-lg border border-[color:var(--sf-primary)]/15 bg-[var(--sf-surface)] px-3 py-2 text-sm text-[var(--sf-text)] shadow-sm outline-none ring-[color:var(--sf-accent)]/30 focus:ring-2"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: 'var(--sf-primary)' }}
          >
            Sök
          </button>
        </form>
      </div>

      {categories.length > 0 ? (
        <div className="mb-8">
          <label
            htmlFor={`${formId}-kat`}
            className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50"
          >
            Kategori
          </label>
          <select
            id={`${formId}-kat`}
            value={kategori ?? ''}
            onChange={(e) => setKategori(e.target.value || undefined)}
            className="mt-2 block w-full max-w-xl rounded-lg border border-[color:var(--sf-primary)]/15 bg-[var(--sf-surface)] px-3 py-2 text-sm text-[var(--sf-text)] shadow-sm"
          >
            <option value="">Alla kategorier</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.pathLabel}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {productsPending ? (
        <p className="text-sm text-[color:var(--sf-primary)]/70">Laddar produkter …</p>
      ) : products.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-[color:var(--sf-primary)]/20 p-12 text-center shadow-sm"
          style={{ backgroundColor: 'var(--sf-surface)' }}
        >
          <p className="text-[color:var(--sf-primary)]/80">
            {q?.trim() ? 'Inga träffar för din sökning.' : 'Inga produkter i butiken just nu.'}
          </p>
          <Link
            to="/login"
            search={{ redirect: '/app/snabb' }}
            className="mt-4 inline-block text-sm font-medium text-[color:var(--sf-accent)] underline decoration-[color:var(--sf-accent)]/30 underline-offset-4"
          >
            Logga in och lägg till varor
          </Link>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product._id}>
              <Link
                to="/butik/$shopSlug/vara/$productId"
                params={{ shopSlug, productId: product._id }}
                search={emptyButikListingSearch}
                className="block h-full rounded-lg border border-[color:var(--sf-primary)]/10 shadow-sm transition hover:border-[color:var(--sf-primary)]/25"
                style={{ backgroundColor: 'var(--sf-surface)' }}
              >
                <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg">
                  <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-[var(--sf-bg)]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[color:var(--sf-primary)]/40">
                        Ingen bild
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-heading text-lg font-semibold leading-snug text-[color:var(--sf-primary)]">
                        {product.title}
                      </h2>
                      <p className="shrink-0 font-mono text-sm font-medium tabular-nums text-[color:var(--sf-primary)]">
                        {sekFormatter.format(product.priceSek)}
                      </p>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-wide text-[color:var(--sf-primary)]/50">
                      {product.categoryLabel ??
                        ('category' in product &&
                        typeof product.category === 'string'
                          ? product.category
                          : undefined) ??
                        '—'}
                    </p>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[color:var(--sf-primary)]/80">
                      {product.description}
                    </p>
                    {product.attributes.length > 0 ? (
                      <dl className="mt-auto space-y-1 border-t border-[color:var(--sf-primary)]/8 pt-3 text-sm">
                        {product.attributes.map((attr, i) => {
                          const row = formatProductAttributeDisplay(attr)
                          return (
                            <div
                              key={`${product._id}-${i}`}
                              className="flex justify-between gap-3"
                            >
                              <dt className="text-[color:var(--sf-primary)]/60">
                                {row.label}
                              </dt>
                              <dd className="font-medium text-[color:var(--sf-primary)]">
                                {row.value}
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                    ) : null}
                    <span className="text-xs font-semibold text-[color:var(--sf-accent)]">
                      Visa vara →
                    </span>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
