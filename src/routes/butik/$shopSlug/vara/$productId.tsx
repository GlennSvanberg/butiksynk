import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { formatProductAttributeDisplay } from '~/lib/formatProductAttribute'

export const Route = createFileRoute('/butik/$shopSlug/vara/$productId')({
  component: ButikProductDetail,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

function ButikProductDetail() {
  const { shopSlug, productId: productIdParam } = Route.useParams()
  const productId = productIdParam as Id<'products'>

  const { data: product, isPending } = useQuery({
    ...convexQuery(api.products.getProductForPublicStorefront, {
      slug: shopSlug,
      productId,
    }),
  })

  if (isPending) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[color:var(--sf-primary)]/70">Laddar …</p>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="font-heading text-lg font-semibold text-[color:var(--sf-primary)]">
          Varan finns inte
        </p>
        <Link
          to="/butik/$shopSlug"
          params={{ shopSlug }}
          search={emptyButikListingSearch}
          className="mt-4 inline-block text-sm font-medium text-[color:var(--sf-accent)] underline decoration-[color:var(--sf-accent)]/30 underline-offset-4"
        >
          Tillbaka till sortimentet
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        to="/butik/$shopSlug"
        params={{ shopSlug }}
        search={emptyButikListingSearch}
        className="text-sm font-medium text-[color:var(--sf-primary)]/80 underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 hover:decoration-[color:var(--sf-primary)]/50"
      >
        ← Tillbaka till sortimentet
      </Link>

      <article
        className="mt-8 overflow-hidden rounded-lg border border-[color:var(--sf-primary)]/10 shadow-sm"
        style={{ backgroundColor: 'var(--sf-surface)' }}
      >
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
        <div className="space-y-4 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-3xl">
              {product.title}
            </h1>
            <p className="font-mono text-xl font-semibold tabular-nums text-[color:var(--sf-primary)]">
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--sf-primary)]/85">
            {product.description}
          </p>
          {product.attributes.length > 0 ? (
            <dl className="space-y-2 border-t border-[color:var(--sf-primary)]/10 pt-4 text-sm">
              {product.attributes.map((attr, i) => {
                const row = formatProductAttributeDisplay(attr)
                return (
                  <div
                    key={`${product._id}-${i}`}
                    className="flex justify-between gap-4"
                  >
                    <dt className="text-[color:var(--sf-primary)]/60">{row.label}</dt>
                    <dd className="font-medium text-[color:var(--sf-primary)]">
                      {row.value}
                    </dd>
                  </div>
                )
              })}
            </dl>
          ) : null}
        </div>
      </article>
    </main>
  )
}
