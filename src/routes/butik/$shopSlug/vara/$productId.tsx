import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { KeyboardEvent } from 'react'
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
}): Array<StorefrontImageSlide> {
  const slides: Array<StorefrontImageSlide> = []
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

function ProductDetailSkeleton() {
  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 h-4 w-40 rounded bg-[color:var(--sf-primary)]/10" />
        <div className="overflow-hidden rounded-3xl border border-[color:var(--sf-primary)]/8 bg-[var(--sf-surface)] shadow-sm lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="aspect-square animate-pulse bg-[color:var(--sf-primary)]/8 lg:min-h-[38rem]" />
          <div className="space-y-5 p-6 sm:p-8 lg:p-10 xl:p-12">
            <div className="h-3 w-32 rounded bg-[color:var(--sf-primary)]/8" />
            <div className="h-8 w-3/4 rounded bg-[color:var(--sf-primary)]/10" />
            <div className="h-6 w-32 rounded bg-[color:var(--sf-primary)]/10" />
            <div className="space-y-2 pt-4">
              <div className="h-4 rounded bg-[color:var(--sf-primary)]/7" />
              <div className="h-4 rounded bg-[color:var(--sf-primary)]/7" />
              <div className="h-4 w-2/3 rounded bg-[color:var(--sf-primary)]/7" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function StorefrontImageCarousel({
  slides,
  productTitle,
}: {
  slides: Array<StorefrontImageSlide>
  productTitle: string
}) {
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
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      }
    },
    [go],
  )

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[color:var(--sf-primary)]/40">
        Ingen bild
      </div>
    )
  }

  if (slides.length === 1) {
    const only = slides[0]
    return (
      <img
        src={only.url}
        alt={productTitle}
        decoding="async"
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
        tabIndex={0}
        onKeyDown={onKeyDown}
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
                alt={productTitle}
                decoding="async"
                className="absolute inset-0 size-full object-cover object-center"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/80"
          aria-label="Föregående bild"
        >
          <ChevronLeft className="size-6" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/80"
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
    return <ProductDetailSkeleton />
  }

  if (!product) {
    return (
      <main className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-surface)] p-8 text-center shadow-sm">
          <p className="font-heading text-xl font-semibold text-[color:var(--sf-primary)]">
            Varan finns inte
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--sf-primary)]/65">
            Den kan ha tagits bort eller sålts i butik.
          </p>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug }}
            search={emptyButikListingSearch}
            className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: 'var(--sf-primary)' }}
          >
            Tillbaka till sortimentet
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Link
          to="/butik/$shopSlug"
          params={{ shopSlug }}
          search={emptyButikListingSearch}
          className="inline-flex items-center text-sm font-medium text-[color:var(--sf-primary)]/78 underline decoration-[color:var(--sf-primary)]/25 underline-offset-4 transition hover:text-[color:var(--sf-primary)] hover:decoration-[color:var(--sf-primary)]/50"
        >
          ← Tillbaka till sortimentet
        </Link>

        <article
          className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--sf-primary)]/10 shadow-sm lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch"
          style={{ backgroundColor: 'var(--sf-surface)' }}
        >
          <div
            className={
              imageSlides.length > 1
                ? 'relative flex aspect-square w-full shrink-0 flex-col overflow-hidden bg-[var(--sf-bg)] lg:min-h-[38rem]'
                : 'relative aspect-square w-full shrink-0 overflow-hidden bg-[var(--sf-bg)] lg:min-h-[38rem]'
            }
          >
            <div
              className={
                imageSlides.length > 1
                  ? 'relative min-h-0 flex-1'
                  : 'absolute inset-0'
              }
            >
              <StorefrontImageCarousel
                slides={imageSlides}
                productTitle={product.title}
              />
            </div>
          </div>
          <div className="min-w-0 border-[color:var(--sf-primary)]/10 p-5 sm:p-8 lg:border-l lg:p-10 xl:p-12">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--sf-primary)]/12 bg-[var(--sf-bg)] px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--sf-primary)]/72">
                Tillgänglig
              </span>
              <span className="rounded-full border border-[color:var(--sf-accent)]/18 bg-[color:var(--sf-accent)]/8 px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-wide text-[color:var(--sf-accent)]">
                Unik vara
              </span>
            </div>

            <div className="mt-5 space-y-3">
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
                ) : null}
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-[color:var(--sf-primary)] sm:text-4xl">
                {product.title}
              </h1>
              <p className="font-mono text-2xl font-semibold tabular-nums text-[color:var(--sf-primary)]">
                {sekFormatter.format(product.priceSek)}
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)]/45 p-4 sm:p-5">
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-[color:var(--sf-primary)]/50">
                Beskrivning
              </p>
              <p className="mt-3 max-w-[62ch] whitespace-pre-wrap text-base leading-7 text-[color:var(--sf-primary)]/82">
                {product.description}
              </p>
            </div>

            {product.attributes.length > 0 ? (
              <section className="mt-7 border-t border-[color:var(--sf-primary)]/10 pt-6">
                <h2 className="font-heading text-base font-semibold text-[color:var(--sf-primary)]">
                  Detaljer
                </h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {product.attributes.map((attr, i) => {
                    const row = formatProductAttributeDisplay(attr)
                    return (
                      <div
                        key={`${product._id}-${i}`}
                        className="rounded-xl border border-[color:var(--sf-primary)]/10 bg-[var(--sf-bg)] px-4 py-3"
                      >
                        <dt className="font-mono text-[0.68rem] font-medium uppercase tracking-wide text-[color:var(--sf-primary)]/50">
                          {row.label}
                        </dt>
                        <dd className="mt-1 font-medium text-[color:var(--sf-primary)]">
                          {row.value}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            ) : null}

            <aside className="mt-7 rounded-2xl border border-[color:var(--sf-accent)]/18 bg-[color:var(--sf-accent)]/7 p-5">
              <p className="font-heading text-base font-semibold text-[color:var(--sf-primary)]">
                Intresserad av varan?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--sf-primary)]/70">
                Kontakta butiken via uppgifterna längst ner på sidan. Eftersom
                varje vara är unik kan den säljas i butik när som helst.
              </p>
            </aside>
          </div>
        </article>
      </div>
    </main>
  )
}
