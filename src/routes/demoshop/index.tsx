import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEMO_SHOP_SLUG } from '../../../shared/shopConstants'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'

export const Route = createFileRoute('/demoshop/')({
  validateSearch: (search: Record<string, unknown>) => ({
    butik:
      typeof search.butik === 'string' && search.butik.length > 0
        ? search.butik
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    const slug = search.butik ?? DEMO_SHOP_SLUG
    throw redirect({
      to: '/butik/$shopSlug',
      params: { shopSlug: slug },
      search: emptyButikListingSearch,
    })
  },
  component: () => null,
})
