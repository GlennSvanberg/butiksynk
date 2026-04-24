import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { CategoryBreadcrumb } from '~/components/CategoryBreadcrumb'
import { formatProductAttributeDisplay } from '~/lib/formatProductAttribute'

export const Route = createFileRoute('/butik/$shopSlug/vara/$productId')({
  component: ButikProductDetail,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

type StorefrontImageSlide = { url: string; caption: string }

function storefrontProductSlides(product: {
  imageUrl: string | null | undefined
  sourceImageUrl: string | null | undefined
}): StorefrontImageSlide[] {
  const slides: StorefrontImageSlide[] = []
  if (product.imageUrl) {
    slides.push({ url: product.imageUrl, caption: 'Visningsbild (som i sortimentet)' })
  }
  const source = product.sourceImageUrl
  if (source && source !== product.imageUrl) {
    slides.push({ url: source, caption: 'Originalfoto' })
  }
  if (slides.length === 0 && source) {
    slides.push({ url: source, caption: 'Foto' })
  }
  return slides
}

function StorefrontImageCarousel({ slides }: { slides: StorefrontImageSlide[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)))
  }, [slides.length])

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        if (slides.length === 0) return 0
        const n = slides.length
        return (i + delta + n) % n
      })
    },
    [slides.length],
  )

  const slidePct = slides.length > 0 ? 100 / slides.length : 100

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[color:var(--sf-primary)]/40">
        Ingen bild
      </div>
    )
  }

  if (slides.length === 1) {
    const only = slides[0]!
    return (
      <img
        src={only.url}
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
      />
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        aria-roledescription="karusell"
        aria-label="Produktbilder"
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${index * slidePct}%)`,
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.url}
              className="relative h-full shrink-0"
              style={{ width: `${slidePct}%` }}
            >
              <img
                src={slide.url}
                alt=""
                className="absolute inset-0 size-full object-cover object-center"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Föregående bild"
        >
          <ChevronLeft className="size-6" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Nästa bild"
        >
          <ChevronRight className="size-6" strokeWidth={2} />
        </button>
      </div>

      <div
        className="shrink-0 border-t border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)] px-3 py-2.5"
        aria-live="polite"
      >
        <p className="text-center text-xs font-medium text-[color:var(--sf-primary)]/80">
          {slides[index]?.caption}
        </p>
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.url}
              type="button"
              onClick={() => setIndex(i)}
              className={
                i === index
                  ? 'size-2 rounded-full bg-[color:var(--sf-accent)] ring-2 ring-[color:var(--sf-accent)]/35'
                  : 'size-2 rounded-full bg-[color:var(--sf-primary)]/25 hover:bg-[color:var(--sf-primary)]/45'
              }
              aria-label={`Bild ${i + 1} av ${slides.length}`}
              aria-current={i === index ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ButikProductDetail() {
  const { shopSlug, productId: productIdParam } = Route.useParams()
  const productId = productIdParam as Id<'products'>

  const { data: product, isPending } = useQuery({
    ...convexQuery(api.products.getProductForPublicStorefront, {
      slug: shopSlug,
      productId,
    }),
  })

  const imageSlides = useMemo(() => {
    if (!product) return []
    return storefrontProductSlides(product)
  }, [product?.imageUrl, product?.sourceImageUrl])

  if (isPending) {
    return (
      <main className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
        <p className="text-sm text-[color:var(--sf-primary)]/70">Laddar …</p>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
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
    <main className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          to="/butik/$shopSlug"
          params={{ shopSlug }}
          search={emptyButikListingSearch}
          className="text-sm font-medium text-[color:var(--sf-primary)]/80 underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 hover:decoration-[color:var(--sf-primary)]/50"
        >
          ← Tillbaka till sortimentet
        </Link>

        <article
          className="mt-8 flex flex-col overflow-hidden rounded-xl border border-[color:var(--sf-primary)]/10 shadow-sm lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start"
          style={{ backgroundColor: 'var(--sf-surface)' }}
        >
          <div
            className={
              imageSlides.length > 1
                ? 'relative flex aspect-square w-full shrink-0 flex-col overflow-hidden bg-[var(--sf-bg)]'
                : 'relative aspect-square w-full shrink-0 overflow-hidden bg-[var(--sf-bg)]'
            }
          >
            <div
              className={
                imageSlides.length > 1
                  ? 'relative min-h-0 flex-1'
                  : 'absolute inset-0'
              }
            >
              <StorefrontImageCarousel slides={imageSlides} />
            </div>
          </div>
          <div className="min-w-0 space-y-4 border-[color:var(--sf-primary)]/10 p-5 sm:p-8 lg:border-l lg:p-10 xl:p-12">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-3xl">
              {product.title}
            </h1>
            <p className="font-mono text-xl font-semibold tabular-nums text-[color:var(--sf-primary)]">
              {sekFormatter.format(product.priceSek)}
            </p>
          </div>
          <div className="text-[color:var(--sf-primary)]/50">
            {Array.isArray(product.categoryPathSegments) &&
            product.categoryPathSegments.length > 0 ? (
              <CategoryBreadcrumb segments={product.categoryPathSegments} />
            ) : 'category' in product &&
              typeof product.category === 'string' &&
              product.category.length > 0 ? (
              <p className="font-mono text-xs uppercase tracking-wide">
                {product.category}
              </p>
            ) : (
              <p className="font-mono text-xs uppercase tracking-wide">—</p>
            )}
          </div>
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
      </div>
    </main>
  )
}
