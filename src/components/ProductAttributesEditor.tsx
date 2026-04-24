import {
  ATTRIBUTE_LABEL_SV,
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  NUMBER_ATTRIBUTE_KEYS,
  TEXT_ATTRIBUTE_KEYS,
} from '../../shared/attributes'
import type { ConditionEnumKey } from '../../shared/attributes'
import type { StoredProductAttribute } from '~/lib/editProductForm'

const ROW_KIND_LEGACY = 'legacy'
const ROW_KIND_CONDITION = 'condition'
const ROW_KIND_CUSTOM_TEXT = 'custom_text'
const ROW_KIND_CUSTOM_NUMBER = 'custom_number'

function textKindOptions(): Array<{ value: string; label: string }> {
  return TEXT_ATTRIBUTE_KEYS.map((key) => ({
    value: `text:${key}`,
    label: ATTRIBUTE_LABEL_SV[key],
  }))
}

function numberKindOptions(): Array<{ value: string; label: string }> {
  return NUMBER_ATTRIBUTE_KEYS.map((key) => ({
    value: `number:${key}`,
    label: ATTRIBUTE_LABEL_SV[key],
  }))
}

function defaultAttrForRowKind(kind: string): StoredProductAttribute {
  if (kind === ROW_KIND_LEGACY) {
    return { label: '', value: '' }
  }
  if (kind === ROW_KIND_CONDITION) {
    return {
      key: 'condition',
      type: 'enum',
      enumKey: 'good',
    }
  }
  if (kind === ROW_KIND_CUSTOM_TEXT) {
    return {
      key: 'custom',
      type: 'text',
      customLabelSv: '',
      text: '',
    }
  }
  if (kind === ROW_KIND_CUSTOM_NUMBER) {
    return {
      key: 'custom',
      type: 'number',
      customLabelSv: '',
      value: 0,
    }
  }
  if (kind.startsWith('text:')) {
    const k = kind.slice('text:'.length) as (typeof TEXT_ATTRIBUTE_KEYS)[number]
    return { key: k, type: 'text', text: '' }
  }
  if (kind.startsWith('number:')) {
    const k = kind.slice('number:'.length) as (typeof NUMBER_ATTRIBUTE_KEYS)[number]
    return { key: k, type: 'number', value: 0 }
  }
  return { key: 'brand', type: 'text', text: '' }
}

function inferRowKind(attr: StoredProductAttribute): string {
  if (!('key' in attr)) {
    return ROW_KIND_LEGACY
  }
  if (attr.type === 'enum') {
    return ROW_KIND_CONDITION
  }
  if (attr.key === 'custom' && attr.type === 'text') {
    return ROW_KIND_CUSTOM_TEXT
  }
  if (attr.key === 'custom') {
    return ROW_KIND_CUSTOM_NUMBER
  }
  if (attr.type === 'text') {
    return `text:${attr.key}`
  }
  return `number:${attr.key}`
}

function replaceAt<T>(arr: Array<T>, index: number, item: T): Array<T> {
  const next = [...arr]
  next[index] = item
  return next
}

function removeAt<T>(arr: Array<T>, index: number): Array<T> {
  return arr.filter((_, i) => i !== index)
}

type Props = {
  attributes: Array<StoredProductAttribute>
  onChange: (next: Array<StoredProductAttribute>) => void
  disabled: boolean
  /** Tätare rader för redigeringsvy m.m. */
  density?: 'default' | 'compact'
}

export function ProductAttributesEditor({
  attributes,
  onChange,
  disabled,
  density = 'default',
}: Props) {
  const compact = density === 'compact'
  const gap = compact ? 'gap-2' : 'gap-3'
  const stack = compact ? 'space-y-2' : 'space-y-3'
  const rowPad = compact ? 'p-2' : 'p-3'
  const typeRowClass = compact
    ? 'flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-3'
    : 'flex flex-col gap-2 sm:flex-row sm:items-start'

  const addRow = () => {
    onChange([...attributes, defaultAttrForRowKind('text:brand')])
  }

  return (
    <div className={stack}>
      <div className={`flex flex-wrap items-center justify-between ${gap}`}>
        <p className="text-sm font-medium text-brand-dark">Attribut</p>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabled}
          onClick={addRow}
        >
          Lägg till attribut
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="text-sm text-brand-dark/60">Inga attribut än.</p>
      ) : null}

      <ul className={stack}>
        {attributes.map((attr, index) => {
          const kind = inferRowKind(attr)
          const setRow = (next: StoredProductAttribute) => {
            onChange(replaceAt(attributes, index, next))
          }
          const onKindChange = (newKind: string) => {
            onChange(replaceAt(attributes, index, defaultAttrForRowKind(newKind)))
          }

          return (
            <li
              key={index}
              className={`rounded-lg border border-brand-dark/10 bg-white/80 shadow-sm ${rowPad}`}
            >
              <div className={typeRowClass}>
                <label className="min-w-0 flex-1 text-xs text-brand-dark/70">
                  Typ
                  <select
                    className="mt-0.5 w-full rounded-md border border-brand-dark/15 bg-white px-2 py-1.5 text-sm text-brand-dark"
                    value={kind}
                    disabled={disabled}
                    onChange={(e) => onKindChange(e.target.value)}
                  >
                    <option value={ROW_KIND_LEGACY}>Äldre format (etikett + värde)</option>
                    <optgroup label="Text">
                      {textKindOptions().map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tal">
                      {numberKindOptions().map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    <option value={ROW_KIND_CONDITION}>Skick</option>
                    <option value={ROW_KIND_CUSTOM_TEXT}>Eget (text)</option>
                    <option value={ROW_KIND_CUSTOM_NUMBER}>Eget (tal)</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={`shrink-0 rounded-md border border-brand-dark/15 px-2 py-1 text-xs font-medium text-brand-dark/80 hover:bg-brand-dark/5 disabled:opacity-50 ${compact ? 'md:mt-4' : 'sm:mt-5'}`}
                  disabled={disabled}
                  onClick={() => onChange(removeAt(attributes, index))}
                >
                  Ta bort
                </button>
              </div>

              {!('key' in attr) ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-brand-dark/70">
                    Etikett
                    <input
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.label}
                      disabled={disabled}
                      onChange={(e) =>
                        setRow({ label: e.target.value, value: attr.value })
                      }
                    />
                  </label>
                  <label className="text-xs text-brand-dark/70">
                    Värde
                    <input
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.value}
                      disabled={disabled}
                      onChange={(e) =>
                        setRow({ label: attr.label, value: e.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}

              {'key' in attr && attr.type === 'text' && attr.key !== 'custom' ? (
                <label className="mt-2 block text-xs text-brand-dark/70">
                  Värde
                  <input
                    className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                    value={attr.text}
                    disabled={disabled}
                    onChange={(e) =>
                      setRow({ ...attr, text: e.target.value })
                    }
                  />
                </label>
              ) : null}

              {'key' in attr && attr.type === 'number' && attr.key !== 'custom' ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-brand-dark/70">
                    Värde
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm tabular-nums"
                      value={Number.isFinite(attr.value) ? String(attr.value) : ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.')
                        if (raw === '' || raw === '-') {
                          setRow({ ...attr, value: 0 })
                          return
                        }
                        const n = Number(raw)
                        setRow({
                          ...attr,
                          value: Number.isFinite(n) ? n : attr.value,
                        })
                      }}
                    />
                  </label>
                  <label className="text-xs text-brand-dark/70">
                    Enhet (valfritt)
                    <select
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.unit ?? ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const u = e.target.value
                        setRow({
                          ...attr,
                          ...(u ? { unit: u } : { unit: undefined }),
                        })
                      }}
                    >
                      <option value="">—</option>
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {'key' in attr && attr.type === 'enum' ? (
                <label className="mt-2 block text-xs text-brand-dark/70">
                  Skick
                  <select
                    className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                    value={attr.enumKey}
                    disabled={disabled}
                    onChange={(e) =>
                      setRow({
                        key: 'condition',
                        type: 'enum',
                        enumKey: e.target.value as ConditionEnumKey,
                      })
                    }
                  >
                    {(
                      Object.keys(CONDITION_LABEL_SV) as Array<ConditionEnumKey>
                    ).map(
                      (k) => (
                        <option key={k} value={k}>
                          {CONDITION_LABEL_SV[k]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}

              {'key' in attr &&
              attr.key === 'custom' &&
              attr.type === 'text' ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-brand-dark/70">
                    Etikett
                    <input
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.customLabelSv}
                      disabled={disabled}
                      onChange={(e) =>
                        setRow({ ...attr, customLabelSv: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs text-brand-dark/70">
                    Värde
                    <input
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.text}
                      disabled={disabled}
                      onChange={(e) =>
                        setRow({ ...attr, text: e.target.value })
                      }
                    />
                  </label>
                </div>
              ) : null}

              {'key' in attr &&
              attr.key === 'custom' &&
              attr.type === 'number' ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-brand-dark/70">
                    Etikett
                    <input
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.customLabelSv}
                      disabled={disabled}
                      onChange={(e) =>
                        setRow({ ...attr, customLabelSv: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs text-brand-dark/70">
                    Värde
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm tabular-nums"
                      value={
                        Number.isFinite(attr.value) ? String(attr.value) : ''
                      }
                      disabled={disabled}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.')
                        if (raw === '') {
                          setRow({ ...attr, value: 0 })
                          return
                        }
                        const n = Number(raw)
                        setRow({
                          ...attr,
                          value: Number.isFinite(n) ? n : attr.value,
                        })
                      }}
                    />
                  </label>
                  <label className="text-xs text-brand-dark/70">
                    Enhet
                    <select
                      className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm"
                      value={attr.unit ?? ''}
                      disabled={disabled}
                      onChange={(e) => {
                        const u = e.target.value
                        setRow({
                          ...attr,
                          ...(u ? { unit: u } : { unit: undefined }),
                        })
                      }}
                    >
                      <option value="">—</option>
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
