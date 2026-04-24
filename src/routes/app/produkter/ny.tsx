import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/produkter/ny')({
  component: RedirectToSnabbListing,
})

/** Legacy URL: product creation is foto + AI only (`/app/snabb`). */
function RedirectToSnabbListing() {
  return <Navigate to="/app/snabb" replace />
}
