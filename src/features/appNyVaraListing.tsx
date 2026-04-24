import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { useShopSession } from '~/lib/shopSession'

type QueueItem = {
  id: string
  productId?: string
  status: 'sending' | 'sent' | 'error'
  label: string
  error?: string
  /** Separate from preview blob; revoked when server image is ready or on cleanup. */
  localThumbUrl?: string
}

type CaptureStatus = 'processing' | 'ready' | 'error'

type ServerQuickRow = {
  productId: Id<'products'>
  imageUrl: string | null
  captureStatus?: CaptureStatus
  captureError?: string
  title: string
}

function orderedProductIdsFromQueue(q: Array<QueueItem>): Array<Id<'products'>> {
  const ids: Array<Id<'products'>> = []
  const seen = new Set<string>()
  for (const item of q) {
    if (item.productId && !seen.has(item.productId)) {
      seen.add(item.productId)
      ids.push(item.productId as Id<'products'>)
    }
  }
  return ids
}

function statusChipClasses(kind: 'upload' | 'ai' | 'ready' | 'error'): string {
  switch (kind) {
    case 'upload':
      return 'bg-brand-dark/10 text-brand-dark/80'
    case 'ai':
      return 'bg-amber-500/15 text-amber-900'
    case 'ready':
      return 'bg-green-500/10 text-green-800'
    case 'error':
      return 'bg-brand-accent/15 text-brand-accent'
  }
}

async function openUserMediaWithFallbacks(): Promise<MediaStream> {
  const m = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices
  if (!m?.getUserMedia) {
    throw new Error('Din webbläsare stöder inte inbyggd kamera här.')
  }
  const attempts: Array<() => Promise<MediaStream>> = [
    () => m.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }),
    () => m.getUserMedia({ video: { facingMode: { ideal: 'user' } } }),
    () => m.getUserMedia({ video: true }),
  ]
  let lastErr: unknown
  for (const run of attempts) {
    try {
      return await run()
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(
    lastErr instanceof Error
      ? `Kameran gick inte att starta. (${lastErr.message})`
      : 'Kameran gick inte att starta. Kontrollera behörighet och en enhet ansluten.',
  )
}

export function AppSnabbListingPage() {
  const { session } = useShopSession()
  const generateUploadUrl = useMutation(api.products.generateUploadUrl)
  const createProductFromPhotoCapture = useMutation(
    api.products.createProductFromPhotoCapture,
  )

  const galleryInputRef = useRef<HTMLInputElement>(null)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const activeCameraStreamRef = useRef<MediaStream | null>(null)
  const cameraStartLockRef = useRef(false)
  const queueRef = useRef<Array<QueueItem>>([])

  const [inputMode, setInputMode] = useState<'camera' | 'gallery'>('camera')
  const [userContext, setUserContext] = useState('')
  const [activeCameraStream, setActiveCameraStream] =
    useState<MediaStream | null>(null)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const [preview, setPreview] = useState<{
    file: File
    url: string
  } | null>(null)
  const [queue, setQueue] = useState<Array<QueueItem>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  queueRef.current = queue

  const productIdsKey = useMemo(() => {
    const ids: Array<string> = []
    const seen = new Set<string>()
    for (const item of queue) {
      if (item.productId && !seen.has(item.productId)) {
        seen.add(item.productId)
        ids.push(item.productId)
      }
    }
    return ids.join('|')
  }, [queue])

  const productIdsForQuery = useMemo((): Array<Id<'products'>> => {
    if (!productIdsKey) {
      return []
    }
    return productIdsKey.split('|') as Array<Id<'products'>>
  }, [productIdsKey])

  const quickReview = useQuery(
    api.products.getProductsQuickReview,
    session && productIdsForQuery.length > 0
      ? { shopId: session.shopId, productIds: productIdsForQuery }
      : 'skip',
  )

  const reviewByProductId = useMemo(() => {
    const m = new Map<string, ServerQuickRow>()
    if (!quickReview) {
      return m
    }
    for (let i = 0; i < productIdsForQuery.length; i++) {
      const row = quickReview[i]
      const id = productIdsForQuery[i]
      if (row && id) {
        m.set(id, row)
      }
    }
    return m
  }, [quickReview, productIdsForQuery, productIdsKey])

  useEffect(() => {
    if (!quickReview?.length) {
      return
    }
    setQueue((q) => {
      const ids = orderedProductIdsFromQueue(q)
      const toRevoke: Array<string> = []
      const next = q.map((item) => {
        if (!item.localThumbUrl || !item.productId) {
          return item
        }
        const idx = ids.indexOf(item.productId as Id<'products'>)
        const row = idx >= 0 ? quickReview[idx] : null
        const imageUrl = row?.imageUrl
        if (typeof imageUrl === 'string' && imageUrl.length > 0) {
          toRevoke.push(item.localThumbUrl)
          return { ...item, localThumbUrl: undefined }
        }
        return item
      })
      for (const u of toRevoke) {
        URL.revokeObjectURL(u)
      }
      if (toRevoke.length === 0) {
        return q
      }
      return next
    })
  }, [quickReview])

  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        if (item.localThumbUrl) {
          URL.revokeObjectURL(item.localThumbUrl)
        }
      }
    }
  }, [])

  const clearPreview = useCallback(() => {
    setPreview((prev) => {
      if (prev?.url.startsWith('blob:')) {
        URL.revokeObjectURL(prev.url)
      }
      return null
    })
  }, [])

  const onFileChosen = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith('image/')) {
        setError('Välj en bildfil.')
        return
      }
      setError(null)
      setCameraError(null)
      clearPreview()
      const url = URL.createObjectURL(file)
      setPreview({ file, url })
    },
    [clearPreview],
  )

  const stopActiveCamera = useCallback(() => {
    const s = activeCameraStreamRef.current
    if (s) {
      for (const t of s.getTracks()) {
        t.stop()
      }
    }
    activeCameraStreamRef.current = null
    setActiveCameraStream(null)
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null
    }
  }, [])

  const startLiveCamera = useCallback(async () => {
    if (activeCameraStreamRef.current || cameraStartLockRef.current) {
      return
    }
    setCameraError(null)
    setError(null)
    cameraStartLockRef.current = true
    setCameraStarting(true)
    try {
      const stream = await openUserMediaWithFallbacks()
      activeCameraStreamRef.current = stream
      setActiveCameraStream(stream)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Kunde inte ansluta till kameran.'
      setCameraError(msg)
    } finally {
      cameraStartLockRef.current = false
      setCameraStarting(false)
    }
  }, [])

  const captureFrameFromVideo = useCallback(() => {
    const video = liveVideoRef.current
    if (!video) {
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (w < 1 || h < 1) {
      setError('Bilden är inte klar. Vänta en sekund och försök igen.')
      return
    }
    setError(null)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Kunde inte spara bilden. Försök igen.')
      return
    }
    ctx.drawImage(video, 0, 0, w, h)
    void new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    }).then((blob) => {
      if (!blob) {
        setError('Kunde inte spara bilden. Försök igen.')
        return
      }
      stopActiveCamera()
      onFileChosen(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
    })
  }, [onFileChosen, stopActiveCamera])

  useEffect(() => {
    if (!activeCameraStream) {
      return
    }
    const v = liveVideoRef.current
    if (!v) {
      return
    }
    v.srcObject = activeCameraStream
    const p = v.play()
    void p.catch(() => {
      // Ignored: autoplay policies; user is already in camera mode
    })
    return () => {
      v.srcObject = null
    }
  }, [activeCameraStream])

  useEffect(() => {
    if (inputMode === 'gallery' && activeCameraStreamRef.current) {
      stopActiveCamera()
    }
  }, [inputMode, stopActiveCamera])

  useEffect(() => {
    return () => {
      if (activeCameraStreamRef.current) {
        for (const t of activeCameraStreamRef.current.getTracks()) {
          t.stop()
        }
        activeCameraStreamRef.current = null
      }
    }
  }, [])

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
    const localThumbUrl = URL.createObjectURL(preview.file)
    setQueue((q) =>
      [
        {
          id,
          status: 'sending' as const,
          label,
          localThumbUrl,
        },
        ...q,
      ].slice(0, 20),
    )

    try {
      const postUrl = await generateUploadUrl({ shopId: session.shopId })
      const uploadResult = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': preview.file.type || 'image/jpeg' },
        body: preview.file,
      })
      if (!uploadResult.ok) {
        throw new Error('Uppladdning misslyckades.')
      }
      const json = (await uploadResult.json()) as { storageId: string }

      const productId = await createProductFromPhotoCapture({
        rawImageStorageId: json.storageId as Id<'_storage'>,
        shopId: session.shopId,
        userContext: userContext.trim() || undefined,
      })

      setQueue((q) =>
        q.map((item) =>
          item.id === id
            ? { ...item, status: 'sent' as const, productId }
            : item,
        ),
      )
      clearPreview()
      setUserContext('')
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
  }, [
    preview,
    session,
    userContext,
    generateUploadUrl,
    createProductFromPhotoCapture,
    clearPreview,
  ])

  if (!session) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar session …</p>
      </main>
    )
  }

  const reviewAside =
    queue.length > 0 ? (
      <aside className="mt-6 flex min-h-0 flex-col lg:mt-0 lg:max-h-[calc(100vh-5rem)] lg:sticky lg:top-6">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-brand-dark/8 bg-brand-surface p-4 shadow-sm">
          <p className="shrink-0 font-mono text-xs font-medium uppercase tracking-wide text-brand-dark/50">
            Att granska
          </p>
          <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
            {queue.map((item) => (
              <QueueReviewRow
                key={item.id}
                item={item}
                serverRow={
                  item.productId
                    ? reviewByProductId.get(item.productId)
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      </aside>
    ) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Verktyg · {session.shopName}
        </p>
        <h1 className="font-heading text-2xl font-bold text-brand-dark sm:text-3xl">
          Ny vara
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-dark/75">
          Ta ett foto — AI föreslår titel, pris och text. Fortsätt med fler
          bilder i rad och följ status till höger (eller nedan på mobil).
          Öppna en rad när den är klar för att justera innan den syns i
          butiken.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-brand-dark/8 bg-brand-surface p-5 shadow-sm">
          {error ? (
            <p
              className="rounded-lg bg-brand-accent/10 px-3 py-2 text-sm text-brand-dark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

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

          {!preview && (
            <>
              {activeCameraStream ? (
                <div className="flex flex-col gap-3">
                  <div className="mb-2 flex w-full items-center rounded-lg bg-brand-dark/5 p-1">
                    <button
                      type="button"
                      onClick={() => setInputMode('camera')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                        inputMode === 'camera'
                          ? 'bg-white text-brand-dark shadow-sm'
                          : 'text-brand-dark/60 hover:text-brand-dark'
                      }`}
                    >
                      Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('gallery')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                        inputMode === 'gallery'
                          ? 'bg-white text-brand-dark shadow-sm'
                          : 'text-brand-dark/60 hover:text-brand-dark'
                      }`}
                    >
                      Galleri
                    </button>
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-brand-dark/10 bg-black">
                    <video
                      ref={liveVideoRef}
                      className="absolute inset-0 size-full object-cover"
                      autoPlay
                      playsInline
                      muted
                      aria-label="Kamerabild"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void captureFrameFromVideo()
                      }}
                      className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
                    >
                      Fånga
                    </button>
                    <button
                      type="button"
                      onClick={stopActiveCamera}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/5"
                    >
                      Stäng kamera
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex w-full items-center rounded-lg bg-brand-dark/5 p-1">
                    <button
                      type="button"
                      onClick={() => setInputMode('camera')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                        inputMode === 'camera'
                          ? 'bg-white text-brand-dark shadow-sm'
                          : 'text-brand-dark/60 hover:text-brand-dark'
                      }`}
                    >
                      Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('gallery')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                        inputMode === 'gallery'
                          ? 'bg-white text-brand-dark shadow-sm'
                          : 'text-brand-dark/60 hover:text-brand-dark'
                      }`}
                    >
                      Galleri
                    </button>
                  </div>

                  {cameraError ? (
                    <div className="rounded-lg border border-brand-dark/10 bg-brand-dark/[0.04] p-3 text-sm text-brand-dark/90">
                      <p>{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null)
                          setError(null)
                          galleryInputRef.current?.click()
                        }}
                        className="mt-2 font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-2 hover:decoration-brand-dark"
                      >
                        Välj bildfil istället
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={cameraStarting}
                    onClick={() => {
                      if (inputMode === 'camera') {
                        void startLiveCamera()
                        return
                      }
                      galleryInputRef.current?.click()
                    }}
                    className="flex w-full min-h-[2.5rem] items-center justify-center gap-2 rounded-lg bg-brand-dark px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
                  >
                    {inputMode === 'camera' ? (
                      cameraStarting ? (
                        'Startar kamera…'
                      ) : (
                        <>
                          <svg
                            className="size-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                            />
                          </svg>
                          Ta foto
                        </>
                      )
                    ) : (
                      <>
                        <svg
                          className="size-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                          />
                        </svg>
                        Välj från galleri
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}

          {preview ? (
            <div className="flex flex-col gap-4 border-t border-brand-dark/8 pt-4">
              <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-bg">
                <img
                  src={preview.url}
                  alt=""
                  className="absolute inset-0 size-full object-cover object-center"
                />
              </div>

              <div>
                <label
                  htmlFor="userContext"
                  className="mb-1.5 block text-sm font-medium text-brand-dark"
                >
                  Information till AI (frivilligt)
                </label>
                <textarea
                  id="userContext"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  disabled={busy}
                  placeholder="Skick, detaljer, defekter, märke..."
                  className="w-full resize-none rounded-lg border border-brand-dark/10 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:border-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-dark/5"
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendCurrent()}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-60"
                >
                  {busy ? 'Skickar…' : 'Lista med AI'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    clearPreview()
                    setUserContext('')
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
        </div>

        {reviewAside}
      </div>

      <nav className="mt-8 flex flex-col gap-3 text-center text-sm sm:text-left">
        <Link
          to="/app/varor"
          className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
        >
          Till varor
        </Link>
        <Link
          to="/butik/$shopSlug"
          params={{ shopSlug: session.shopSlug }}
          search={emptyButikListingSearch}
          className="text-brand-dark/70 hover:text-brand-dark"
        >
          Öppna butikvyn
        </Link>
      </nav>
    </main>
  )
}

function QueueReviewRow({
  item,
  serverRow,
}: {
  item: QueueItem
  serverRow: ServerQuickRow | undefined
}) {
  const thumbSrc =
    serverRow?.imageUrl ?? item.localThumbUrl ?? undefined
  const titleText =
    serverRow?.title && serverRow.title !== 'Bearbetar…'
      ? serverRow.title
      : item.label

  let statusLabel = ''
  let statusKind: 'upload' | 'ai' | 'ready' | 'error' = 'upload'

  if (item.status === 'sending') {
    statusLabel = 'Laddar upp…'
    statusKind = 'upload'
  } else if (item.status === 'error' && !item.productId) {
    statusLabel = 'Fel'
    statusKind = 'error'
  } else if (item.productId && serverRow === undefined) {
    statusLabel = 'Hämtar…'
    statusKind = 'upload'
  } else if (item.productId && serverRow) {
    const cap = serverRow.captureStatus
    if (cap === 'processing') {
      statusLabel = 'AI listar…'
      statusKind = 'ai'
    } else if (cap === 'error') {
      statusLabel = 'Fel'
      statusKind = 'error'
    } else {
      statusLabel = 'Redo att granska'
      statusKind = 'ready'
    }
  }

  const canOpenEdit =
    item.productId &&
    serverRow &&
    serverRow.captureStatus !== 'processing' &&
    serverRow.captureStatus !== 'error'

  const rowInner = (
    <>
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-brand-dark/10 bg-brand-bg">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt=""
            className="absolute inset-0 size-full object-cover object-center"
          />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-[10px] text-brand-dark/35">
            …
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-brand-dark/90">{titleText}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${statusChipClasses(statusKind)}`}
          >
            {statusLabel}
          </span>
        </div>
        {item.status === 'error' && item.error ? (
          <p className="mt-1 text-xs text-brand-accent">{item.error}</p>
        ) : null}
        {serverRow?.captureStatus === 'error' && serverRow.captureError ? (
          <p className="mt-1 text-xs text-brand-accent">{serverRow.captureError}</p>
        ) : null}
      </div>
      {canOpenEdit ? (
        <svg
          className="size-4 shrink-0 self-center text-brand-dark/30"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      ) : (
        <span className="size-4 shrink-0 self-center" aria-hidden />
      )}
    </>
  )

  if (canOpenEdit && item.productId) {
    return (
      <li className="overflow-hidden rounded-md bg-brand-bg">
        <Link
          to="/app/varor/$productId/redigera"
          params={{ productId: item.productId }}
          className="flex items-center gap-3 px-3 py-2 transition hover:bg-brand-dark/5"
        >
          {rowInner}
        </Link>
      </li>
    )
  }

  return (
    <li className="overflow-hidden rounded-md bg-brand-bg">
      <div className="flex items-center gap-3 px-3 py-2">{rowInner}</div>
    </li>
  )
}
