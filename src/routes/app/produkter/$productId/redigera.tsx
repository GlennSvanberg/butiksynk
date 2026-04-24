import { Link, Navigate, createFileRoute, useRouter } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import type { EditFieldErrors, StoredProductAttribute } from '~/lib/editProductForm'
import {
  filterAttributesForMutation,
  parsePriceSekToNumber,
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

function priceSliderBounds(priceSek: string): { min: number; max: number } {
  const parsed = parsePriceSekToNumber(priceSek)
  const max = Math.min(
    50_000,
    Math.max(500, !parsed || parsed <= 0 ? 5000 : parsed * 2),
  )
  return { min: 1, max }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function panelClass(): string {
  return 'rounded-lg border border-brand-dark/10 bg-brand-surface p-3 shadow-sm sm:p-4'
}

function sectionShell(): string {
  return 'border-l-2 border-brand-dark/20 pl-3 sm:pl-4'
}

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
  const categorySearchId = useId()
  const priceSliderId = useId()

  const productId = productIdParam as Id<'products'>

  const getProduct = useQuery(
    api.products.getProductForEdit,
    session ? { productId, shopId: session.shopId } : 'skip',
  )
  const taxonomyTree = useQuery(
    api.taxonomy.listTaxonomyTree,
    session ? { shopId: session.shopId } : 'skip',
  )
  const categoryOptions = useQuery(
    api.taxonomy.listCategoryOptions,
    session ? { shopId: session.shopId } : 'skip',
  )
  const updateProduct = useMutation(api.products.updateProduct)
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const ensureTaxonomy = useMutation(api.taxonomy.ensureTaxonomyForShop)
  const createTaxonomyChildMutation = useMutation(
    api.taxonomy.createTaxonomyChild,
  )
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
  const [categoryFilter, setCategoryFilter] = useState('')
  const [newChildName, setNewChildName] = useState('')
  const [taxonomyCreateBusy, setTaxonomyCreateBusy] = useState(false)
  const [taxonomyCreateError, setTaxonomyCreateError] = useState<string | null>(
    null,
  )
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
  const [aiSectionOpen, setAiSectionOpen] = useState(false)
  const lastSyncedSnapshot = useRef<string | null>(null)

  const { min: priceSliderMin, max: priceSliderMax } =
    priceSliderBounds(priceSek)
  const priceNumeric = parsePriceSekToNumber(priceSek)
  const sliderValue =
    priceNumeric === null
      ? priceSliderMin
      : clamp(priceNumeric, priceSliderMin, priceSliderMax)

  const filteredCategoryOptions = useMemo(() => {
    if (!categoryOptions) {
      return []
    }
    const q = categoryFilter.trim().toLowerCase()
    if (!q) {
      return categoryOptions
    }
    return categoryOptions.filter((o) =>
      o.pathLabel.toLowerCase().includes(q),
    )
  }, [categoryOptions, categoryFilter])

  /** Behåll alltid vald kategori i listan så select inte tappar värde vid filter. */
  const categorySelectRows = useMemo(() => {
    if (!categoryOptions) {
      return []
    }
    const byId = new Map(categoryOptions.map((o) => [o.id, o] as const))
    const rows = [...filteredCategoryOptions]
    if (categoryId && !rows.some((o) => o.id === categoryId)) {
      const cur = byId.get(categoryId as Id<'taxonomyNodes'>)
      if (cur) {
        rows.unshift(cur)
      }
    }
    return rows
  }, [categoryOptions, filteredCategoryOptions, categoryId])

  const selectedPathLabel = useMemo(() => {
    if (!categoryOptions || !categoryId) {
      return ''
    }
    return (
      categoryOptions.find((o) => o.id === categoryId)?.pathLabel ?? ''
    )
  }, [categoryOptions, categoryId])

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
        className="max-h-56 w-auto max-w-full rounded-lg border border-brand-dark/10 object-contain lg:max-h-[min(55vh,22rem)]"
      />
      <p className="text-xs text-brand-dark/60">
        EXIF styr bara kamerans rotation — om bilden är tagen med lådan upp och
        ner behöver du vända här.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-brand-dark px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('180')}
        >
          Vänd 180°
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('cw')}
        >
          90° medurs
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('ccw')}
        >
          90° moturs
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

  const onCreateTaxonomyChild = async () => {
    if (!session || !categoryId) {
      return
    }
    const name = newChildName.trim()
    if (!name) {
      setTaxonomyCreateError('Ange namn på den nya kategorin.')
      return
    }
    setTaxonomyCreateError(null)
    setTaxonomyCreateBusy(true)
    try {
      const { id } = await createTaxonomyChildMutation({
        shopId: session.shopId,
        parentId: categoryId as Id<'taxonomyNodes'>,
        name,
      })
      setCategoryId(id)
      setNewChildName('')
    } catch (e) {
      setTaxonomyCreateError(
        e instanceof Error ? e.message : 'Kunde inte skapa kategori.',
      )
    } finally {
      setTaxonomyCreateBusy(false)
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

  const saveDisabled =
    getProduct.captureStatus === 'processing' ||
    saving ||
    enrichBusy ||
    !categoryId

  const selectSize = Math.min(
    10,
    Math.max(4, categorySelectRows.length || 4),
  )

  return (
    <main className="w-full max-w-[min(100%,90rem)] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <Link
        to="/app"
        className="mb-3 inline-block text-sm font-medium text-brand-dark/80 underline decoration-brand-dark/25 underline-offset-4 hover:decoration-brand-dark/50"
      >
        ← Tillbaka till översikten
      </Link>

      {getProduct.captureStatus === 'processing' ? (
        <div className="mb-3 rounded-lg border border-brand-dark/10 bg-brand-surface/90 p-3 text-sm text-brand-dark/80">
          <p>
            Produkten bearbetas fortfarande av AI. Du kan spara borttagning, men
            fält kan inte redigeras tills listningen är klar.
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          className="mb-3 rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3"
        aria-labelledby={titleId}
      >
        {newImageId ? (
          <p className="text-sm text-brand-dark/80">
            Ny vald bild ersätter visningsbilden när du sparar.
          </p>
        ) : null}

        <div className="sticky top-0 z-20 -mx-4 mb-1 flex flex-col gap-3 border-b border-brand-dark/10 bg-brand-bg/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-8 lg:px-8">
          <header className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-brand-dark/50 sm:text-xs">
              Admin · {session.shopName}
            </p>
            <h1
              className="font-heading text-xl font-bold text-brand-dark sm:text-2xl"
              id={titleId}
            >
              Redigera produkt
            </h1>
            <p className="mt-0.5 line-clamp-2 text-xs text-brand-dark/70 sm:text-sm">
              Ändringar syns i översikten och i den publika butiken direkt när de
              sparats.
            </p>
          </header>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
              disabled={saveDisabled}
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm"
            >
              Avbryt
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
          <section
            className={`lg:col-span-8 ${sectionShell()} space-y-3 ${panelClass()}`}
          >
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-wide text-brand-dark/70"
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

            <div className="xl:grid xl:grid-cols-2 xl:gap-4">
              <div className="min-w-0 xl:col-span-2">
                <label
                  className="block text-xs font-medium uppercase tracking-wide text-brand-dark/70"
                  htmlFor={descFieldId}
                >
                  Beskrivning
                </label>
                <textarea
                  id={descFieldId}
                  className="mt-1 w-full min-h-24 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm leading-relaxed text-brand-dark aria-invalid:border-brand-accent xl:min-h-28"
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
            </div>

            <div className="border-t border-brand-dark/8 pt-3 lg:hidden">
              {imageBlock}
              <p className="mt-2 text-xs font-medium text-brand-dark">
                Byt huvudbild
              </p>
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
          </section>

          <section
            className={`hidden lg:col-span-4 lg:block ${panelClass()} border-brand-dark/12`}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-dark/70">
              Huvudbild
            </p>
            <div className="lg:sticky lg:top-24 lg:space-y-3">
              {imageBlock}
              <div>
                <label
                  className="block text-xs font-medium text-brand-dark"
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
          </section>

          <section
            className={`lg:col-span-4 ${sectionShell()} space-y-2 ${panelClass()}`}
          >
            <label
              className="block text-xs font-medium uppercase tracking-wide text-brand-dark/70"
              htmlFor={priceFieldId}
            >
              Pris (SEK)
            </label>
            <div className="flex flex-wrap items-baseline gap-2">
              <input
                id={priceFieldId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="min-w-[6rem] flex-1 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 font-mono text-sm tabular-nums text-brand-dark aria-invalid:border-brand-accent"
                value={priceSek}
                onChange={(e) => {
                  setPriceSek(sanitizePriceInput(e.target.value))
                  setFieldErrors((fe) => ({ ...fe, priceSek: undefined }))
                }}
                required
                disabled={disabledForm}
                aria-invalid={Boolean(fieldErrors.priceSek)}
                aria-describedby={
                  fieldErrors.priceSek
                    ? `${priceFieldId}-hint ${priceFieldId}-err ${priceSliderId}`
                    : `${priceFieldId}-hint ${priceSliderId}`
                }
              />
              <span className="font-mono text-xs tabular-nums text-brand-dark/50">
                reglage max {priceSliderMax.toLocaleString('sv-SE')}
              </span>
            </div>
            <div className="pt-1">
              <label className="sr-only" htmlFor={priceSliderId}>
                Justera pris med reglage
              </label>
              <input
                id={priceSliderId}
                type="range"
                min={priceSliderMin}
                max={priceSliderMax}
                step={1}
                value={sliderValue}
                disabled={disabledForm}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-dark/15 accent-brand-dark disabled:opacity-50"
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setPriceSek(String(Math.round(v)))
                  setFieldErrors((fe) => ({ ...fe, priceSek: undefined }))
                }}
              />
              <p
                id={`${priceFieldId}-hint`}
                className="mt-1 text-[11px] text-brand-dark/55"
              >
                Reglage {priceSliderMin.toLocaleString('sv-SE')}–
                {priceSliderMax.toLocaleString('sv-SE')} SEK. Högre belopp anges
                i fältet. Heltal; decimaler avrundas vid sparning.
              </p>
            </div>
            {fieldErrors.priceSek ? (
              <p
                id={`${priceFieldId}-err`}
                className="text-xs text-brand-accent"
                role="alert"
              >
                {fieldErrors.priceSek}
              </p>
            ) : null}
          </section>

          <section
            className={`lg:col-span-8 ${sectionShell()} space-y-3 ${panelClass()}`}
            aria-labelledby={catFieldId}
          >
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wide text-brand-dark/70"
                id={catFieldId}
              >
                Kategori
              </p>
              <p className="mt-0.5 text-[11px] text-brand-dark/60">
                Välj i trädet, sök i listan eller skapa underkategori under den
                valda noden.
              </p>
            </div>

            {categoryOptions !== undefined ? (
              <div className="space-y-2">
                <label
                  className="block text-xs font-medium text-brand-dark/80"
                  htmlFor={categorySearchId}
                >
                  Snabbtilldelning (sök sökväg)
                </label>
                <input
                  id={categorySearchId}
                  type="search"
                  autoComplete="off"
                  placeholder="Filtrera …"
                  className="w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  disabled={disabledForm}
                />
                <select
                  className="w-full rounded-lg border border-brand-dark/15 bg-white px-2 py-1 font-mono text-xs text-brand-dark"
                  size={selectSize}
                  value={categoryId}
                  aria-label="Välj kategori från lista"
                  disabled={disabledForm || categorySelectRows.length === 0}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                    setFieldErrors((fe) => ({ ...fe, categoryId: undefined }))
                  }}
                >
                  {categorySelectRows.length === 0 ? (
                    <option value="">Inga kategorier</option>
                  ) : (
                    categorySelectRows.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.pathLabel}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : (
              <p className="text-sm text-brand-dark/60">Laddar kategorier …</p>
            )}

            {taxonomyTree !== undefined ? (
              <div>
                <p className="mb-1 text-xs font-medium text-brand-dark/80">
                  Träd
                </p>
                <TaxonomyTreePicker
                  className="max-h-48 border-brand-dark/15 bg-white text-brand-dark"
                  nodes={taxonomyTree}
                  value={categoryId}
                  onChange={(id) => {
                    setCategoryId(id)
                    setFieldErrors((fe) => ({ ...fe, categoryId: undefined }))
                  }}
                  disabled={disabledForm}
                />
              </div>
            ) : null}

            <div className="rounded-md border border-brand-dark/10 bg-brand-bg/60 p-2">
              <p className="text-xs text-brand-dark/80">
                <span className="font-medium text-brand-dark">Vald nod:</span>{' '}
                {selectedPathLabel || '—'}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-xs text-brand-dark/70">
                  Ny underkategori (under vald nod)
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded-lg border border-brand-dark/15 bg-white px-2 py-1.5 text-sm"
                    value={newChildName}
                    onChange={(e) => {
                      setNewChildName(e.target.value)
                      setTaxonomyCreateError(null)
                    }}
                    disabled={disabledForm || !categoryId}
                    placeholder="T.ex. Koppel"
                  />
                </label>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-brand-dark/25 bg-white px-3 py-2 text-xs font-semibold text-brand-dark shadow-sm hover:bg-brand-dark/5 disabled:opacity-50"
                  disabled={
                    disabledForm ||
                    !categoryId ||
                    taxonomyCreateBusy ||
                    !newChildName.trim()
                  }
                  onClick={() => void onCreateTaxonomyChild()}
                >
                  {taxonomyCreateBusy ? 'Skapar…' : 'Skapa & välj'}
                </button>
              </div>
              {taxonomyCreateError ? (
                <p className="mt-1 text-xs text-brand-accent" role="alert">
                  {taxonomyCreateError}
                </p>
              ) : null}
            </div>

            {fieldErrors.categoryId ? (
              <p className="text-xs text-brand-accent" role="alert">
                {fieldErrors.categoryId}
              </p>
            ) : null}
          </section>

          <section className={`lg:col-span-12 ${sectionShell()} ${panelClass()}`}>
            <ProductAttributesEditor
              attributes={attributes}
              onChange={setAttributes}
              disabled={disabledForm}
              density="compact"
            />
          </section>

          <section className={`lg:col-span-12 ${sectionShell()} ${panelClass()}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setAiSectionOpen((o) => !o)}
              aria-expanded={aiSectionOpen}
            >
              <span>
                <span className="text-sm font-semibold text-brand-dark">
                  Berika med AI (fritext)
                </span>
                <span className="ml-2 text-xs text-brand-dark/55">
                  {aiSectionOpen ? 'Dölj' : 'Visa'}
                </span>
              </span>
              <span className="text-brand-dark/40" aria-hidden>
                {aiSectionOpen ? '▾' : '▸'}
              </span>
            </button>
            {aiSectionOpen ? (
              <div className="mt-3 space-y-2 border-t border-brand-dark/8 pt-3">
                <p className="text-xs text-brand-dark/60">
                  Beskriv ändringar, ton, fakta eller skick — AI uppdaterar
                  produktdata. Visningsbilden ändras inte.
                </p>
                <textarea
                  id="edit-ai-notes"
                  className="min-h-20 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark"
                  value={enrichNotes}
                  onChange={(e) => setEnrichNotes(e.target.value)}
                  disabled={disabledForm}
                  placeholder="T.ex. lägg till mått i beskrivningen, sänk priset lite, betona vintage-skick …"
                />
                {enrichError ? (
                  <p className="text-sm text-brand-accent" role="alert">
                    {enrichError}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-brand-dark/25 bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-brand-dark/5 disabled:opacity-60"
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
            ) : null}
          </section>
        </div>
      </form>
    </main>
  )
}
