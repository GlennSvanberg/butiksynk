import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demoshop/ny')({
  component: RedirectNy,
})

function RedirectNy() {
  return <Navigate to="/app/varor/ny" replace />
}
