import {
  Link,
  Navigate,
  createFileRoute,
  useRouter,
} from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
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
import { Send } from 'lucide-react'
import { useConfirm } from '~/lib/confirm'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/varor/$productId/redigera')({
  component: RedigeraVaraPage,
})

const PRICE_STEPS = [
  1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500,
  2000, 3000, 5000, 7500, 10000,
]

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

function fieldClass(opts?: { omitTopMargin?: boolean }): string {
  const mt = opts?.omitTopMargin ? '' : 'mt-1 '
  return `${mt}w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark shadow-inner shadow-brand-dark/[0.02] transition focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5 aria-invalid:border-brand-accent`
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
  const categorySectionHeadingId = useId()
  const priceSliderId = useId()
  const priceSectionHeadingId = useId()
  const aiDockInputId = useId()

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
  const createTaxonomyChildMutation = useMutation(
    api.taxonomy.createTaxonomyChild,
  )
  const deleteTaxonomyNodeMutation = useMutation(api.taxonomy.deleteTaxonomyNode)
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
  const [addUnderParentId, setAddUnderParentId] = useState<string | null>(null)
  const [addChildName, setAddChildName] = useState('')
  const [taxonomyCreateBusy, setTaxonomyCreateBusy] = useState(false)
  const [taxonomyCreateError, setTaxonomyCreateError] = useState<string | null>(
    null,
  )
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
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
  const lastSyncedSnapshot = useRef<string | null>(null)

  const priceNumeric = parsePriceSekToNumber(priceSek)
  const sliderValue = nearestPriceStepIndex(priceNumeric)

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

  const onSubmitInlineCategoryChild = async () => {
    if (!session || !addUnderParentId) {
      return
    }
    const name = addChildName.trim()
    if (!name) {
      setTaxonomyCreateError('Ange namn på den nya kategorin.')
      return
    }
    setTaxonomyCreateError(null)
    setTaxonomyCreateBusy(true)
    try {
      const { id } = await createTaxonomyChildMutation({
        shopId: session.shopId,
        parentId: addUnderParentId as Id<'taxonomyNodes'>,
        name,
      })
      setCategoryId(id)
      setAddChildName('')
      setAddUnderParentId(null)
    } catch (e) {
      setTaxonomyCreateError(
        e instanceof Error ? e.message : 'Kunde inte skapa kategori.',
      )
    } finally {
      setTaxonomyCreateBusy(false)
    }
  }

  const onDeleteTaxonomyNode = async (nodeId: string) => {
    if (!session) {
      return
    }
    const ok = await confirm({
      title: 'Ta bort kategori?',
      description:
        'Noden måste vara tom (inga underkategorier). Varor i kategorin flyttas till nivån ovanför.',
      confirmLabel: 'Ta bort',
      cancelLabel: 'Avbryt',
      variant: 'danger',
    })
    if (!ok) {
      return
    }
    setTaxonomyCreateError(null)
    setDeletingCategoryId(nodeId)
    try {
      await deleteTaxonomyNodeMutation({
        shopId: session.shopId,
        nodeId: nodeId as Id<'taxonomyNodes'>,
      })
    } catch (e) {
      setTaxonomyCreateError(
        e instanceof Error ? e.message : 'Kunde inte ta bort kategorin.',
      )
    } finally {
      setDeletingCategoryId(null)
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
    <main className="mx-auto w-full max-w-7xl px-4 pb-40 pt-6 sm:px-6 sm:pb-44 lg:px-8 lg:py-8 lg:pb-44">
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="space-y-5">
            <section className={`${panelClass('accent')} space-y-4`}>
              <h2 className="font-heading text-xl font-bold text-brand-dark">
                Grundinfo
              </h2>
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

            <section
              className={`${panelClass()} space-y-3`}
              aria-labelledby={priceSectionHeadingId}
            >
              <h2
                id={priceSectionHeadingId}
                className="font-heading text-xl font-bold text-brand-dark"
              >
                Pris
              </h2>
              <div
                className={`flex min-w-0 items-stretch rounded-lg border shadow-inner shadow-brand-dark/[0.02] transition focus-within:border-brand-dark/40 focus-within:ring-2 focus-within:ring-brand-dark/10 ${
                  fieldErrors.priceSek
                    ? 'border-brand-accent'
                    : 'border-brand-dark/15'
                } ${disabledForm ? 'bg-brand-dark/5' : 'bg-white'}`}
              >
                <input
                  id={priceFieldId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-lg font-semibold tabular-nums text-brand-dark outline-none ring-0 focus:ring-0 disabled:cursor-not-allowed"
                  value={priceSek}
                  onChange={(e) => {
                    setPriceSek(sanitizePriceInput(e.target.value))
                    setFieldErrors((fe) => ({ ...fe, priceSek: undefined }))
                  }}
                  required
                  disabled={disabledForm}
                  aria-invalid={Boolean(fieldErrors.priceSek)}
                  aria-labelledby={priceSectionHeadingId}
                  aria-describedby={
                    fieldErrors.priceSek ? `${priceFieldId}-err` : undefined
                  }
                />
                <span
                  className="flex select-none items-center pr-3 font-mono text-sm font-medium tabular-nums text-brand-dark/50"
                  aria-hidden="true"
                >
                  kr
                </span>
              </div>
              <div>
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
                <div className="mt-1.5 flex justify-between gap-3 text-xs text-brand-dark/55">
                  <span>lite</span>
                  <span>mycket</span>
                </div>
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
              className={`${panelClass('accent')} space-y-3`}
              aria-labelledby={categorySectionHeadingId}
            >
              <h2
                id={categorySectionHeadingId}
                className="font-heading text-xl font-bold text-brand-dark"
              >
                Kategori
              </h2>
              {taxonomyTree !== undefined ? (
                <>
                  <TaxonomyTreePicker
                    className="max-h-[min(28rem,55vh)] border-brand-dark/15 bg-brand-bg/60 text-brand-dark"
                    nodes={taxonomyTree}
                    value={categoryId}
                    onChange={(id) => {
                      setCategoryId(id)
                      setFieldErrors((fe) => ({ ...fe, categoryId: undefined }))
                    }}
                    disabled={disabledForm}
                    editable
                    onAddChild={(parentId) => {
                      setAddUnderParentId(parentId)
                      setAddChildName('')
                      setTaxonomyCreateError(null)
                    }}
                    onDeleteNode={(nodeId) => {
                      void onDeleteTaxonomyNode(nodeId)
                    }}
                    deletingNodeId={deletingCategoryId}
                  />
                  {addUnderParentId ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-dark/10 bg-brand-bg/50 p-2">
                      <input
                        type="text"
                        aria-label="Namn på ny underkategori"
                        className={`${fieldClass({ omitTopMargin: true })} min-w-[10rem] flex-1`}
                        value={addChildName}
                        onChange={(e) => {
                          setAddChildName(e.target.value)
                          setTaxonomyCreateError(null)
                        }}
                        disabled={disabledForm}
                        placeholder="Namn på underkategori"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded-lg bg-brand-dark px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark/90 disabled:opacity-50"
                        disabled={
                          disabledForm ||
                          taxonomyCreateBusy ||
                          !addChildName.trim()
                        }
                        onClick={() => void onSubmitInlineCategoryChild()}
                      >
                        {taxonomyCreateBusy ? 'Skapar…' : 'Skapa'}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded-lg border border-brand-dark/20 px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-brand-dark/5 disabled:opacity-50"
                        disabled={disabledForm || taxonomyCreateBusy}
                        onClick={() => {
                          setAddUnderParentId(null)
                          setAddChildName('')
                          setTaxonomyCreateError(null)
                        }}
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-brand-dark/60">Laddar kategorier …</p>
              )}
              {taxonomyCreateError ? (
                <p className="text-xs text-brand-accent" role="alert">
                  {taxonomyCreateError}
                </p>
              ) : null}
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

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-dark/10 bg-brand-surface/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_28px_rgba(0,0,0,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-brand-surface/88"
        role="region"
        aria-label="Be AI om ändringar"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
          {enrichError ? (
            <p
              className="rounded-lg border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-xs text-brand-dark"
              role="alert"
            >
              {enrichError}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <label htmlFor={aiDockInputId} className="sr-only">
              Beskriv vad du vill att AI ska ändra i varan
            </label>
            <textarea
              id={aiDockInputId}
              rows={2}
              className="min-h-[2.75rem] max-h-36 min-w-0 flex-1 resize-y rounded-2xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm text-brand-dark shadow-inner shadow-brand-dark/[0.02] transition placeholder:text-brand-dark/40 focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5"
              value={enrichNotes}
              onChange={(e) => {
                setEnrichNotes(e.target.value)
                setEnrichError(null)
              }}
              disabled={disabledForm}
              placeholder="Be om valfri ändring — pris, text, kategori, attribut …"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) {
                  return
                }
                if (
                  disabledForm ||
                  getProduct.captureStatus === 'processing' ||
                  enrichBusy ||
                  saving
                ) {
                  return
                }
                e.preventDefault()
                void onEnrichWithAi()
              }}
            />
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-50"
              disabled={
                getProduct.captureStatus === 'processing' ||
                enrichBusy ||
                saving ||
                disabledForm
              }
              onClick={() => void onEnrichWithAi()}
              aria-label={enrichBusy ? 'Berikar' : 'Skicka till AI'}
            >
              {enrichBusy ? (
                <span className="tabular-nums">…</span>
              ) : (
                <>
                  <Send className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Kör</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
