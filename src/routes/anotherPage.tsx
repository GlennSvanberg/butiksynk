import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/anotherPage')({
  component: AnotherPage,
})

function AnotherPage() {
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
