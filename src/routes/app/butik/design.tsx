import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import * as React from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { StorefrontDesignPreview } from '~/components/StorefrontDesignPreview'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { useShopSession } from '~/lib/shopSession'

export const Route = createFileRoute('/app/butik/design')({
  component: ButiksdesignPage,
})

const defaultPrimary = '#1b3a29'
const defaultAccent = '#c05746'
const defaultBg = '#f9f8f6'
const defaultSurface = '#ffffff'

function ButiksdesignPage() {
  const { session } = useShopSession()
  const queryClient = useQueryClient()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { data: branding, isPending } = useQuery({
    ...convexQuery(
      api.shops.getShopBrandingForAdmin,
      session ? { shopId: session.shopId } : 'skip',
    ),
    enabled: !!session,
  })

  const updateBranding = useMutation(api.shops.updateStorefrontBranding)
  const generateLogoUrl = useMutation(api.shops.generateStorefrontLogoUploadUrl)

  const [storefrontDisplayName, setStorefrontDisplayName] = React.useState('')
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [contactWebsite, setContactWebsite] = React.useState('')
  const [contactNote, setContactNote] = React.useState('')
  const [colorPrimary, setColorPrimary] = React.useState('')
  const [colorAccent, setColorAccent] = React.useState('')
  const [colorBg, setColorBg] = React.useState('')
  const [colorSurface, setColorSurface] = React.useState('')
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploadBusy, setUploadBusy] = React.useState(false)

  React.useEffect(() => {
    if (!branding) {
      return
    }
    setStorefrontDisplayName(branding.storefrontDisplayName ?? '')
    setContactEmail(branding.contactEmail ?? '')
    setContactPhone(branding.contactPhone ?? '')
    setContactWebsite(branding.contactWebsite ?? '')
    setContactNote(branding.contactNote ?? '')
    setColorPrimary(branding.storefrontColorPrimary ?? '')
    setColorAccent(branding.storefrontColorAccent ?? '')
    setColorBg(branding.storefrontColorBackground ?? '')
    setColorSurface(branding.storefrontColorSurface ?? '')
  }, [branding])

  const invalidate = async () => {
    if (!session) {
      return
    }
    await queryClient.invalidateQueries({
      queryKey: convexQuery(api.shops.getShopBrandingForAdmin, {
        shopId: session.shopId,
      }).queryKey,
    })
    await queryClient.invalidateQueries({
      queryKey: convexQuery(api.shops.getStorefrontBrandingBySlug, {
        slug: session.shopSlug,
      }).queryKey,
    })
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      return
    }
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      await updateBranding({
        shopId: session.shopId,
        storefrontDisplayName,
        contactEmail,
        contactPhone,
        contactWebsite,
        contactNote,
        storefrontColorPrimary: colorPrimary,
        storefrontColorAccent: colorAccent,
        storefrontColorBackground: colorBg,
        storefrontColorSurface: colorSurface,
      })
      setMessage('Sparat.')
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara.')
    } finally {
      setSaving(false)
    }
  }

  const onResetDefaults = () => {
    setStorefrontDisplayName('')
    setContactEmail('')
    setContactPhone('')
    setContactWebsite('')
    setContactNote('')
    setColorPrimary('')
    setColorAccent('')
    setColorBg('')
    setColorSurface('')
    setMessage('Fält rensade lokalt — spara för att skicka till servern.')
    setError(null)
  }

  const onPickLogo = () => {
    fileInputRef.current?.click()
  }

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !session) {
      return
    }
    setUploadBusy(true)
    setError(null)
    try {
      const uploadUrl = await generateLogoUrl({ shopId: session.shopId })
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!res.ok) {
        throw new Error('Uppladdning misslyckades.')
      }
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      await updateBranding({
        shopId: session.shopId,
        logoStorageId: storageId,
      })
      setMessage('Ny logotyp sparad.')
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uppladdning misslyckades.')
    } finally {
      setUploadBusy(false)
    }
  }

  const onRemoveLogo = async () => {
    if (!session) {
      return
    }
    setError(null)
    setSaving(true)
    try {
      await updateBranding({
        shopId: session.shopId,
        clearLogo: true,
      })
      setMessage('Logotyp borttagen.')
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort logotypen.')
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar …</p>
      </main>
    )
  }

  if (isPending || !branding) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-brand-dark/75">Laddar butiksdesign …</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-brand-dark/10 pb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/50">
          Utseende & kontakt
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
          Butiksdesign
        </h1>
        <p className="mt-2 text-sm text-brand-dark/75">
          Anpassar kundbutiken på{' '}
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: session.shopSlug }}
            search={emptyButikListingSearch}
            className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4"
          >
            /butik/{session.shopSlug}
          </Link>
          . Internt namn: <span className="font-mono">{branding.internalName}</span>
        </p>
        <p className="mt-2 text-sm text-brand-dark/60">
          Förhandsvisningen till höger (under större skärmar) uppdateras direkt när du
          ändrar fält — spara när du vill publicera ändringarna.
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <form onSubmit={onSave} className="min-w-0 flex-1 space-y-10">
        <section className="space-y-3 rounded-lg border border-brand-dark/10 bg-brand-surface p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-brand-dark">
            Namn i butiken
          </h2>
          <p className="text-sm text-brand-dark/70">
            Visas i sidhuvudet för kunder. Lämna tomt för att använda butikens
            ordinarie namn ({branding.internalName}).
          </p>
          <input
            type="text"
            value={storefrontDisplayName}
            onChange={(e) => setStorefrontDisplayName(e.target.value)}
            className="w-full rounded-lg border border-brand-dark/15 bg-brand-bg px-3 py-2 text-sm text-brand-dark shadow-sm outline-none ring-brand-accent/25 focus:ring-2"
            placeholder={branding.internalName}
          />
        </section>

        <section className="space-y-3 rounded-lg border border-brand-dark/10 bg-brand-surface p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-brand-dark">
            Kontakt
          </h2>
          <p className="text-sm text-brand-dark/70">
            Visas längst ner i kundbutiken när minst ett fält är ifyllt.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-brand-dark">E-post</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-brand-bg px-3 py-2 text-sm text-brand-dark shadow-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brand-dark">Telefon</span>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-brand-bg px-3 py-2 text-sm text-brand-dark shadow-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-brand-dark">Webbplats (URL)</span>
              <input
                type="url"
                value={contactWebsite}
                onChange={(e) => setContactWebsite(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-brand-bg px-3 py-2 text-sm text-brand-dark shadow-sm"
                placeholder="https://…"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-brand-dark">Anteckning / adress</span>
              <textarea
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-brand-dark/15 bg-brand-bg px-3 py-2 text-sm text-brand-dark shadow-sm"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-brand-dark/10 bg-brand-surface p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-brand-dark">
            Färger
          </h2>
          <p className="text-sm text-brand-dark/70">
            Hex i formatet #RRGGBB. Lämna tomt för standard (Butiksynk-palett).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['Primär', colorPrimary, setColorPrimary, defaultPrimary],
                ['Accent', colorAccent, setColorAccent, defaultAccent],
                ['Bakgrund', colorBg, setColorBg, defaultBg],
                ['Yta (kort)', colorSurface, setColorSurface, defaultSurface],
              ] as const
            ).map(([label, value, setVal, fallback]) => (
              <div key={label} className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-sm font-medium text-brand-dark">
                  {label}
                </span>
                <input
                  type="color"
                  aria-label={`${label} färg`}
                  value={value || fallback}
                  onChange={(e) => setVal(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-brand-dark/15 bg-brand-bg"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={fallback}
                  className="min-w-[7rem] flex-1 rounded-lg border border-brand-dark/15 bg-brand-bg px-2 py-1.5 font-mono text-xs text-brand-dark shadow-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-brand-dark/10 bg-brand-surface p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-brand-dark">
            Logotyp
          </h2>
          <p className="text-sm text-brand-dark/70">
            Rekommenderad PNG eller SVG (max rimlig filstorlek). Visas i sidhuvudet.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onLogoFile(e)
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt=""
                className="h-14 max-w-[12rem] rounded border border-brand-dark/10 object-contain p-1"
              />
            ) : (
              <span className="text-sm text-brand-dark/55">Ingen logotyp ännu.</span>
            )}
            <button
              type="button"
              onClick={onPickLogo}
              disabled={uploadBusy}
              className="rounded-lg border border-brand-dark/20 bg-brand-bg px-3 py-2 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35 disabled:opacity-50"
            >
              {uploadBusy ? 'Laddar upp …' : 'Byt logotyp'}
            </button>
            {branding.logoUrl ? (
              <button
                type="button"
                onClick={() => {
                  void onRemoveLogo()
                }}
                disabled={saving || uploadBusy}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-accent transition hover:underline disabled:opacity-50"
              >
                Ta bort logotyp
              </button>
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="text-sm font-medium text-brand-accent" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm font-medium text-status-success" role="status">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || uploadBusy}
            className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 disabled:opacity-50"
          >
            {saving ? 'Sparar …' : 'Spara'}
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Rensa lokalt
          </button>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: session.shopSlug }}
            search={emptyButikListingSearch}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-brand-dark underline decoration-brand-dark/30 underline-offset-4"
          >
            Öppna kundbutik
          </Link>
        </div>
      </form>

      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[min(100%,380px)] lg:self-start">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-sm font-semibold text-brand-dark">
            Live förhandsvisning
          </h2>
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-brand-dark/45">
            Utkast
          </span>
        </div>
        <StorefrontDesignPreview
          internalName={branding.internalName}
          storefrontDisplayName={storefrontDisplayName}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          contactWebsite={contactWebsite}
          contactNote={contactNote}
          colorPrimary={colorPrimary}
          colorAccent={colorAccent}
          colorBg={colorBg}
          colorSurface={colorSurface}
          logoUrl={branding.logoUrl}
        />
      </aside>
      </div>
    </main>
  )
}
