import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demoshop/snabb')({
  component: RedirectSnabb,
})

function RedirectSnabb() {
  return <Navigate to="/app/varor/ny" replace />
}
