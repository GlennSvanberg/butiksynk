import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { TaxonomyTreeNode } from '~/components/TaxonomyTreePicker'
import { TaxonomyTreePicker } from '~/components/TaxonomyTreePicker'
import {
  StorefrontCardSkeletons,
  storefrontListingGridClass,
} from '~/components/storefront/StorefrontCardSkeletons'
import { StorefrontProductGrid } from '~/components/storefront/StorefrontProductGrid'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'

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

function findCategoryName(
  nodes: Array<TaxonomyTreeNode>,
  id: string | undefined,
): string | undefined {
  if (!id) return undefined
  for (const node of nodes) {
    if (node.id === id) return node.name
    const child = findCategoryName(node.children, id)
    if (child) return child
  }
  return undefined
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

  const hasCategoryNav = categoryTree.length > 0
  const listingGridClass = storefrontListingGridClass(hasCategoryNav)
  const selectedCategoryName = useMemo(
    () => findCategoryName(categoryTree, kategori),
    [categoryTree, kategori],
  )
  const trimmedQuery = q?.trim()
  const hasActiveFilters = !!(trimmedQuery || kategori)

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <section
          aria-label="Sök i sortimentet"
          className="overflow-hidden rounded-3xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)]/82 shadow-sm"
        >
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(26rem,1.15fr)] lg:items-end lg:p-8">
            <div>
              <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[color:var(--sf-primary)]/45">
                Sortiment
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-4xl">
                Upptäck varorna i butiken
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--sf-primary)]/68 sm:text-base">
                Bläddra bland unika plagg och objekt. Listan uppdateras när
                butiken ändrar sitt lager.
              </p>
            </div>

            <div>
              <form
                id={formId}
                onSubmit={onSearchSubmit}
                className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[color:var(--sf-primary)]/12 sm:bg-[var(--sf-surface)] sm:shadow-md"
              >
                <label htmlFor={`${formId}-q`} className="sr-only">
                  Sök
                </label>
                <input
                  id={`${formId}-q`}
                  type="search"
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="Sök titel, beskrivning eller kategori"
                  className="w-full min-w-0 rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] px-4 py-3.5 text-base text-[var(--sf-text)] shadow-sm outline-none ring-[color:var(--sf-accent)]/25 placeholder:text-[color:var(--sf-primary)]/40 focus:ring-2 sm:rounded-none sm:border-0 sm:py-4 sm:pl-5 sm:pr-3 sm:shadow-none sm:ring-0 sm:focus:ring-0"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90 sm:rounded-none sm:px-9 sm:py-4"
                  style={{ backgroundColor: 'var(--sf-primary)' }}
                >
                  Sök
                </button>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[color:var(--sf-primary)]/62">
                <span className="inline-flex items-center rounded-full border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)] px-3 py-1">
                  Live sortiment
                </span>
                {!productsPending ? (
                  <span className="inline-flex items-center rounded-full border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)] px-3 py-1">
                    {products.length}{' '}
                    {products.length === 1 ? 'vara' : 'varor'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div
          className={
            hasCategoryNav
              ? 'mt-8 lg:grid lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start lg:gap-x-10 xl:grid-cols-[minmax(0,17.5rem)_1fr] xl:gap-x-12'
              : 'mt-8'
          }
        >
          {hasCategoryNav ? (
            <>
              <aside className="hidden text-[color:var(--sf-primary)] lg:mt-0 lg:block">
                <div className="sticky top-24">
                  <p
                    id={`${formId}-kat`}
                    className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50"
                  >
                    Kategorier
                  </p>
                  <TaxonomyTreePicker
                    className="mt-3 max-h-[min(32rem,calc(100dvh-9rem))] rounded-2xl border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] p-3 shadow-sm"
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
                  <span>
                    Kategorier
                    {selectedCategoryName ? (
                      <span className="ml-2 font-normal text-[color:var(--sf-primary)]/55">
                        {selectedCategoryName}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="text-[color:var(--sf-primary)]/45 transition group-open:rotate-180"
                  >
                    ▼
                  </span>
                </summary>
                <div className="mt-2 rounded-xl border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] p-1 shadow-sm">
                  <TaxonomyTreePicker
                    className="max-h-72 border-0 bg-transparent shadow-none"
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

          <div
            className={
              hasCategoryNav ? 'min-w-0 lg:mt-0' : 'min-w-0'
            }
          >
            {hasActiveFilters || !productsPending ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[color:var(--sf-primary)]/65">
                  {productsPending
                    ? 'Hämtar sortiment …'
                    : `${products.length} ${products.length === 1 ? 'träff' : 'träffar'}`}
                  {trimmedQuery ? <> för “{trimmedQuery}”</> : null}
                  {selectedCategoryName ? <> i {selectedCategoryName}</> : null}
                </p>
                {hasActiveFilters ? (
                  <Link
                    to="/butik/$shopSlug"
                    params={{ shopSlug }}
                    search={emptyButikListingSearch}
                    className="rounded-full border border-[color:var(--sf-primary)]/12 bg-[var(--sf-surface)] px-3 py-1.5 text-sm font-medium text-[color:var(--sf-primary)]/78 shadow-sm transition hover:border-[color:var(--sf-primary)]/25"
                  >
                    Rensa filter
                  </Link>
                ) : null}
              </div>
            ) : null}

            {productsPending ? (
              <StorefrontCardSkeletons
                hasCategoryNav={hasCategoryNav}
                gridClassName={listingGridClass}
              />
            ) : products.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-[color:var(--sf-primary)]/20 p-8 text-center shadow-sm sm:p-12"
                style={{ backgroundColor: 'var(--sf-surface)' }}
              >
                <p className="font-heading text-xl font-semibold text-[color:var(--sf-primary)]">
                  {hasActiveFilters
                    ? 'Inga varor matchar filtret'
                    : 'Inga varor i butiken just nu'}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color:var(--sf-primary)]/65">
                  {hasActiveFilters
                    ? 'Prova att söka bredare eller visa hela sortimentet.'
                    : 'Kom tillbaka snart, sortimentet uppdateras när butiken publicerar nya varor.'}
                </p>
                {hasActiveFilters ? (
                  <Link
                    to="/butik/$shopSlug"
                    params={{ shopSlug }}
                    search={emptyButikListingSearch}
                    className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: 'var(--sf-primary)' }}
                  >
                    Visa hela sortimentet
                  </Link>
                ) : null}
              </div>
            ) : (
              <StorefrontProductGrid
                shopSlug={shopSlug}
                products={products}
                gridClassName={listingGridClass}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
