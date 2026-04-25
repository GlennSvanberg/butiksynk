export function storefrontListingGridClass(hasCategoryNav: boolean) {
  return hasCategoryNav
    ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3'
    : 'grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 2xl:grid-cols-4'
}

/** Kompakt rutnät för förhandsvisning (t.ex. startsida). */
export function storefrontPreviewGridClass() {
  return 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'
}

export function StorefrontCardSkeletons({
  hasCategoryNav,
  count = 8,
  gridClassName,
}: {
  hasCategoryNav: boolean
  count?: number
  /** Om satt, används istället för standardklasserna. */
  gridClassName?: string
}) {
  const grid =
    gridClassName ?? storefrontListingGridClass(hasCategoryNav)
  return (
    <ul className={grid} aria-label="Laddar varor">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-2xl border border-[color:var(--sf-primary)]/8 bg-[var(--sf-surface)] shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-[color:var(--sf-primary)]/8" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 rounded bg-[color:var(--sf-primary)]/10" />
            <div className="h-3 w-1/3 rounded bg-[color:var(--sf-primary)]/8" />
            <div className="space-y-2 pt-2">
              <div className="h-3 rounded bg-[color:var(--sf-primary)]/7" />
              <div className="h-3 w-5/6 rounded bg-[color:var(--sf-primary)]/7" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
