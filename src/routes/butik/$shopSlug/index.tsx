import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useCallback, useEffect, useId, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { defaultLoginSearch } from '~/lib/loginSearch'
import { CategoryBreadcrumb } from '~/components/CategoryBreadcrumb'
import { TaxonomyTreePicker } from '~/components/TaxonomyTreePicker'
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

function ProductCategoryRow({
  product,
}: {
  product: {
    categoryPathSegments?: Array<string>
    category?: string
  }
}) {
  const segments = Array.isArray(product.categoryPathSegments)
    ? product.categoryPathSegments
    : []
  if (segments.length > 0) {
    return (
      <div className="text-[color:var(--sf-primary)]/50">
        <CategoryBreadcrumb segments={segments} />
      </div>
    )
  }
  if (
    'category' in product &&
    typeof product.category === 'string' &&
    product.category.length > 0
  ) {
    return (
      <p className="font-mono text-xs uppercase tracking-wide text-[color:var(--sf-primary)]/50">
        {product.category}
      </p>
    )
  }
  return (
    <p className="font-mono text-xs uppercase tracking-wide text-[color:var(--sf-primary)]/50">
      —
    </p>
  )
}

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

  const { data: categoryTree = [] } = useQuery({
    ...convexQuery(api.taxonomy.listTaxonomyTreeByShopSlug, {
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
    <main className="pb-12 pt-6 sm:pb-16 sm:pt-8">
      {/* Hero search — centered, prominent (standard storefront pattern) */}
      <section
        aria-label="Sök i sortimentet"
        className="border-b border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)]/40 px-4 pb-10 pt-2 sm:px-6 lg:px-8 xl:px-10 sm:pb-12"
      >
        <div className="w-full text-center">
          <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--sf-primary)]/45 sm:text-xs">
            Sortiment
          </p>
          <form
            id={formId}
            onSubmit={onSearchSubmit}
            className="mt-5 flex w-full flex-col gap-2 sm:mt-6 sm:flex-row sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[color:var(--sf-primary)]/12 sm:bg-[var(--sf-surface)] sm:shadow-md"
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
              className="w-full min-w-0 rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] px-4 py-3.5 text-base text-[var(--sf-text)] shadow-sm outline-none ring-[color:var(--sf-accent)]/25 placeholder:text-[color:var(--sf-primary)]/40 focus:ring-2 sm:rounded-none sm:border-0 sm:py-4 sm:pl-5 sm:pr-3 sm:shadow-none sm:ring-0 sm:focus:ring-0"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90 sm:rounded-none sm:px-10 sm:py-4"
              style={{ backgroundColor: 'var(--sf-primary)' }}
            >
              Sök
            </button>
          </form>
          <p className="mt-3 text-sm text-[color:var(--sf-primary)]/60 sm:mt-4">
            Sök bland varor — uppdateras i realtid.
          </p>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Desktop: categories in sticky sidebar. Mobile: collapsible so products stay primary. */}
        <div
          className={
            categoryTree.length > 0
              ? 'mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(0,15.5rem)_1fr] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,17rem)_1fr] xl:gap-12'
              : 'mt-8 lg:mt-10'
          }
        >
          {categoryTree.length > 0 ? (
            <>
              <aside className="hidden text-[color:var(--sf-primary)] lg:block">
                <div className="sticky top-24">
                  <p
                    id={`${formId}-kat`}
                    className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50"
                  >
                    Kategorier
                  </p>
                  <TaxonomyTreePicker
                    className="mt-3 max-h-[min(32rem,calc(100dvh-9rem))] border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] shadow-sm"
                    nodes={categoryTree}
                    value={kategori ?? ''}
                    onChange={(id) => setKategori(id || undefined)}
                    allowClear
                    clearLabel="Alla kategorier"
                  />
                </div>
              </aside>
              <details className="group mb-6 text-[color:var(--sf-primary)] lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] px-4 py-3.5 text-sm font-semibold shadow-sm [&::-webkit-details-marker]:hidden">
                  <span>Kategorier</span>
                  <span
                    aria-hidden
                    className="text-[color:var(--sf-primary)]/45 transition group-open:rotate-180"
                  >
                    ▼
                  </span>
                </summary>
                <div className="mt-2 rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] p-1 shadow-sm">
                  <TaxonomyTreePicker
                    className="max-h-64 border-0 bg-transparent shadow-none"
                    nodes={categoryTree}
                    value={kategori ?? ''}
                    onChange={(id) => setKategori(id || undefined)}
                    allowClear
                    clearLabel="Alla kategorier"
                  />
                </div>
              </details>
            </>
          ) : null}

          <div className="min-w-0">
            {(q?.trim() || kategori) && !productsPending ? (
              <p className="mb-4 text-sm text-[color:var(--sf-primary)]/65">
                {products.length}{' '}
                {products.length === 1 ? 'träff' : 'träffar'}
                {q?.trim() ? (
                  <>
                    {' '}
                    för «{q.trim()}»
                  </>
                ) : null}
              </p>
            ) : null}

            {productsPending ? (
              <p className="text-sm text-[color:var(--sf-primary)]/70">Laddar produkter …</p>
            ) : products.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-[color:var(--sf-primary)]/20 p-10 text-center shadow-sm sm:p-12"
                style={{ backgroundColor: 'var(--sf-surface)' }}
              >
                <p className="text-[color:var(--sf-primary)]/80">
                  {q?.trim() ? 'Inga träffar för din sökning.' : 'Inga produkter i butiken just nu.'}
                </p>
                <Link
                  to="/login"
                  search={{ ...defaultLoginSearch, redirect: '/app/snabb' }}
                  className="mt-4 inline-block text-sm font-medium text-[color:var(--sf-accent)] underline decoration-[color:var(--sf-accent)]/30 underline-offset-4"
                >
                  Logga in och lägg till varor
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-7 2xl:grid-cols-5 2xl:gap-8">
                {products.map((product) => (
                  <li key={product._id}>
                    <Link
                      to="/butik/$shopSlug/vara/$productId"
                      params={{ shopSlug, productId: product._id }}
                      search={emptyButikListingSearch}
                      className="block h-full rounded-xl border border-[color:var(--sf-primary)]/10 shadow-sm transition hover:border-[color:var(--sf-primary)]/22 hover:shadow-md"
                      style={{ backgroundColor: 'var(--sf-surface)' }}
                    >
                      <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
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
                        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="font-heading text-lg font-semibold leading-snug text-[color:var(--sf-primary)]">
                              {product.title}
                            </h2>
                            <p className="shrink-0 font-mono text-sm font-medium tabular-nums text-[color:var(--sf-primary)]">
                              {sekFormatter.format(product.priceSek)}
                            </p>
                          </div>
                          <ProductCategoryRow product={product} />
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
          </div>
        </div>
      </div>
    </main>
  )
}
