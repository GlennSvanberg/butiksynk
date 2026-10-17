import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '~/components/landing/LandingPage'
import { publicPageHead } from '~/lib/publicSite'

export const Route = createFileRoute('/')({
  head: () => publicPageHead('/'),
  component: Home,
})

function Home() {
  return <LandingPage />
}
