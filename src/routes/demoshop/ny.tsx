import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useCallback, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/demoshop/ny')({
  component: NewProductPage,
})

type AttrRow = { label: string; value: string }

function NewProductPage() {
  const navigate = useNavigate()
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const createProduct = useMutation(api.products.createProduct)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceSek, setPriceSek] = useState('')
  const [category, setCategory] = useState('')
  const [attributes, setAttributes] = useState<Array<AttrRow>>([
    { label: '', value: '' },
  ])
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addAttributeRow = () => {
    setAttributes((rows) => [...rows, { label: '', value: '' }])
  }

  const removeAttributeRow = (index: number) => {
    setAttributes((rows) => rows.filter((_, i) => i !== index))
  }

  const updateAttribute = (
    index: number,
    field: keyof AttrRow,
    value: string,
  ) => {
    setAttributes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!file) {
        setError('Välj en produktbild.')
        return
      }

      const price = Number(priceSek.replace(',', '.').trim())
      if (!Number.isFinite(price) || price < 0) {
        setError('Ange ett giltigt pris (SEK).')
        return
      }

      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        setError('Ange en titel.')
        return
      }

      const trimmedCategory = category.trim()
      if (!trimmedCategory) {
        setError('Ange en kategori.')
        return
      }

      const attrs = attributes
        .map((a) => ({
          label: a.label.trim(),
          value: a.value.trim(),
        }))
        .filter((a) => a.label.length > 0 || a.value.length > 0)
        .map((a) => ({
          label: a.label.length > 0 ? a.label : '—',
          value: a.value.length > 0 ? a.value : '—',
        }))

      setSubmitting(true)
      try {
        const postUrl = await generateUploadUrl()
        const uploadResult = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadResult.ok) {
          throw new Error('Uppladdning misslyckades.')
        }
        const json = (await uploadResult.json()) as {
          storageId: string
        }
        await createProduct({
          title: trimmedTitle,
          description: description.trim(),
          priceSek: price,
          category: trimmedCategory,
          attributes: attrs,
          imageStorageId: json.storageId as Id<'_storage'>,
        })
        await navigate({ to: '/demoshop' })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Något gick fel. Försök igen.',
        )
      } finally {
        setSubmitting(false)
      }
    },
    [
      file,
      title,
      description,
      priceSek,
      category,
      attributes,
      generateUploadUrl,
      createProduct,
      navigate,
    ],
  )

  return (
    <main className="min-h-dvh bg-brand-bg bg-paper-grain text-brand-text">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
            Demoshop
          </p>
          <h1 className="font-heading text-2xl font-bold text-brand-dark">
            Ny produkt
          </h1>
          <p className="mt-2 text-sm text-brand-dark/75">
            Fyll i uppgifterna och ladda upp ett foto. Ingen inloggning ännu —
            demo läge.
          </p>
        </header>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex flex-col gap-6 rounded-lg border border-brand-dark/8 bg-brand-surface p-6 shadow-sm"
        >
          {error ? (
            <p
              className="rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-medium text-brand-dark">
              Titel
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="t.ex. Jeans Levi's 501"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="category"
              className="text-sm font-medium text-brand-dark"
            >
              Kategori
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="t.ex. Byxor, Klänningar"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="price"
              className="text-sm font-medium text-brand-dark"
            >
              Pris (SEK)
            </label>
            <input
              id="price"
              type="text"
              inputMode="decimal"
              value={priceSek}
              onChange={(e) => setPriceSek(e.target.value)}
              required
              className="rounded-lg border border-brand-dark/15 bg-white px-3 py-2 font-mono text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="499"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-brand-dark"
            >
              Beskrivning
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-y rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none ring-brand-dark/20 placeholder:text-brand-dark/40 focus:ring-2"
              placeholder="Skick, mått, historik …"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-dark">Attribut</span>
            <div className="flex flex-col gap-3">
              {attributes.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    aria-label={`Attributnamn ${index + 1}`}
                    value={row.label}
                    onChange={(e) =>
                      updateAttribute(index, 'label', e.target.value)
                    }
                    placeholder="Namn"
                    className="min-w-0 flex-1 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:ring-2 focus:ring-brand-dark/20"
                  />
                  <input
                    type="text"
                    aria-label={`Attributvärde ${index + 1}`}
                    value={row.value}
                    onChange={(e) =>
                      updateAttribute(index, 'value', e.target.value)
                    }
                    placeholder="Värde"
                    className="min-w-0 flex-1 rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark outline-none focus:ring-2 focus:ring-brand-dark/20"
                  />
                  {attributes.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeAttributeRow(index)}
                      className="shrink-0 rounded-lg px-2 text-sm text-brand-dark/60 hover:bg-brand-dark/5 hover:text-brand-dark"
                      aria-label="Ta bort rad"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAttributeRow}
              className="self-start text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
            >
              + Lägg till attribut
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="photo"
              className="text-sm font-medium text-brand-dark"
            >
              Produktfoto
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-brand-dark file:mr-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
            >
              {submitting ? 'Sparar…' : 'Spara produkt'}
            </button>
            <Link
              to="/demoshop"
              className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/5"
            >
              Avbryt
            </Link>
          </div>
        </form>

        <p className="mt-8 text-center">
          <Link
            to="/demoshop"
            className="text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
          >
            ← Till demoshop
          </Link>
        </p>
      </div>
    </main>
  )
}
