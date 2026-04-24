import { Link, Navigate, createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { formatProductAttributeDisplay } from '~/lib/formatProductAttribute'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/produkter/$productId/redigera')({
  component: RedigeraProdukt,
})

function RedigeraProdukt() {
  const { productId: productIdParam } = Route.useParams()
  const { session } = useShopSession()
  const router = useRouter()
  const titleId = useId()

  const productId = productIdParam as Id<'products'>

  const getProduct = useQuery(
    api.products.getProductForEdit,
    session ? { productId, shopId: session.shopId } : 'skip',
  )
  const categories = useQuery(
    api.taxonomy.listCategoryOptions,
    session ? { shopId: session.shopId } : 'skip',
  )
  const updateProduct = useMutation(api.products.updateProduct)
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const ensureTaxonomy = useMutation(api.taxonomy.ensureTaxonomyForShop)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceSek, setPriceSek] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newImageId, setNewImageId] = useState<Id<'_storage'> | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const formSyncedId = useRef<string | null>(null)

  useEffect(() => {
    if (session) {
      void ensureTaxonomy({ shopId: session.shopId })
    }
  }, [session, ensureTaxonomy])

  useEffect(() => {
    formSyncedId.current = null
  }, [productId])

  useEffect(() => {
    if (getProduct === null || getProduct === undefined) {
      return
    }
    if (categories === undefined) {
      return
    }
    if (formSyncedId.current === getProduct._id) {
      return
    }
    setTitle(getProduct.title)
    setDescription(getProduct.description)
    setPriceSek(String(getProduct.priceSek))
    setCategoryId(
      getProduct.categoryId
        ? getProduct.categoryId
        : categories[0]
          ? categories[0].id
          : '',
    )
    formSyncedId.current = getProduct._id
  }, [getProduct, categories, productId])

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!session) {
        return
      }
      if (!getProduct) {
        return
      }
      if (getProduct.captureStatus === 'processing') {
        setError('Vänta tills AI är klar.')
        return
      }
      const n = Number(priceSek.replace(/\s/g, '').replace(',', '.'))
      if (!Number.isFinite(n) || n < 0) {
        setError('Ange ett giltigt pris.')
        return
      }
      if (!categoryId) {
        setError('Välj kategori.')
        return
      }
      setError(null)
      setSaving(true)
      try {
        await updateProduct({
          productId,
          shopId: session.shopId,
          title: title.trim(),
          description: description.trim(),
          priceSek: Math.round(n),
          categoryId: categoryId as Id<'taxonomyNodes'>,
          attributes: getProduct.attributes,
          ...(newImageId ? { imageStorageId: newImageId } : {}),
        })
        void router.navigate({ to: '/app' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte spara.')
      } finally {
        setSaving(false)
      }
    },
    [
      session,
      getProduct,
      priceSek,
      categoryId,
      title,
      description,
      productId,
      newImageId,
      updateProduct,
      router,
    ],
  )

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      return
    }
    setError(null)
    setUploadBusy(true)
    try {
      const postUrl = await generateUploadUrl()
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      })
      if (!res.ok) {
        throw new Error('Uppladdning misslyckades.')
      }
      const json = (await res.json()) as { storageId: string }
      setNewImageId(json.storageId as Id<'_storage'>)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Bilden kunde inte laddas upp.',
      )
    } finally {
      setUploadBusy(false)
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar session …</p>
      </main>
    )
  }

  if (getProduct === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-sm text-brand-dark/75">Hämtar produkt …</p>
      </main>
    )
  }

  if (getProduct === null) {
    return <Navigate to="/app" replace />
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Admin · {session.shopName}
        </p>
        <h1
          className="font-heading text-2xl font-bold text-brand-dark"
          id={titleId}
        >
          Redigera produkt
        </h1>
        <p className="mt-2 text-sm text-brand-dark/75">
          Ändringar syns i översikten och i demoshop direkt när de sparats.
        </p>
      </header>

      {getProduct.captureStatus === 'processing' ? (
        <div className="mb-4 rounded-lg border border-brand-dark/10 bg-brand-surface p-4 text-sm text-brand-dark/80">
          <p>
            Produkten bearbetas fortfarande av AI. Du kan spara
            borttagning, men fält kan inte redigeras tills listningen är klar.
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          className="mb-4 rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-lg border border-brand-dark/8 bg-brand-surface p-5 shadow-sm"
        aria-labelledby={titleId}
      >
        {newImageId && (
          <p className="text-sm text-brand-dark/80">
            Ny vald bild ersätter visningsbilden när du sparar.
          </p>
        )}

        <div>
          <label
            className="block text-sm font-medium text-brand-dark"
            htmlFor="edit-title"
          >
            Titel
          </label>
          <input
            id="edit-title"
            className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={getProduct.captureStatus === 'processing' || saving}
            maxLength={500}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-brand-dark"
            htmlFor="edit-desc"
          >
            Beskrivning
          </label>
          <textarea
            id="edit-desc"
            className="mt-1 w-full min-h-28 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={getProduct.captureStatus === 'processing' || saving}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-brand-dark"
            htmlFor="edit-price"
          >
            Pris (SEK)
          </label>
          <input
            id="edit-price"
            type="text"
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark tabular-nums"
            value={priceSek}
            onChange={(e) => setPriceSek(e.target.value)}
            required
            disabled={getProduct.captureStatus === 'processing' || saving}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-brand-dark"
            htmlFor="edit-cat"
          >
            Kategori
          </label>
          <select
            id="edit-cat"
            className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={getProduct.captureStatus === 'processing' || saving}
          >
            {categories && categories.length > 0
              ? categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.pathLabel}
                  </option>
                ))
              : null}
          </select>
        </div>

        {getProduct.attributes.length > 0 && (
          <div className="border-t border-brand-dark/8 pt-4">
            <p className="text-sm font-medium text-brand-dark">Attribut (AI)</p>
            <ul className="mt-2 space-y-1 text-sm text-brand-dark/85">
              {getProduct.attributes.map((attr, i) => {
                const row = formatProductAttributeDisplay(attr)
                return (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-brand-dark/60">{row.label}</span>
                    <span>{row.value}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="border-t border-brand-dark/8 pt-4">
          <label
            className="block text-sm font-medium text-brand-dark"
            htmlFor="edit-img"
          >
            Byt huvudbild (valfritt)
          </label>
          <input
            id="edit-img"
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0]
              void onFile(f)
            }}
            disabled={getProduct.captureStatus === 'processing' || saving}
          />
          {uploadBusy ? (
            <p className="mt-1 text-xs text-brand-dark/60">Laddar upp …</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
            disabled={
              getProduct.captureStatus === 'processing' || saving || !categoryId
            }
          >
            {saving ? 'Sparar…' : 'Spara'}
          </button>
          <Link
            to="/app"
            className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </main>
  )
}
