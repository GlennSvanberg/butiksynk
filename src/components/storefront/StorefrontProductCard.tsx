import { Link } from '@tanstack/react-router'
import type { Doc } from '../../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { formatProductAttributeDisplay } from '~/lib/formatProductAttribute'

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

export type StorefrontProductCardModel = Pick<
  Doc<'products'>,
  '_id' | 'title' | 'description' | 'priceSek' | 'attributes'
> & {
  categoryPathSegments?: Array<string>
  category?: string
  imageUrl: string | null
}

function ProductCategoryRow({
  product,
}: {
  product: Pick<
    StorefrontProductCardModel,
    'categoryPathSegments' | 'category'
  >
}) {
  const segments = Array.isArray(product.categoryPathSegments)
    ? product.categoryPathSegments
    : []
  if (segments.length > 0) {
    return (
      <p className="truncate font-mono text-[0.68rem] uppercase tracking-wide text-[color:var(--sf-primary)]/50">
        {segments.join(' / ')}
      </p>
    )
  }
  if (
    'category' in product &&
    typeof product.category === 'string' &&
    product.category.length > 0
  ) {
    return (
      <p className="truncate font-mono text-[0.68rem] uppercase tracking-wide text-[color:var(--sf-primary)]/50">
        {product.category}
      </p>
    )
  }
  return null
}

export function StorefrontProductCard({
  shopSlug,
  product,
}: {
  shopSlug: string
  product: StorefrontProductCardModel
}) {
  return (
    <Link
      to="/butik/$shopSlug/vara/$productId"
      params={{ shopSlug, productId: product._id }}
      search={emptyButikListingSearch}
      className="group block h-full rounded-2xl border border-[color:var(--sf-primary)]/10 shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--sf-primary)]/22 hover:shadow-md"
      style={{ backgroundColor: 'var(--sf-surface)' }}
    >
      <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--sf-bg)]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover object-center transition duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[color:var(--sf-primary)]/40">
              Ingen bild
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full border border-white/35 bg-[var(--sf-surface)]/88 px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-wide text-[color:var(--sf-primary)] shadow-sm backdrop-blur-sm">
            Tillgänglig
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="space-y-1.5">
            <ProductCategoryRow product={product} />
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 font-heading text-base font-semibold leading-snug text-[color:var(--sf-primary)]">
                {product.title}
              </h2>
              <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[color:var(--sf-primary)]">
                {sekFormatter.format(product.priceSek)}
              </p>
            </div>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-[color:var(--sf-primary)]/75">
            {product.description}
          </p>
          {product.attributes.length > 0 ? (
            <dl className="mt-auto flex flex-wrap gap-1.5 border-t border-[color:var(--sf-primary)]/8 pt-3 text-[0.68rem]">
              {product.attributes.slice(0, 2).map((attr, i) => {
                const row = formatProductAttributeDisplay(attr)
                return (
                  <div
                    key={`${product._id}-${i}`}
                    className="rounded-full border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)] px-2 py-0.5"
                  >
                    <dt className="sr-only">{row.label}</dt>
                    <dd className="font-medium text-[color:var(--sf-primary)]/78">
                      {row.value}
                    </dd>
                  </div>
                )
              })}
              {product.attributes.length > 2 ? (
                <div className="rounded-full border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)] px-2 py-0.5 font-medium text-[color:var(--sf-primary)]/55">
                  +{product.attributes.length - 2}
                </div>
              ) : null}
            </dl>
          ) : null}
          <span className="pt-0.5 text-sm font-semibold text-[color:var(--sf-accent)]">
            Visa vara
            <span
              className="ml-1 inline-block transition group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </span>
        </div>
      </article>
    </Link>
  )
}
