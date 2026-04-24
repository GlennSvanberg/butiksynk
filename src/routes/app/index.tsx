import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { CategoryBreadcrumb } from '~/components/CategoryBreadcrumb'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { useConfirm } from '~/lib/confirm'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/')({
  component: AdminDashboard,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

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
      —
    </p>
  )
}

export function AdminDashboard() {
  const { session } = useShopSession()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const removeProduct = useMutation(api.products.softDeleteProduct)

  const { data: products = [] } = useQuery({
    ...convexQuery(api.products.listProductsByShop, {
      shopId: session!.shopId,
    }),
    enabled: !!session,
  })

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
    if (!ok) {
      return
    }
    if (!session) {
      return
    }
    await removeProduct({ productId, shopId: session.shopId })
    const qk = convexQuery(api.products.listProductsByShop, {
      shopId: session.shopId,
    }).queryKey
    await queryClient.invalidateQueries({ queryKey: qk })
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar …</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-6 border-b border-brand-dark/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
            Varor
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-brand-dark">
            {session.shopName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-brand-dark/75">
            Lägg till varor med foto — AI skapar annonsen. Öppna din kundbutik för
            att se hur det ser ut för kunder.
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

      <section className="mb-8 rounded-lg border border-brand-dark/8 bg-brand-surface px-4 py-4 shadow-sm sm:px-6">
        <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
          Antal varor
        </p>
        <p className="font-heading text-2xl font-bold tabular-nums text-brand-dark">
          {products.length}
        </p>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold text-brand-dark">
          Dina varor
        </h2>
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
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product._id}>
                <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-brand-dark/8 bg-brand-surface shadow-sm">
                  <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-brand-bg">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover object-center"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-brand-dark/40">
                        Ingen bild
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-lg font-semibold leading-snug text-brand-dark">
                        {product.title}
                      </h3>
                      <p className="shrink-0 font-mono text-sm font-medium tabular-nums text-brand-dark">
                        {sekFormatter.format(product.priceSek)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/app/varor/$productId/redigera"
                        params={{ productId: product._id }}
                        className="text-xs font-semibold text-brand-dark underline decoration-brand-dark/30 underline-offset-2 hover:decoration-brand-dark"
                      >
                        Redigera
                      </Link>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-accent"
                        onClick={() => {
                          void askRemove(
                            product._id,
                            product.title.replace(/<[^>]+>/g, '').slice(0, 200),
                          )
                        }}
                      >
                        Ta bort
                      </button>
                    </div>
                    <AdminProductCategoryRow product={product} />
                    <p className="line-clamp-3 text-sm leading-relaxed text-brand-dark/80">
                      {product.description}
                    </p>
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
