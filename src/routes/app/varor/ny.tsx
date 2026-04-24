import { createFileRoute } from '@tanstack/react-router'
import { AppSnabbListingPage } from '~/features/appNyVaraListing'

export const Route = createFileRoute('/app/varor/ny')({
  component: AppSnabbListingPage,
})
