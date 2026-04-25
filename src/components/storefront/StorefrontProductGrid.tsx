import { StorefrontProductCard } from './StorefrontProductCard'
import type { StorefrontProductCardModel } from './StorefrontProductCard'

export function StorefrontProductGrid({
  shopSlug,
  products,
  gridClassName,
}: {
  shopSlug: string
  products: Array<StorefrontProductCardModel>
  gridClassName: string
}) {
  return (
    <ul className={gridClassName}>
      {products.map((product) => (
        <li key={product._id}>
          <StorefrontProductCard shopSlug={shopSlug} product={product} />
        </li>
      ))}
    </ul>
  )
}
