import {
  Link,
  Navigate,
  createFileRoute,
  useRouter,
} from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import type {
  EditFieldErrors,
  StoredProductAttribute,
} from '~/lib/editProductForm'
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

export const Route = createFileRoute('/app/varor/$productId/redigera')({
  component: RedigeraVaraPage,
})

const PRICE_STEPS = [
  1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500,
  2000, 3000, 5000, 7500, 10000,
]

const PRICE_TICK_LABELS = [100, 500, 1000, 5000, 10000]

function formatSek(n: number): string {
  return n.toLocaleString('sv-SE')
}

function nearestPriceStepIndex(priceSek: number | null): number {
  if (priceSek === null) {
    return PRICE_STEPS.findIndex((n) => n === 500)
  }
  let bestIndex = 0
  let bestDistance = Math.abs(PRICE_STEPS[0] - priceSek)
  for (let i = 1; i < PRICE_STEPS.length; i++) {
    const distance = Math.abs(PRICE_STEPS[i] - priceSek)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }
  return bestIndex
}

function panelClass(tone: 'default' | 'accent' = 'default'): string {
  const border =
    tone === 'accent'
      ? 'border-brand-dark/15 bg-brand-surface shadow-sm'
      : 'border-brand-dark/10 bg-brand-surface shadow-sm'
  return `rounded-xl border ${border} p-4 sm:p-5`
}

function fieldClass(): string {
  return 'mt-1 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark shadow-inner shadow-brand-dark/[0.02] transition focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5 aria-invalid:border-brand-accent'
}

function sectionKicker(): string {
  return 'font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent'
}

function RedigeraVaraPage() {
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
  const [taxonomyCreateOpen, setTaxonomyCreateOpen] = useState(false)
  const [taxonomyCreateBusy, setTaxonomyCreateBusy] = useState(false)
  const [taxonomyCreateError, setTaxonomyCreateError] = useState<string | null>(
    null,
  )
  const [attributes, setAttributes] = useState<Array<StoredProductAttribute>>(
    [],
  )
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

  const priceNumeric = parsePriceSekToNumber(priceSek)
  const sliderValue = nearestPriceStepIndex(priceNumeric)
  const snappedPriceValue = PRICE_STEPS[sliderValue]

  const filteredCategoryOptions = useMemo(() => {
    if (!categoryOptions) {
      return []
    }
    const q = categoryFilter.trim().toLowerCase()
    if (!q) {
      return categoryOptions
    }
    return categoryOptions.filter((o) => o.pathLabel.toLowerCase().includes(q))
  }, [categoryOptions, categoryFilter])

  /** Behåll alltid vald kategori bland sökträffarna så valet inte försvinner. */
  const categorySearchRows = useMemo(() => {
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
    return rows.slice(0, 8)
  }, [categoryOptions, filteredCategoryOptions, categoryId])

  const selectedPathLabel = useMemo(() => {
    if (!categoryOptions || !categoryId) {
      return ''
    }
    return categoryOptions.find((o) => o.id === categoryId)?.pathLabel ?? ''
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
    <div className="space-y-3">
      <div className="grid min-h-64 place-items-center rounded-xl border border-brand-dark/10 bg-brand-bg/80 p-3">
        <img
          src={getProduct.imageUrl}
          alt=""
          className="max-h-72 w-auto max-w-full rounded-lg object-contain lg:max-h-[min(54vh,30rem)]"
        />
      </div>
      <p className="text-xs leading-relaxed text-brand-dark/65">
        EXIF styr bara kamerans rotation — om bilden är tagen med lådan upp och
        ner behöver du vända här.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-brand-dark px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('180')}
        >
          Vänd 180°
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-2.5 py-2 text-xs font-semibold text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabledForm || rotateBusy}
          onClick={() => void onRotate('cw')}
        >
          90° medurs
        </button>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-2.5 py-2 text-xs font-semibold text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
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
        void router.navigate({ to: '/app/varor' })
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
      setError(e instanceof Error ? e.message : 'Rotation misslyckades.')
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
      setError(e instanceof Error ? e.message : 'Bilden kunde inte laddas upp.')
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
      setTaxonomyCreateOpen(false)
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
        <p className="text-sm text-brand-dark/75">Hämtar vara …</p>
      </main>
    )
  }

  if (getProduct === null) {
    return <Navigate to="/app/varor" replace />
  }

  const saveDisabled =
    getProduct.captureStatus === 'processing' ||
    saving ||
    enrichBusy ||
    !categoryId

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        to="/app/varor"
        className="mb-4 inline-flex text-sm font-semibold text-brand-dark/75 underline decoration-brand-dark/25 underline-offset-4 transition hover:text-brand-dark hover:decoration-brand-dark/60"
      >
        ← Tillbaka till varor
      </Link>

      {getProduct.captureStatus === 'processing' ? (
        <div className="mb-3 rounded-lg border border-brand-dark/10 bg-brand-surface/90 p-3 text-sm text-brand-dark/80">
          <p>
            Varan bearbetas fortfarande av AI. Du kan spara borttagning, men
            fält kan inte redigeras tills listningen är klar.
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          className="mb-4 rounded-xl border border-brand-accent/25 bg-brand-accent/10 px-4 py-3 text-sm font-medium text-brand-dark"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-5"
        aria-labelledby={titleId}
      >
        {newImageId ? (
          <p className="rounded-xl border border-status-success/20 bg-status-success/10 px-4 py-3 text-sm font-medium text-brand-dark">
            Ny vald bild ersätter visningsbilden när du sparar.
          </p>
        ) : null}

        <div className="sticky top-0 z-20 -mx-4 rounded-b-2xl border border-t-0 border-brand-dark/10 bg-brand-bg/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <header className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent sm:text-xs">
                Verktyg · {session.shopName}
              </p>
              <h1
                className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl"
                id={titleId}
              >
                Redigera vara
              </h1>
              <p className="mt-1 line-clamp-2 text-xs text-brand-dark/70 sm:text-sm">
                Ändringar syns bland varorna och i den publika butiken direkt
                när de sparats.
              </p>
            </header>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
                disabled={saveDisabled}
              >
                {saving ? 'Sparar…' : 'Spara'}
              </button>
              <Link
                to="/app/varor"
                className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-brand-dark/5"
              >
                Avbryt
              </Link>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-dark text-white shadow-sm">
          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <div className="sm:col-span-2">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Arbetskopian
              </p>
              <p className="mt-2 line-clamp-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                {title || 'Namnlös vara'}
              </p>
              <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/70">
                {description || 'Beskrivning saknas.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                  Pris
                </p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                  {priceNumeric === null
                    ? '—'
                    : `${formatSek(priceNumeric)} kr`}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                  Kategori
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">
                  {selectedPathLabel || 'Ej vald'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="space-y-5">
            <section className={`${panelClass('accent')} space-y-4`}>
              <div>
                <p className={sectionKicker()}>Grundinfo</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-brand-dark">
                  Texten kunderna ser
                </h2>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
                  htmlFor={titleFieldId}
                >
                  Titel
                </label>
                <input
                  id={titleFieldId}
                  className={fieldClass()}
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
                    className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
                    htmlFor={descFieldId}
                  >
                    Beskrivning
                  </label>
                  <textarea
                    id={descFieldId}
                    className={`${fieldClass()} min-h-32 leading-relaxed`}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      setFieldErrors((fe) => ({
                        ...fe,
                        description: undefined,
                      }))
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

              <div className="border-t border-brand-dark/10 pt-4 lg:hidden">
                {imageBlock}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Byt huvudbild
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    void onFile(f)
                  }}
                  disabled={disabledForm}
                />
                {uploadBusy ? (
                  <p className="mt-1 text-xs text-brand-dark/60">
                    Laddar upp …
                  </p>
                ) : null}
              </div>
            </section>

            <section className={`${panelClass()} space-y-4`}>
              <div>
                <p className={sectionKicker()}>Pris</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-brand-dark">
                  Snabb prissättning
                </h2>
              </div>
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
                htmlFor={priceFieldId}
              >
                Pris (SEK)
              </label>
              <div className="grid gap-3 rounded-xl border border-brand-dark/10 bg-brand-bg/70 p-4 sm:grid-cols-[12rem_1fr] sm:items-center">
                <input
                  id={priceFieldId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2.5 font-mono text-lg font-semibold tabular-nums text-brand-dark shadow-inner shadow-brand-dark/[0.02] aria-invalid:border-brand-accent"
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
                <div className="text-sm text-brand-dark/70">
                  <span className="font-semibold text-brand-dark">
                    Snappar till {formatSek(snappedPriceValue)} kr
                  </span>
                  <span className="block text-xs">
                    Skriv valfritt belopp i fältet om varan behöver ett annat
                    pris.
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <label className="sr-only" htmlFor={priceSliderId}>
                  Justera pris med reglage
                </label>
                <input
                  id={priceSliderId}
                  type="range"
                  min={0}
                  max={PRICE_STEPS.length - 1}
                  step={1}
                  value={sliderValue}
                  disabled={disabledForm}
                  className="h-3 w-full cursor-pointer appearance-none rounded-full bg-brand-dark/15 accent-brand-accent disabled:opacity-50"
                  onChange={(e) => {
                    const v = PRICE_STEPS[Number(e.target.value)]
                    setPriceSek(String(v))
                    setFieldErrors((fe) => ({ ...fe, priceSek: undefined }))
                  }}
                />
                <div className="mt-2 flex justify-between font-mono text-[10px] text-brand-dark/50">
                  {PRICE_TICK_LABELS.map((label) => (
                    <span key={label}>{formatSek(label)}</span>
                  ))}
                </div>
                <p
                  id={`${priceFieldId}-hint`}
                  className="mt-2 text-xs text-brand-dark/60"
                >
                  Reglaget använder fasta steg för vanliga second hand-priser.
                  Heltal sparas i SEK.
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
              className={`${panelClass('accent')} space-y-4`}
              aria-labelledby={catFieldId}
            >
              <div>
                <p className={sectionKicker()} id={catFieldId}>
                  Kategori
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold text-brand-dark">
                  Placera varan rätt
                </h2>
                <p className="mt-1 text-sm text-brand-dark/65">
                  Sök snabbt eller välj i trädet. Underkategori skapas under den
                  kategori som är vald.
                </p>
              </div>

              <div className="rounded-xl border border-brand-dark/10 bg-brand-dark p-4 text-white">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Vald kategori
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedPathLabel || 'Ingen kategori vald'}
                </p>
              </div>

              {categoryOptions !== undefined ? (
                <div className="space-y-3">
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
                    htmlFor={categorySearchId}
                  >
                    Sök kategori
                  </label>
                  <input
                    id={categorySearchId}
                    type="search"
                    autoComplete="off"
                    placeholder="Sök på t.ex. kappa, väska eller porslin"
                    className={fieldClass()}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    disabled={disabledForm}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categorySearchRows.length === 0 ? (
                      <p className="rounded-lg border border-brand-dark/10 bg-brand-bg/70 px-3 py-3 text-sm text-brand-dark/60 sm:col-span-2">
                        Inga kategorier matchar sökningen.
                      </p>
                    ) : (
                      categorySearchRows.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                            categoryId === o.id
                              ? 'border-brand-dark bg-brand-dark text-white shadow-sm'
                              : 'border-brand-dark/10 bg-white text-brand-dark hover:border-brand-dark/25 hover:bg-brand-dark/5'
                          }`}
                          disabled={disabledForm}
                          onClick={() => {
                            setCategoryId(o.id)
                            setFieldErrors((fe) => ({
                              ...fe,
                              categoryId: undefined,
                            }))
                          }}
                        >
                          {o.pathLabel}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-dark/60">
                  Laddar kategorier …
                </p>
              )}

              {taxonomyTree !== undefined ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                    Kategoriträd
                  </p>
                  <TaxonomyTreePicker
                    className="max-h-72 border-brand-dark/15 bg-brand-bg/60 text-brand-dark"
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

              <div className="rounded-xl border border-brand-dark/10 bg-brand-bg/70 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-dark"
                  onClick={() => setTaxonomyCreateOpen((open) => !open)}
                  disabled={disabledForm || !categoryId}
                  aria-expanded={taxonomyCreateOpen}
                >
                  <span>Skapa underkategori under vald kategori</span>
                  <span className="text-brand-dark/45" aria-hidden>
                    {taxonomyCreateOpen ? '▾' : '▸'}
                  </span>
                </button>
                {taxonomyCreateOpen ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 text-xs font-medium text-brand-dark/70">
                      Namn på ny underkategori
                      <input
                        type="text"
                        className={fieldClass()}
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
                      className="shrink-0 rounded-lg bg-brand-dark px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark/90 disabled:opacity-50"
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
                ) : null}
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

            <section className={panelClass('accent')}>
              <ProductAttributesEditor
                attributes={attributes}
                onChange={setAttributes}
                disabled={disabledForm}
                density="compact"
              />
            </section>

            <section className={`${panelClass()} space-y-3`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setAiSectionOpen((o) => !o)}
                aria-expanded={aiSectionOpen}
              >
                <span>
                  <span className={sectionKicker()}>
                    Berika med AI (fritext)
                  </span>
                  <span className="ml-2 text-xs font-medium text-brand-dark/55">
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
                    varudata. Visningsbilden ändras inte.
                  </p>
                  <textarea
                    id="edit-ai-notes"
                    className={`${fieldClass()} min-h-24`}
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

          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <section className={`${panelClass()} border-brand-dark/15`}>
                <p className={sectionKicker()}>Huvudbild</p>
                <div className="mt-3 space-y-4">
                  {imageBlock}
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
                      htmlFor="edit-img"
                    >
                      Byt huvudbild (valfritt)
                    </label>
                    <input
                      id="edit-img"
                      type="file"
                      accept="image/*"
                      className="mt-2 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        void onFile(f)
                      }}
                      disabled={disabledForm}
                    />
                    {uploadBusy ? (
                      <p className="mt-1 text-xs text-brand-dark/60">
                        Laddar upp …
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-brand-dark/10 bg-brand-bg/80 p-4 text-sm text-brand-dark/75">
                <p className="font-semibold text-brand-dark">Snabbstatus</p>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-brand-dark/45">
                      AI
                    </dt>
                    <dd className="mt-1 font-medium">
                      {getProduct.captureStatus === 'processing'
                        ? 'Bearbetar'
                        : 'Redo'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-brand-dark/45">
                      Pris
                    </dt>
                    <dd className="mt-1 font-mono font-medium tabular-nums">
                      {priceNumeric === null
                        ? '—'
                        : `${formatSek(priceNumeric)} kr`}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </aside>
        </div>
      </form>
    </main>
  )
}
