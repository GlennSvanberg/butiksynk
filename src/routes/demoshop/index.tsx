import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/demoshop/')({
  component: DemoshopPage,
})

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
})

function DemoshopPage() {
  const { data: products } = useSuspenseQuery(
    convexQuery(api.products.listProducts, {}),
  )

  return (
    <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-10 flex flex-col gap-4 border-b border-brand-dark/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
              Demo
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-brand-dark">
              Demoshop
            </h1>
            <p className="mt-2 max-w-xl text-sm text-brand-dark/75">
              Utvalda varor — samma data som du lägger in manuellt kommer synkas hit i realtid.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <Link
              to="/demoshop/snabb"
              className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-brand-bg"
            >
              Snabb läggning
            </Link>
            <Link
              to="/demoshop/ny"
              className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
            >
              Lägg till produkt
            </Link>
          </div>
        </header>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-dark/20 bg-brand-surface p-12 text-center shadow-sm">
            <p className="text-brand-dark/80">Inga produkter ännu.</p>
            <Link
              to="/demoshop/ny"
              className="mt-4 inline-block text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
            >
              Skapa den första produkten
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product._id}>
                <article className="flex h-full flex-col overflow-hidden rounded-lg border border-brand-dark/8 bg-brand-surface shadow-sm">
                  <div className="relative aspect-[4/3] bg-brand-bg">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center font-mono text-sm text-brand-dark/40">
                        Ingen bild
                      </div>
                    )}
                    {product.captureStatus === 'processing' ? (
                      <span className="absolute left-2 top-2 rounded bg-brand-dark/85 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-white">
                        Bearbetar…
                      </span>
                    ) : null}
                    {product.captureStatus === 'error' ? (
                      <span className="absolute left-2 top-2 rounded bg-brand-accent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-white">
                        Fel
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {product.captureStatus === 'error' &&
                    product.captureError ? (
                      <p className="rounded-md bg-brand-accent/10 px-2 py-1.5 text-xs text-brand-dark">
                        {product.captureError}
                      </p>
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-heading text-lg font-semibold leading-snug text-brand-dark">
                        {product.title}
                      </h2>
                      <p className="shrink-0 font-mono text-sm font-medium tabular-nums text-brand-dark">
                        {sekFormatter.format(product.priceSek)}
                      </p>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-wide text-brand-dark/50">
                      {product.category}
                    </p>
                    <p className="line-clamp-3 text-sm leading-relaxed text-brand-dark/80">
                      {product.description}
                    </p>
                    {product.attributes.length > 0 ? (
                      <dl className="mt-auto space-y-1 border-t border-brand-dark/8 pt-3 text-sm">
                        {product.attributes.map((attr, i) => (
                          <div
                            key={`${product._id}-${i}`}
                            className="flex justify-between gap-3"
                          >
                            <dt className="text-brand-dark/60">{attr.label}</dt>
                            <dd className="font-medium text-brand-dark">
                              {attr.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
          >
            ← Till startsidan
          </Link>
        </p>
      </div>
    </main>
  )
}
