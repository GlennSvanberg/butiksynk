import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demoshop')({
  component: DemoshopLayout,
})

function DemoshopLayout() {
  return <Outlet />
}
