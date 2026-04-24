type CategoryBreadcrumbProps = {
  segments: Array<string>
  className?: string
}

/** Visar kategoriträdet som steg (rot / barn / …), inte en enkel söksträng. */
export function CategoryBreadcrumb({
  segments,
  className = '',
}: CategoryBreadcrumbProps) {
  if (segments.length === 0) {
    return (
      <span className={`font-mono text-xs uppercase tracking-wide ${className}`}>
        —
      </span>
    )
  }

  return (
    <ol
      className={`flex flex-wrap items-baseline gap-x-1 gap-y-0.5 font-mono text-xs uppercase tracking-wide ${className}`}
    >
      {segments.map((label, i) => (
        <li key={`${i}-${label}`} className="flex items-baseline gap-x-1">
          {i > 0 ? (
            <span className="font-sans font-normal normal-case opacity-40" aria-hidden>
              /
            </span>
          ) : null}
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}
