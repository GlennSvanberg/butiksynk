import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useCallback, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/snabb')({
  component: AppSnabbListingPage,
})

type QueueItem = {
  id: string
  status: 'sending' | 'sent' | 'error'
  label: string
  error?: string
}

function AppSnabbListingPage() {
  const { session } = useShopSession()
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const createProductFromPhotoCapture = useMutation(
    api.products.createProductFromPhotoCapture,
  )

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<{
    file: File
    url: string
  } | null>(null)
  const [queue, setQueue] = useState<Array<QueueItem>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearPreview = () => {
    if (preview?.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url)
    }
    setPreview(null)
  }

  const onFileChosen = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Välj en bildfil.')
      return
    }
    setError(null)
    clearPreview()
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
  }

  const sendCurrent = useCallback(async () => {
    if (!session) {
      setError('Ingen butik vald.')
      return
    }
    if (!preview) {
      setError('Välj ett foto först.')
      return
    }
    setError(null)
    setBusy(true)
    const id = crypto.randomUUID()
    const label =
      preview.file.name || `Foto ${new Date().toLocaleTimeString('sv-SE')}`
    setQueue((q) =>
      [{ id, status: 'sending' as const, label }, ...q].slice(0, 20),
    )

    try {
      const postUrl = await generateUploadUrl()
      const uploadResult = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': preview.file.type || 'image/jpeg' },
        body: preview.file,
      })
      if (!uploadResult.ok) {
        throw new Error('Uppladdning misslyckades.')
      }
      const json = (await uploadResult.json()) as { storageId: string }
      await createProductFromPhotoCapture({
        rawImageStorageId: json.storageId as Id<'_storage'>,
        shopId: session.shopId,
      })
      setQueue((q) =>
        q.map((item) =>
          item.id === id ? { ...item, status: 'sent' as const } : item,
        ),
      )
      clearPreview()
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Något gick fel. Försök igen.'
      setQueue((q) =>
        q.map((item) =>
          item.id === id
            ? { ...item, status: 'error' as const, error: msg }
            : item,
        ),
      )
      setError(msg)
    } finally {
      setBusy(false)
    }
  }, [preview, session, generateUploadUrl, createProductFromPhotoCapture])

  if (!session) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar session …</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Admin · {session.shopName}
        </p>
        <h1 className="font-heading text-2xl font-bold text-brand-dark">
          Snabb läggning
        </h1>
        <p className="mt-2 text-sm text-brand-dark/75">
          Ta flera bilder i rad — AI fyller titel, pris och text medan du
          fortsätter fota. Granska listan på översikten eller i demoshop.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border border-brand-dark/8 bg-brand-surface p-5 shadow-sm">
        {error ? (
          <p
            className="rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              onFileChosen(f)
            }
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              onFileChosen(f)
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-lg bg-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
          >
            Ta foto
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex flex-1 min-w-[140px] items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-bg"
          >
            Välj från galleri
          </button>
        </div>

        {preview ? (
          <div className="flex flex-col gap-3 border-t border-brand-dark/8 pt-4">
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-bg">
              <img
                src={preview.url}
                alt=""
                className="absolute inset-0 size-full object-cover object-center"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendCurrent()}
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
              >
                {busy ? 'Skickar…' : 'Skicka till AI'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  clearPreview()
                  if (cameraInputRef.current) {
                    cameraInputRef.current.value = ''
                  }
                  if (galleryInputRef.current) {
                    galleryInputRef.current.value = ''
                  }
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/5"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : null}

        {queue.length > 0 ? (
          <div className="border-t border-brand-dark/8 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-dark/50">
              Senast skickat
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md bg-brand-bg px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-brand-dark/90">
                      {item.label}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-brand-dark/60">
                      {item.status === 'sending'
                        ? '…'
                        : item.status === 'sent'
                          ? 'OK'
                          : 'Fel'}
                    </span>
                  </div>
                  {item.status === 'error' && item.error ? (
                    <p className="mt-1 text-xs text-brand-accent">{item.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <nav className="mt-8 flex flex-col gap-3 text-center text-sm">
        <Link
          to="/app"
          className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
        >
          Till översikt
        </Link>
        <Link
          to="/demoshop"
          search={{ butik: session.shopSlug }}
          className="text-brand-dark/70 hover:text-brand-dark"
        >
          Öppna demoshop
        </Link>
      </nav>
    </main>
  )
}
