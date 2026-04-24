import type { Id } from '../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'

export type TaxonomyTreeNode = {
  id: Id<'taxonomyNodes'>
  name: string
  slug: string
  sortOrder?: number
  children: Array<TaxonomyTreeNode>
}

type TaxonomyTreePickerProps = {
  nodes: Array<TaxonomyTreeNode>
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  /** Visar överst som rensning av val (filterläge). */
  allowClear?: boolean
  clearLabel?: string
  className?: string
}

function TreeLevel({
  nodes,
  value,
  onChange,
  disabled,
  depth,
}: {
  nodes: Array<TaxonomyTreeNode>
  value: string
  onChange: (id: string) => void
  disabled: boolean
  depth: number
}) {
  return (
    <ul
      className={
        depth === 0
          ? 'space-y-0.5'
          : 'mt-0.5 space-y-0.5 border-l border-current/12 pl-2.5'
      }
      role="group"
    >
      {nodes.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(n.id)}
            className={`w-full max-w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
              value === n.id
                ? 'bg-current/12 font-semibold text-current'
                : 'text-current/90 hover:bg-current/6'
            }`}
          >
            {n.name}
          </button>
          {n.children.length > 0 ? (
            <TreeLevel
              nodes={n.children}
              value={value}
              onChange={onChange}
              disabled={disabled}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function flattenTaxonomyIdsPreorder(
  nodes: Array<TaxonomyTreeNode>,
): Array<string> {
  const out: Array<string> = []
  const walk = (arr: Array<TaxonomyTreeNode>) => {
    for (const n of arr) {
      out.push(n.id)
      if (n.children.length > 0) {
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return out
}

export function TaxonomyTreePicker({
  nodes,
  value,
  onChange,
  disabled = false,
  allowClear = false,
  clearLabel = 'Alla kategorier',
  className = '',
}: TaxonomyTreePickerProps) {
  return (
    <nav
      className={cn(
        'max-h-72 overflow-y-auto rounded-lg border border-current/12 p-2',
        className,
      )}
      aria-label="Kategorier"
    >
      {allowClear ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          className={`mb-2 w-full rounded-md px-2 py-1.5 text-left text-sm ${
            value === ''
              ? 'bg-current/12 font-semibold'
              : 'text-current/80 hover:bg-current/6'
          }`}
        >
          {clearLabel}
        </button>
      ) : null}
      {nodes.length === 0 ? (
        <p className="px-2 py-3 text-sm text-current/55">Inga kategorier ännu.</p>
      ) : (
        <TreeLevel
          nodes={nodes}
          value={value}
          onChange={onChange}
          disabled={disabled}
          depth={0}
        />
      )}
    </nav>
  )
}
