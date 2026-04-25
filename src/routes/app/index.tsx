import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { convexQuery } from '@convex-dev/react-query'
import {
  Check,
  LayoutGrid,
  Pencil,
  Table2,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryBreadcrumb } from '~/components/CategoryBreadcrumb'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { useConfirm } from '~/lib/confirm'
import { parsePriceSekToNumber, sanitizePriceInput } from '~/lib/editProductForm'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/')({
  component: AdminDashboard,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
})

type InventoryView = 'table' | 'grid'
type InventoryStatusFilter =
  | 'all'
  | 'available'
  | 'sold'
  | 'needsAttention'
  | 'processing'
  | 'error'
type InventorySort = 'newest' | 'priceDesc' | 'priceAsc' | 'title'
type InventoryStatus = 'available' | 'sold' | 'processing' | 'error' | 'draft'

type AdminProduct = {
  _id: Id<'products'>
  _creationTime: number
  title: string
  description: string
  priceSek: number
  soldAt?: number
  soldPriceSek?: number
  category?: string
  categoryId?: Id<'taxonomyNodes'>
  categoryPathSegments?: Array<string>
  imageUrl: string | null
  captureStatus?: 'processing' | 'ready' | 'error'
  captureError?: string
}

function AdminProductCategoryRow({
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
      <div className="text-brand-dark/50">
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
      <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
        {product.category}
      </p>
    )
  }
  return (
    <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
      -
    </p>
  )
}

function productIsSold(product: Pick<AdminProduct, 'soldAt'>): boolean {
  return product.soldAt !== undefined
}

function productNeedsAttention(product: AdminProduct): boolean {
  if (productIsSold(product)) {
    return false
  }
  const hasCategory =
    product.categoryId !== undefined ||
    (Array.isArray(product.categoryPathSegments) &&
      product.categoryPathSegments.length > 0) ||
    (typeof product.category === 'string' && product.category.length > 0)
  return (
    product.captureStatus === 'processing' ||
    product.captureStatus === 'error' ||
    product.priceSek <= 0 ||
    !hasCategory
  )
}

function productStatus(product: AdminProduct): InventoryStatus {
  if (productIsSold(product)) {
    return 'sold'
  }
  if (product.captureStatus === 'processing') {
    return 'processing'
  }
  if (product.captureStatus === 'error') {
    return 'error'
  }
  if (productNeedsAttention(product)) {
    return 'draft'
  }
  return 'available'
}

function statusLabel(status: InventoryStatus): string {
  switch (status) {
    case 'available':
      return 'Till salu'
    case 'sold':
      return 'Såld'
    case 'processing':
      return 'Bearbetar'
    case 'error':
      return 'Fel'
    case 'draft':
      return 'Behöver åtgärd'
  }
}

function statusClass(status: InventoryStatus): string {
  switch (status) {
    case 'available':
      return 'border-status-success/20 bg-status-success/10 text-status-success'
    case 'sold':
      return 'border-status-sold/20 bg-status-sold/10 text-status-sold'
    case 'processing':
      return 'border-brand-dark/15 bg-brand-bg text-brand-dark/70'
    case 'error':
      return 'border-brand-accent/25 bg-brand-accent/10 text-brand-accent'
    case 'draft':
      return 'border-brand-dark/15 bg-brand-bg text-brand-dark/75'
  }
}

function ProductStatusBadge({ product }: { product: AdminProduct }) {
  const status = productStatus(product)
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  )
}

function cleanProductTitle(title: string): string {
  return title.replace(/<[^>]+>/g, '').slice(0, 200)
}

export function AdminDashboard() {
  const { session } = useShopSession()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const removeProduct = useMutation(api.products.softDeleteProduct)
  const markSold = useMutation(api.products.markProductSold)
  const markAvailable = useMutation(api.products.markProductAvailable)
  const updatePrice = useMutation(api.products.updateProductPrice)
  const [view, setView] = useState<InventoryView>('table')
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all')
  const [sort, setSort] = useState<InventorySort>('newest')
  const [search, setSearch] = useState('')
  const [editingPriceId, setEditingPriceId] = useState<Id<'products'> | null>(
    null,
  )
  const [priceDraft, setPriceDraft] = useState('')
  const [priceError, setPriceError] = useState<string | null>(null)
  const [busyProductId, setBusyProductId] = useState<Id<'products'> | null>(null)

  const { data: products = [] } = useQuery({
    ...convexQuery(api.products.listProductsByShop, {
      shopId: session?.shopId ?? ('' as Id<'shops'>),
    }),
    enabled: !!session,
  })

  const inventoryQueryKey = session
    ? convexQuery(api.products.listProductsByShop, {
        shopId: session.shopId,
      }).queryKey
    : null

  const invalidateInventory = async () => {
    if (!inventoryQueryKey) {
      return
    }
    await queryClient.invalidateQueries({ queryKey: inventoryQueryKey })
  }

  const kpis = useMemo(() => {
    const availableProducts = products.filter(
      (product) =>
        !productIsSold(product) &&
        product.captureStatus !== 'processing' &&
        product.captureStatus !== 'error',
    )
    const soldProducts = products.filter(productIsSold)
    const needsAttention = products.filter(productNeedsAttention)
    const valueInShop = availableProducts.reduce(
      (sum, product) => sum + product.priceSek,
      0,
    )
    return {
      availableCount: availableProducts.length,
      soldCount: soldProducts.length,
      needsAttentionCount: needsAttention.length,
      valueInShop,
    }
  }, [products])

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('sv')
    const filtered = products.filter((product) => {
      if (statusFilter === 'available' && productStatus(product) !== 'available') {
        return false
      }
      if (statusFilter === 'sold' && !productIsSold(product)) {
        return false
      }
      if (statusFilter === 'needsAttention' && !productNeedsAttention(product)) {
        return false
      }
      if (
        statusFilter === 'processing' &&
        product.captureStatus !== 'processing'
      ) {
        return false
      }
      if (statusFilter === 'error' && product.captureStatus !== 'error') {
        return false
      }
      if (!q) {
        return true
      }
      const categoryText = [
        ...product.categoryPathSegments,
        product.category ?? '',
      ].join(' ')
      const haystack = [product.title, product.description, categoryText]
        .join('\n')
        .toLocaleLowerCase('sv')
      return haystack.includes(q)
    })

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'priceDesc':
          return b.priceSek - a.priceSek
        case 'priceAsc':
          return a.priceSek - b.priceSek
        case 'title':
          return a.title.localeCompare(b.title, 'sv')
        case 'newest':
          return b._creationTime - a._creationTime
      }
    })
  }, [products, search, sort, statusFilter])

  const startPriceEdit = (product: AdminProduct) => {
    setEditingPriceId(product._id)
    setPriceDraft(String(product.soldPriceSek ?? product.priceSek))
    setPriceError(null)
  }

  const cancelPriceEdit = () => {
    setEditingPriceId(null)
    setPriceDraft('')
    setPriceError(null)
  }

  const savePrice = async (product: AdminProduct) => {
    if (!session) {
      return
    }
    const parsed = parsePriceSekToNumber(priceDraft)
    if (parsed === null) {
      setPriceError('Ange ett giltigt pris.')
      return
    }
    setBusyProductId(product._id)
    try {
      await updatePrice({
        productId: product._id,
        shopId: session.shopId,
        priceSek: parsed,
      })
      await invalidateInventory()
      cancelPriceEdit()
    } finally {
      setBusyProductId(null)
    }
  }

  const askRemove = async (productId: Id<'products'>, title: string) => {
    const ok = await confirm({
      title: 'Ta bort vara?',
      description: (
        <>
          Varan med titel{' '}
          <span className="font-medium text-brand-dark">{title}</span> försvinner
          från kundbutiken. Efter 14 dagar rensas posten hårt i bakgrunden enligt
          vår standardpolicy för borttagning.
        </>
      ),
      confirmLabel: 'Ta bort',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    })
    if (!ok || !session) {
      return
    }
    setBusyProductId(productId)
    try {
      await removeProduct({ productId, shopId: session.shopId })
      await invalidateInventory()
    } finally {
      setBusyProductId(null)
    }
  }

  const askMarkSold = async (product: AdminProduct) => {
    const ok = await confirm({
      title: 'Markera vara som såld?',
      description: (
        <>
          <span className="font-medium text-brand-dark">
            {cleanProductTitle(product.title)}
          </span>{' '}
          tas bort från kundbutiken men finns kvar i verktyget som såld.
        </>
      ),
      confirmLabel: 'Markera såld',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    })
    if (!ok || !session) {
      return
    }
    setBusyProductId(product._id)
    try {
      await markSold({ productId: product._id, shopId: session.shopId })
      await invalidateInventory()
    } finally {
      setBusyProductId(null)
    }
  }

  const restoreAvailable = async (product: AdminProduct) => {
    if (!session) {
      return
    }
    setBusyProductId(product._id)
    try {
      await markAvailable({ productId: product._id, shopId: session.shopId })
      await invalidateInventory()
    } finally {
      setBusyProductId(null)
    }
  }

  const priceCell = (product: AdminProduct) => {
    const isEditing = editingPriceId === product._id
    const isBusy = busyProductId === product._id
    if (isEditing) {
      return (
        <div className="min-w-0">
          <div className="flex flex-nowrap items-center gap-1.5">
            <input
              value={priceDraft}
              onChange={(event) =>
                setPriceDraft(sanitizePriceInput(event.target.value))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void savePrice(product)
                }
                if (event.key === 'Escape') {
                  cancelPriceEdit()
                }
              }}
              className="h-8 w-24 shrink-0 rounded-lg border border-brand-dark/20 bg-white px-2 font-mono text-sm tabular-nums text-brand-dark outline-none transition focus:border-brand-dark"
              inputMode="decimal"
              aria-label={`Pris för ${product.title}`}
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => void savePrice(product)}
              disabled={isBusy}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-dark text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
              aria-label="Spara pris"
              title="Spara"
            >
              <Check className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={cancelPriceEdit}
              disabled={isBusy}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-dark/15 text-brand-dark/70 transition hover:bg-brand-dark/5 hover:text-brand-dark disabled:opacity-50"
              aria-label="Avbryt"
              title="Avbryt"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {priceError ? (
            <p className="mt-1 text-xs font-medium text-brand-accent">
              {priceError}
            </p>
          ) : null}
        </div>
      )
    }

    return (
      <button
        type="button"
        onClick={() => startPriceEdit(product)}
        disabled={product.captureStatus === 'processing' || isBusy}
        className="rounded-lg px-2 py-1 text-left font-mono text-sm font-semibold tabular-nums text-brand-dark transition hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
        title={
          product.captureStatus === 'processing'
            ? 'Priset kan ändras när AI-listan är klar.'
            : 'Ändra pris'
        }
      >
        {sekFormatter.format(product.soldPriceSek ?? product.priceSek)}
      </button>
    )
  }

  const statusFlowActions = (
    product: AdminProduct,
    textAlign: 'start' | 'end' = 'start',
  ) => {
    const isBusy = busyProductId === product._id
    const processing = product.captureStatus === 'processing'
    const align =
      textAlign === 'end' ? 'text-end' : 'text-start'
    return productIsSold(product) ? (
      <button
        type="button"
        onClick={() => void restoreAvailable(product)}
        disabled={isBusy}
        className={`${align} text-xs font-medium text-brand-dark/70 underline decoration-brand-dark/30 underline-offset-2 transition hover:text-brand-dark hover:decoration-brand-dark/60 disabled:opacity-50`}
      >
        Åter till salu
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void askMarkSold(product)}
        disabled={isBusy || processing}
        title={
          processing
            ? 'Vänta tills AI-listan är klar.'
            : 'Flyttar varan till såld och döljer den i kundbutiken.'
        }
        className={`${align} text-xs font-medium text-brand-dark/70 underline decoration-brand-dark/30 underline-offset-2 transition hover:text-brand-dark hover:decoration-brand-dark/60 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Markera som såld
      </button>
    )
  }

  const statusColumn = (
    product: AdminProduct,
    layout: 'default' | 'narrowEnd' = 'default',
  ) => {
    const end = layout === 'narrowEnd'
    return (
      <div
        className={`max-w-[14rem] space-y-2 ${end ? 'ml-auto flex flex-col items-end' : ''}`}
      >
        <ProductStatusBadge product={product} />
        {product.captureError ? (
          <p
            className={`text-xs text-brand-accent ${end ? 'text-end' : ''}`}
          >
            {product.captureError}
          </p>
        ) : null}
        {statusFlowActions(product, end ? 'end' : 'start')}
      </div>
    )
  }

  const actionButtons = (product: AdminProduct) => {
    const isBusy = busyProductId === product._id
    return (
      <div className="flex flex-nowrap items-center justify-end gap-1.5">
        <Link
          to="/app/varor/$productId/redigera"
          params={{ productId: product._id }}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-dark/15 bg-white text-brand-dark transition hover:border-brand-dark/35"
          aria-label="Redigera"
          title="Redigera"
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          disabled={isBusy}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-accent/45 bg-brand-accent/15 text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/25 disabled:opacity-50"
          aria-label="Ta bort"
          title="Ta bort"
          onClick={() => {
            void askRemove(product._id, cleanProductTitle(product.title))
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    )
  }

  const productSummary = (product: AdminProduct) => {
    const description = product.description.trim()
    if (description.length === 0) {
      return 'Ingen beskrivning ännu.'
    }
    return description
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar ...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-6 border-b border-brand-dark/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
            Verktyg / Varor
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-brand-dark">
            {session.shopName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-brand-dark/75">
            Följ lagret, fånga varor som behöver åtgärdas och stäng av en vara i
            kundbutiken direkt när den säljs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/app/varor/ny"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
          >
            Lägg till vara
          </Link>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: session.shopSlug }}
            search={emptyButikListingSearch}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Visa kundbutik
          </Link>
          <Link
            to="/app/butik/design"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Butiksdesign
          </Link>
        </div>
      </div>

      <section
        className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Lagerstatus"
      >
        <div className="rounded-lg border border-brand-dark/8 bg-brand-surface p-4 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
            Till salu
          </p>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums text-brand-dark">
            {kpis.availableCount}
          </p>
          <p className="mt-1 text-xs text-brand-dark/55">Synliga i verktyget</p>
        </div>
        <div className="rounded-lg border border-brand-dark/8 bg-brand-surface p-4 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
            Sålda
          </p>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums text-brand-dark">
            {kpis.soldCount}
          </p>
          <p className="mt-1 text-xs text-brand-dark/55">Behålls som historik</p>
        </div>
        <div className="rounded-lg border border-brand-dark/8 bg-brand-surface p-4 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
            Värde i butik
          </p>
          <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-brand-dark">
            {sekFormatter.format(kpis.valueInShop)}
          </p>
          <p className="mt-1 text-xs text-brand-dark/55">Osålda varor med pris</p>
        </div>
        <div className="rounded-lg border border-brand-dark/8 bg-brand-surface p-4 shadow-sm">
          <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
            Behöver åtgärd
          </p>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums text-brand-accent">
            {kpis.needsAttentionCount}
          </p>
          <p className="mt-1 text-xs text-brand-dark/55">
            AI, pris eller kategori
          </p>
        </div>
      </section>

      <section>
        <div className="rounded-lg border border-brand-dark/8 bg-brand-surface p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-brand-dark">
                Lager
              </h2>
              <p className="text-sm text-brand-dark/60">
                Visar {visibleProducts.length} av {products.length} varor.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-10 rounded-lg border border-brand-dark/15 bg-white px-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/40 focus:border-brand-dark lg:w-64"
                placeholder="Sök vara, kategori, beskrivning"
                type="search"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as InventoryStatusFilter)
                }
                className="min-h-10 rounded-lg border border-brand-dark/15 bg-white px-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-dark"
                aria-label="Filtrera status"
              >
                <option value="all">Alla statusar</option>
                <option value="available">Till salu</option>
                <option value="sold">Sålda</option>
                <option value="needsAttention">Behöver åtgärd</option>
                <option value="processing">Bearbetar</option>
                <option value="error">Fel</option>
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as InventorySort)}
                className="min-h-10 rounded-lg border border-brand-dark/15 bg-white px-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-dark"
                aria-label="Sortera varor"
              >
                <option value="newest">Nyast först</option>
                <option value="priceDesc">Högst pris</option>
                <option value="priceAsc">Lägst pris</option>
                <option value="title">Namn A-Ö</option>
              </select>
              <div
                className="flex rounded-lg border border-brand-dark/15 bg-brand-bg p-1"
                role="group"
                aria-label="Vy"
              >
                <button
                  type="button"
                  onClick={() => setView('table')}
                  className={`inline-flex size-9 items-center justify-center rounded-md transition ${
                    view === 'table'
                      ? 'bg-brand-surface text-brand-dark shadow-sm'
                      : 'text-brand-dark/60 hover:text-brand-dark'
                  }`}
                  aria-label="Tabellvy"
                  title="Tabell"
                >
                  <Table2 className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`inline-flex size-9 items-center justify-center rounded-md transition ${
                    view === 'grid'
                      ? 'bg-brand-surface text-brand-dark shadow-sm'
                      : 'text-brand-dark/60 hover:text-brand-dark'
                  }`}
                  aria-label="Rutnätsvy"
                  title="Rutnät"
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-brand-dark/20 bg-brand-surface p-12 text-center shadow-sm">
            <p className="text-brand-dark/80">Inga varor ännu.</p>
            <Link
              to="/app/varor/ny"
              className="mt-4 inline-block text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
            >
              Lägg till första varan med foto
            </Link>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-brand-dark/20 bg-brand-surface p-10 text-center shadow-sm">
            <p className="font-medium text-brand-dark">Inga varor matchar filtret.</p>
            <p className="mt-1 text-sm text-brand-dark/60">
              Ändra sökning eller statusfilter för att se fler rader.
            </p>
          </div>
        ) : view === 'table' ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-brand-dark/8 bg-brand-surface shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-brand-dark/8">
                <thead className="bg-brand-bg/70">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Vara
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Pris
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Datum
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark/8">
                  {visibleProducts.map((product) => (
                    <tr key={product._id} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex min-w-72 items-center gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-brand-bg">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="absolute inset-0 size-full object-cover object-center"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-brand-dark/35">
                                Bild
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-heading text-sm font-semibold text-brand-dark">
                              {product.title}
                            </p>
                            <p className="mt-1 line-clamp-1 max-w-md text-xs text-brand-dark/60">
                              {productSummary(product)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusColumn(product)}</td>
                      <td className="px-4 py-3">{priceCell(product)}</td>
                      <td className="px-4 py-3 text-sm text-brand-dark/65">
                        <AdminProductCategoryRow product={product} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-dark/55">
                        {product.soldAt
                          ? `Såld ${dateFormatter.format(product.soldAt)}`
                          : dateFormatter.format(product._creationTime)}
                      </td>
                      <td className="px-4 py-3">{actionButtons(product)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-brand-dark/8 lg:hidden">
              {visibleProducts.map((product) => (
                <li key={product._id} className="p-4">
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-brand-bg">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="absolute inset-0 size-full object-cover object-center"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-brand-dark/35">
                          Bild
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="min-w-0 flex-1 font-heading text-sm font-semibold leading-snug text-brand-dark">
                          {product.title}
                        </h3>
                        <div className="shrink-0">
                          {statusColumn(product, 'narrowEnd')}
                        </div>
                      </div>
                      <div className="mt-2">{priceCell(product)}</div>
                      <div className="mt-2">
                        <AdminProductCategoryRow product={product} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">{actionButtons(product)}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <li key={product._id}>
                <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-brand-dark/8 bg-brand-surface shadow-sm">
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-brand-bg">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-brand-dark/40">
                        Ingen bild
                      </div>
                    )}
                    <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)]">
                      <ProductStatusBadge product={product} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-heading text-sm font-semibold leading-snug text-brand-dark">
                        {product.title}
                      </h3>
                      <div className="mt-2">{priceCell(product)}</div>
                    </div>
                    <AdminProductCategoryRow product={product} />
                    <p className="line-clamp-2 text-xs leading-relaxed text-brand-dark/65">
                      {productSummary(product)}
                    </p>
                    <div className="space-y-2 border-t border-brand-dark/8 pt-2">
                      {product.captureError ? (
                        <p className="text-xs text-brand-accent">
                          {product.captureError}
                        </p>
                      ) : null}
                      {statusFlowActions(product)}
                    </div>
                    <div className="mt-auto pt-1">{actionButtons(product)}</div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
