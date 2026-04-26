import { Plus, Trash2 } from 'lucide-react'
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
  /** Redigering: plus för underkategori, soptunna för att ta bort (ej rot). */
  editable?: boolean
  onAddChild?: (parentId: string) => void
  onDeleteNode?: (nodeId: string) => void
  deletingNodeId?: string | null
}

/** Visningsväg \"A > B > C\" för en nod i trädet. */
export function taxonomyPathLabel(
  nodes: Array<TaxonomyTreeNode>,
  targetId: string,
  prefix: Array<string> = [],
): string | null {
  for (const n of nodes) {
    const chain = [...prefix, n.name]
    if (n.id === targetId) {
      return chain.join(' > ')
    }
    if (n.children.length > 0) {
      const found = taxonomyPathLabel(n.children, targetId, chain)
      if (found) {
        return found
      }
    }
  }
  return null
}

function TreeLevel({
  nodes,
  value,
  onChange,
  disabled,
  depth,
  editable,
  onAddChild,
  onDeleteNode,
  deletingNodeId,
}: {
  nodes: Array<TaxonomyTreeNode>
  value: string
  onChange: (id: string) => void
  disabled: boolean
  depth: number
  editable: boolean
  onAddChild?: (parentId: string) => void
  onDeleteNode?: (nodeId: string) => void
  deletingNodeId?: string | null
}) {
  return (
    <ul
      className={
        depth === 0
          ? 'space-y-1'
          : 'mt-1 space-y-1 border-l border-brand-dark/15 pl-3'
      }
      role="group"
    >
      {nodes.map((n) => {
        const active = value === n.id
        const showDelete = editable && depth > 0 && onDeleteNode
        const deleteBusy = deletingNodeId === n.id

        return (
          <li key={n.id} className="space-y-1">
            {editable ? (
              <div className="flex w-full max-w-full items-center gap-0.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(n.id)}
                  aria-pressed={active}
                  className={cn(
                    'group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                    active
                      ? 'border-brand-dark bg-brand-dark font-semibold text-white shadow-sm'
                      : 'border-transparent bg-white/65 text-brand-dark/85 hover:border-brand-dark/15 hover:bg-white',
                  )}
                >
                  <span className="min-w-0 truncate">{n.name}</span>
                  {n.children.length > 0 ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                        active
                          ? 'bg-white/15 text-white/75'
                          : 'bg-brand-dark/8 text-brand-dark/45 group-hover:text-brand-dark/70',
                      )}
                    >
                      {n.children.length}
                    </span>
                  ) : null}
                </button>
                {onAddChild ? (
                  <button
                    type="button"
                    disabled={disabled}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-brand-dark/55 transition hover:border-brand-dark/15 hover:bg-white hover:text-brand-dark disabled:opacity-40"
                    aria-label={`Ny underkategori under ${n.name}`}
                    onClick={(e) => {
                      e.preventDefault()
                      onAddChild(n.id)
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                ) : null}
                {showDelete ? (
                  <button
                    type="button"
                    disabled={disabled || deleteBusy}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-brand-dark/50 transition hover:border-brand-accent/25 hover:bg-brand-accent/5 hover:text-brand-accent disabled:opacity-40"
                    aria-label={`Ta bort kategorin ${n.name}`}
                    onClick={(e) => {
                      e.preventDefault()
                      onDeleteNode(n.id)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(n.id)}
                aria-pressed={active}
                className={cn(
                  'group flex w-full max-w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                  active
                    ? 'border-brand-dark bg-brand-dark font-semibold text-white shadow-sm'
                    : 'border-transparent bg-white/65 text-brand-dark/85 hover:border-brand-dark/15 hover:bg-white',
                )}
              >
                <span className="min-w-0 truncate">{n.name}</span>
                {n.children.length > 0 ? (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                      active
                        ? 'bg-white/15 text-white/75'
                        : 'bg-brand-dark/8 text-brand-dark/45 group-hover:text-brand-dark/70',
                    )}
                  >
                    {n.children.length}
                  </span>
                ) : null}
              </button>
            )}
            {n.children.length > 0 ? (
              <TreeLevel
                nodes={n.children}
                value={value}
                onChange={onChange}
                disabled={disabled}
                depth={depth + 1}
                editable={editable}
                onAddChild={onAddChild}
                onDeleteNode={onDeleteNode}
                deletingNodeId={deletingNodeId}
              />
            ) : null}
          </li>
        )
      })}
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
  editable = false,
  onAddChild,
  onDeleteNode,
  deletingNodeId = null,
}: TaxonomyTreePickerProps) {
  return (
    <nav
      className={cn(
        'max-h-72 overflow-y-auto rounded-xl border border-brand-dark/12 p-2',
        className,
      )}
      aria-label="Kategorier"
    >
      {allowClear ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          className={`mb-2 w-full rounded-lg border px-2.5 py-2 text-left text-sm ${
            value === ''
              ? 'border-brand-dark bg-brand-dark font-semibold text-white'
              : 'border-transparent bg-white/65 text-brand-dark/80 hover:border-brand-dark/15 hover:bg-white'
          }`}
        >
          {clearLabel}
        </button>
      ) : null}
      {nodes.length === 0 ? (
        <p className="px-2 py-3 text-sm text-current/55">
          Inga kategorier ännu.
        </p>
      ) : (
        <TreeLevel
          nodes={nodes}
          value={value}
          onChange={onChange}
          disabled={disabled}
          depth={0}
          editable={editable}
          onAddChild={onAddChild}
          onDeleteNode={onDeleteNode}
          deletingNodeId={deletingNodeId}
        />
      )}
    </nav>
  )
}
