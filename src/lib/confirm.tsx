import * as React from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { cn } from '~/lib/utils'

export type ConfirmOptions = {
  title: string
  description: React.ReactNode
  /** Primär bekräftelse, t.ex. "Ta bort" eller "Förstått" */
  confirmLabel?: string
  /** Sekundär knapp, t.ex. "Avbryt" */
  cancelLabel?: string
  /**
   * `danger` = destruktiv/irreversibel (terracotta, enligt riktlinjer),
   * `default` = primär mörkgrön.
   */
  variant?: 'default' | 'danger'
}

type Pending = {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

const intentRef: { current: 'ok' | null } = { current: null }

const ConfirmContext = React.createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

/**
 * Måste ligga ovanför anrop till `useConfirm` (t.ex. i samma `Wrap` som `ConvexProvider`).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null)
  const opts = pending?.options

  const onOpenChange = (open: boolean) => {
    if (open) {
      return
    }
    setPending((current) => {
      if (!current) {
        return null
      }
      const v = intentRef.current === 'ok'
      intentRef.current = null
      current.resolve(v)
      return null
    })
  }

  const requestConfirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve })
    })
  }, [])

  return (
    <ConfirmContext.Provider value={requestConfirm}>
      {children}
      {opts && (
        <AlertDialog.Root
          open={true}
          onOpenChange={onOpenChange}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgb(0_0_0_/_0.45)]" />
            <AlertDialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-brand-dark/10 bg-brand-surface p-6 text-brand-text shadow-lg outline-none">
              <p className="mb-1 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-brand-dark/50">
                Bekräfta
              </p>
              <AlertDialog.Title className="font-heading text-lg font-semibold leading-snug text-brand-dark">
                {opts.title}
              </AlertDialog.Title>
              <AlertDialog.Description asChild>
                <div className="mt-2 text-sm leading-relaxed text-brand-dark/85">
                  {opts.description}
                </div>
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
                <AlertDialog.Cancel asChild>
                  <button
                    type="button"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-bg sm:w-auto"
                  >
                    {opts.cancelLabel ?? 'Avbryt'}
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    type="button"
                    onClick={() => {
                      intentRef.current = 'ok'
                    }}
                    className={cn(
                      'inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition sm:w-auto',
                      (opts.variant ?? 'default') === 'danger'
                        ? 'bg-brand-accent hover:bg-brand-accent/90'
                        : 'bg-brand-dark hover:bg-brand-dark/90',
                    )}
                  >
                    {opts.confirmLabel ?? 'Bekräfta'}
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}
    </ConfirmContext.Provider>
  )
}

/**
 * Styling och beteende finns i `~/lib/confirm` (inte `window.confirm`) så bekräftelser
 * hålls enhetliga. Använd t.ex. `if (!(await confirm({ ... }))) return;`.
 */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm måste användas inuti ConfirmProvider')
  }
  return ctx
}
