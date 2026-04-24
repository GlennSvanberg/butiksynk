import { Link, createFileRoute } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/anotherPage')({
  component: AnotherPage,
})

function AnotherPage() {
  if (!import.meta.env.DEV) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-brand-bg p-8 text-brand-text">
        <h1 className="font-heading text-center text-2xl font-bold text-brand-dark">
          Sidan hittades inte
        </h1>
        <Link
          to="/"
          className="text-center text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
        >
          Till startsidan
        </Link>
      </main>
    )
  }

  return <AnotherPageDev />
}

function AnotherPageDev() {
  const [message, setMessage] = useState<string | null>(null)
  const callMyAction = useAction(api.myFunctions.myAction)

  const { data } = useSuspenseQuery(
    convexQuery(api.myFunctions.listNumbers, { count: 10 }),
  )

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 bg-brand-bg p-8 text-brand-text">
      <h1 className="font-heading text-center text-2xl font-bold text-brand-dark">
        Dev · Convex
      </h1>
      <div className="flex flex-col gap-6">
        <p className="font-mono text-sm">
          Numbers:{' '}
          <span className="font-medium text-brand-dark">{data.numbers.join(', ')}</span>
        </p>
        <p className="text-brand-dark/75">
          Knappen anropar en Convex-action och lägger till ett tal i databasen.
        </p>
        <p>
          <button
            type="button"
            className="rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
            onClick={() => {
              void callMyAction({
                first: Math.round(Math.random() * 100),
              }).then(() => setMessage('Tal tillagt.'))
            }}
          >
            Lägg till slumpmässigt tal
          </button>
        </p>
        {message ? (
          <p className="rounded-lg bg-status-success/10 px-3 py-2 text-sm text-brand-dark">
            {message}
          </p>
        ) : null}
        <Link
          to="/"
          className="text-sm font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-4 hover:decoration-brand-dark"
        >
          ← Till startsidan
        </Link>
      </div>
    </main>
  )
}
