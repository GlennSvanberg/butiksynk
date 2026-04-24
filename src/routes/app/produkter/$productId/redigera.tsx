import { Link, Navigate, createFileRoute, useRouter } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import type { EditFieldErrors, StoredProductAttribute } from '~/lib/editProductForm'
import {
  filterAttributesForMutation,
  sanitizePriceInput,
  serverFormSnapshot,
  validateEditProductForm,
} from '~/lib/editProductForm'
import { ProductAttributesEditor } from '~/components/ProductAttributesEditor'
import {
  TaxonomyTreePicker,
  flattenTaxonomyIdsPreorder,
} from '~/components/TaxonomyTreePicker'
import { useConfirm } from '~/lib/confirm'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/produkter/$productId/redigera')({
  component: RedigeraProdukt,
})

function RedigeraProdukt() {
  const { productId: productIdParam } = Route.useParams()
  const { session } = useShopSession()
  const router = useRouter()
  const confirm = useConfirm()
  const titleId = useId()
  const titleFieldId = useId()
  const descFieldId = useId()
  const priceFieldId = useId()
  const catFieldId = useId()

  const productId = productIdParam as Id<'products'>

  const getProduct = useQuery(
    api.products.getProductForEdit,
    session ? { productId, shopId: session.shopId } : 'skip',
  )
  const taxonomyTree = useQuery(
    api.taxonomy.listTaxonomyTree,
    session ? { shopId: session.shopId } : 'skip',
  )
  const updateProduct = useMutation(api.products.updateProduct)
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const ensureTaxonomy = useMutation(api.taxonomy.ensureTaxonomyForShop)
  const rotateProductDisplayImage = useAction(
    api.productImageRotate.rotateProductDisplayImage,
  )
  const enrichProductFromNotes = useAction(
    api.productEnrichFromNotes.enrichProductFromNotes,
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceSek, setPriceSek] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [attributes, setAttributes] = useState<Array<StoredProductAttribute>>([])
  const [fieldErrors, setFieldErrors] = useState<EditFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newImageId, setNewImageId] = useState<Id<'_storage'> | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [rotateBusy, setRotateBusy] = useState(false)
  const [enrichNotes, setEnrichNotes] = useState('')
  const [enrichBusy, setEnrichBusy] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const lastSyncedSnapshot = useRef<string | null>(null)

  useEffect(() => {
    if (session) {
      void ensureTaxonomy({ shopId: session.shopId })
    }
  }, [session, ensureTaxonomy])

  useEffect(() => {
    lastSyncedSnapshot.current = null
  }, [productId])

  useEffect(() => {
    if (getProduct === null || getProduct === undefined) {
      return
    }
    if (taxonomyTree === undefined) {
      return
    }
    const snap = serverFormSnapshot(getProduct)
    if (lastSyncedSnapshot.current === snap) {
      return
    }
    setTitle(getProduct.title)
    setDescription(getProduct.description)
    setPriceSek(String(getProduct.priceSek))
    const firstId = flattenTaxonomyIdsPreorder(taxonomyTree)[0] ?? ''
    setCategoryId(getProduct.categoryId ? getProduct.categoryId : firstId)
    setAttributes([...getProduct.attributes])
    lastSyncedSnapshot.current = snap
  }, [getProduct, taxonomyTree, productId])

  const disabledForm =
    getProduct?.captureStatus === 'processing' || saving || enrichBusy

  const imageBlock = getProduct?.imageUrl ? (
    <div className="space-y-2">
      <img
        src={getProduct.imageUrl}
        alt=""
        className="max-h-72 w-auto max-w-full rounded-lg border border-brand-dark/10 object-contain lg:max-h-[min(70vh,28rem)]"
      />
      <p className="text-xs text-brand-dark/60">
        EXIF styr bara kamerans rotation — om bilden är tagen med lådan upp och
        ner behöver du vända här.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-brand-dark px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('180')}
        >
          Vänd 180° (upp/ned)
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-3 py-1.5 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('cw')}
        >
          Rotera 90° medurs
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-3 py-1.5 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('ccw')}
        >
          Rotera 90° moturs
        </button>
      </div>
      {rotateBusy ? (
        <p className="text-xs text-brand-dark/60">Sparar roterad bild …</p>
      ) : null}
    </div>
  ) : (
    <p className="text-sm text-brand-dark/60">Ingen huvudbild.</p>
  )

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!session || !getProduct) {
        return
      }
      if (getProduct.captureStatus === 'processing') {
        setError('Vänta tills AI är klar.')
        return
      }
      const v = validateEditProductForm({
        title,
        description,
        priceSek,
        categoryId,
      })
      if (!v.ok) {
        setFieldErrors(v.errors)
        setError(null)
        return
      }
      setFieldErrors({})
      setError(null)
      setSaving(true)
      try {
        const attrs = filterAttributesForMutation(attributes)
        await updateProduct({
          productId,
          shopId: session.shopId,
          title: v.title,
          description: v.description,
          priceSek: v.priceSek,
          categoryId: v.categoryId as Id<'taxonomyNodes'>,
          attributes: attrs,
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
      attributes,
      updateProduct,
      router,
    ],
  )

  const onRotate = async (direction: 'cw' | 'ccw' | '180') => {
    if (!session || !getProduct || getProduct.captureStatus === 'processing') {
      return
    }
    setError(null)
    setRotateBusy(true)
    try {
      await rotateProductDisplayImage({
        productId,
        shopId: session.shopId,
        direction,
      })
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Rotation misslyckades.',
      )
    } finally {
      setRotateBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!session || !file || !file.type.startsWith('image/')) {
      return
    }
    setError(null)
    setUploadBusy(true)
    try {
      const postUrl = await generateUploadUrl({ shopId: session.shopId })
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

  const onEnrichWithAi = async () => {
    if (!session || !getProduct) {
      return
    }
    if (getProduct.captureStatus === 'processing') {
      setEnrichError('Vänta tills AI är klar.')
      return
    }
    const notes = enrichNotes.trim()
    if (!notes) {
      setEnrichError('Skriv något i rutan för att berika.')
      return
    }
    const ok = await confirm({
      title: 'Berika med AI?',
      description:
        'AI uppdaterar titel, beskrivning, pris, kategori och attribut utifrån din text. Visningsbilden ändras inte. Vill du fortsätta?',
      confirmLabel: 'Berika',
      cancelLabel: 'Avbryt',
      variant: 'default',
    })
    if (!ok) {
      return
    }
    setEnrichError(null)
    setError(null)
    setEnrichBusy(true)
    try {
      const r = await enrichProductFromNotes({
        productId,
        shopId: session.shopId,
        notes,
      })
      setTitle(r.title)
      setDescription(r.description)
      setPriceSek(String(r.priceSek))
      setCategoryId(r.categoryId)
      setAttributes([...r.attributes])
      setEnrichNotes('')
      lastSyncedSnapshot.current = null
    } catch (e) {
      setEnrichError(
        e instanceof Error ? e.message : 'AI-berikning misslyckades.',
      )
    } finally {
      setEnrichBusy(false)
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 xl:max-w-7xl">
      <Link
        to="/app"
        className="mb-4 inline-block text-sm font-medium text-brand-dark/80 underline decoration-brand-dark/25 underline-offset-4 hover:decoration-brand-dark/50"
      >
        ← Tillbaka till översikten
      </Link>
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
          Ändringar syns i översikten och i den publika butiken direkt när de
          sparats.
        </p>
      </header>

      {getProduct.captureStatus === 'processing' ? (
        <div className="mb-4 rounded-lg border border-brand-dark/10 bg-brand-surface p-4 text-sm text-brand-dark/80">
          <p>
            Produkten bearbetas fortfarande av AI. Du kan spara borttagning, men
            fält kan inte redigeras tills listningen är klar.
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
        className="space-y-6 rounded-lg border border-brand-dark/8 bg-brand-surface p-5 shadow-sm lg:space-y-0"
        aria-labelledby={titleId}
      >
        {newImageId ? (
          <p className="text-sm text-brand-dark/80 lg:col-span-2">
            Ny vald bild ersätter visningsbilden när du sparar.
          </p>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-brand-dark"
                htmlFor={titleFieldId}
              >
                Titel
              </label>
              <input
                id={titleFieldId}
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark aria-invalid:border-brand-accent"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setFieldErrors((fe) => ({ ...fe, title: undefined }))
                }}
                required
                disabled={disabledForm}
                maxLength={500}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={
                  fieldErrors.title ? `${titleFieldId}-err` : undefined
                }
              />
              {fieldErrors.title ? (
                <p
                  id={`${titleFieldId}-err`}
                  className="mt-1 text-xs text-brand-accent"
                  role="alert"
                >
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-brand-dark"
                htmlFor={descFieldId}
              >
                Beskrivning
              </label>
              <textarea
                id={descFieldId}
                className="mt-1 w-full min-h-28 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark aria-invalid:border-brand-accent"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setFieldErrors((fe) => ({ ...fe, description: undefined }))
                }}
                required
                disabled={disabledForm}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={
                  fieldErrors.description ? `${descFieldId}-err` : undefined
                }
              />
              {fieldErrors.description ? (
                <p
                  id={`${descFieldId}-err`}
                  className="mt-1 text-xs text-brand-accent"
                  role="alert"
                >
                  {fieldErrors.description}
                </p>
              ) : null}
            </div>

            <div className="lg:hidden">{imageBlock}</div>

            <div>
              <label
                className="block text-sm font-medium text-brand-dark"
                htmlFor={priceFieldId}
              >
                Pris (SEK)
              </label>
              <input
                id={priceFieldId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark tabular-nums aria-invalid:border-brand-accent"
                value={priceSek}
                onChange={(e) => {
                  setPriceSek(sanitizePriceInput(e.target.value))
                  setFieldErrors((fe) => ({ ...fe, priceSek: undefined }))
                }}
                required
                disabled={disabledForm}
                aria-invalid={Boolean(fieldErrors.priceSek)}
                aria-describedby={
                  fieldErrors.priceSek ? `${priceFieldId}-err` : undefined
                }
              />
              {fieldErrors.priceSek ? (
                <p
                  id={`${priceFieldId}-err`}
                  className="mt-1 text-xs text-brand-accent"
                  role="alert"
                >
                  {fieldErrors.priceSek}
                </p>
              ) : (
                <p className="mt-1 text-xs text-brand-dark/55">
                  Endast siffror (heltal SEK). Komma eller punkt som decimal går
                  bra; värdet avrundas vid sparning.
                </p>
              )}
            </div>

            <div aria-labelledby={catFieldId}>
              <p
                className="block text-sm font-medium text-brand-dark"
                id={catFieldId}
              >
                Kategori
              </p>
              <p className="mt-0.5 text-xs text-brand-dark/60">
                Välj nod i trädet (rot eller undernivåer).
              </p>
              {taxonomyTree !== undefined ? (
                <TaxonomyTreePicker
                  className="mt-2 border-brand-dark/15 bg-white text-brand-dark"
                  nodes={taxonomyTree}
                  value={categoryId}
                  onChange={(id) => {
                    setCategoryId(id)
                    setFieldErrors((fe) => ({ ...fe, categoryId: undefined }))
                  }}
                  disabled={disabledForm}
                />
              ) : (
                <p className="mt-2 text-sm text-brand-dark/60">
                  Laddar kategorier …
                </p>
              )}
              {fieldErrors.categoryId ? (
                <p className="mt-1 text-xs text-brand-accent" role="alert">
                  {fieldErrors.categoryId}
                </p>
              ) : null}
            </div>

            <div className="border-t border-brand-dark/8 pt-4">
              <ProductAttributesEditor
                attributes={attributes}
                onChange={setAttributes}
                disabled={disabledForm}
              />
            </div>

            <div className="border-t border-brand-dark/8 pt-4">
              <label
                className="block text-sm font-medium text-brand-dark"
                htmlFor="edit-ai-notes"
              >
                Berika med AI (fritext)
              </label>
              <p className="mt-0.5 text-xs text-brand-dark/60">
                Beskriv ändringar, ton, fakta eller skick — AI uppdaterar
                produktdata. Visningsbilden ändras inte.
              </p>
              <textarea
                id="edit-ai-notes"
                className="mt-2 w-full min-h-24 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark"
                value={enrichNotes}
                onChange={(e) => setEnrichNotes(e.target.value)}
                disabled={disabledForm}
                placeholder="T.ex. lägg till mått i beskrivningen, sänk priset lite, betona vintage-skick …"
              />
              {enrichError ? (
                <p className="mt-2 text-sm text-brand-accent" role="alert">
                  {enrichError}
                </p>
              ) : null}
              <button
                type="button"
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-brand-dark/25 bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-brand-dark/5 disabled:opacity-60"
                disabled={
                  getProduct.captureStatus === 'processing' ||
                  enrichBusy ||
                  saving
                }
                onClick={() => void onEnrichWithAi()}
              >
                {enrichBusy ? 'Berikar…' : 'Kör AI-berikning'}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-brand-dark/8 pt-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
                disabled={
                  getProduct.captureStatus === 'processing' ||
                  saving ||
                  enrichBusy ||
                  !categoryId
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
          </div>

          <aside className="hidden w-full shrink-0 space-y-4 border-t border-brand-dark/8 pt-4 lg:block lg:w-[min(100%,320px)] lg:border-t-0 lg:border-l lg:border-brand-dark/8 lg:pt-0 lg:pl-8 xl:w-[min(100%,360px)]">
            <div className="lg:sticky lg:top-8 lg:space-y-4">
              <p className="text-sm font-medium text-brand-dark">Huvudbild</p>
              {imageBlock}
              <div>
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
                  disabled={disabledForm}
                />
                {uploadBusy ? (
                  <p className="mt-1 text-xs text-brand-dark/60">Laddar upp …</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

        <div className="border-t border-brand-dark/8 pt-4 lg:hidden">
          <p className="text-sm font-medium text-brand-dark">Byt huvudbild</p>
          <input
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0]
              void onFile(f)
            }}
            disabled={disabledForm}
          />
          {uploadBusy ? (
            <p className="mt-1 text-xs text-brand-dark/60">Laddar upp …</p>
          ) : null}
        </div>
      </form>
    </main>
  )
}
