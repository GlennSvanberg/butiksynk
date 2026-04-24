import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboard } from '../index'

export const Route = createFileRoute('/app/varor/')({
  component: AdminDashboard,
})
