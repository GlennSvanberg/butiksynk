import {
  ATTRIBUTE_LABEL_SV,
  COMMON_UNITS,
  CONDITION_LABEL_SV,
  NUMBER_ATTRIBUTE_KEYS,
  TEXT_ATTRIBUTE_KEYS,
} from '../../shared/attributes'
import type {
  ConditionEnumKey,
  NumberAttributeKey,
  TextAttributeKey,
} from '../../shared/attributes'
import type { StoredProductAttribute } from '~/lib/editProductForm'

const ROW_KIND_LEGACY = 'legacy'
const ROW_KIND_CONDITION = 'condition'
const ROW_KIND_CUSTOM_TEXT = 'custom_text'
const ROW_KIND_CUSTOM_NUMBER = 'custom_number'
const FEATURED_TEXT_KEYS = ['brand', 'size', 'color', 'material'] as const
const FEATURED_NUMBER_KEYS = ['dimensions'] as const

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
    const k = kind.slice(
      'number:'.length,
    ) as (typeof NUMBER_ATTRIBUTE_KEYS)[number]
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

function isFeaturedTextKey(
  key: string,
): key is (typeof FEATURED_TEXT_KEYS)[number] {
  return FEATURED_TEXT_KEYS.some((featuredKey) => featuredKey === key)
}

function isFeaturedNumberKey(
  key: string,
): key is (typeof FEATURED_NUMBER_KEYS)[number] {
  return FEATURED_NUMBER_KEYS.some((featuredKey) => featuredKey === key)
}

function attributeSummary(attr: StoredProductAttribute): string {
  if (!('key' in attr)) {
    return attr.value
  }
  if (attr.type === 'enum') {
    return CONDITION_LABEL_SV[attr.enumKey]
  }
  if (attr.type === 'text') {
    return attr.text
  }
  return `${attr.value}${attr.unit ? ` ${attr.unit}` : ''}`
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
    onChange([...attributes, defaultAttrForRowKind(ROW_KIND_CUSTOM_TEXT)])
  }

  const findTextIndex = (key: TextAttributeKey) =>
    attributes.findIndex((attr) => 'key' in attr && attr.key === key)

  const setTextValue = (key: TextAttributeKey, text: string) => {
    const index = findTextIndex(key)
    if (text.trim() === '') {
      if (index >= 0) {
        onChange(removeAt(attributes, index))
      }
      return
    }
    const nextAttr: StoredProductAttribute = { key, type: 'text', text }
    onChange(
      index >= 0
        ? replaceAt(attributes, index, nextAttr)
        : [...attributes, nextAttr],
    )
  }

  const findNumberIndex = (key: NumberAttributeKey) =>
    attributes.findIndex((attr) => 'key' in attr && attr.key === key)

  const setNumberValue = (key: NumberAttributeKey, raw: string) => {
    const index = findNumberIndex(key)
    if (raw.trim() === '') {
      if (index >= 0) {
        onChange(removeAt(attributes, index))
      }
      return
    }
    const n = Number(raw.replace(',', '.'))
    if (!Number.isFinite(n)) {
      return
    }
    const current =
      index >= 0 && 'key' in attributes[index] ? attributes[index] : null
    const nextAttr: StoredProductAttribute = {
      key,
      type: 'number',
      value: n,
      ...(current &&
      'unit' in current &&
      typeof current.unit === 'string' &&
      current.unit
        ? { unit: current.unit }
        : {}),
    }
    onChange(
      index >= 0
        ? replaceAt(attributes, index, nextAttr)
        : [...attributes, nextAttr],
    )
  }

  const setNumberUnit = (key: NumberAttributeKey, unit: string) => {
    const index = findNumberIndex(key)
    const current =
      index >= 0 && 'key' in attributes[index] ? attributes[index] : null
    const value =
      current && 'value' in current && Number.isFinite(current.value)
        ? current.value
        : 0
    const nextAttr: StoredProductAttribute = {
      key,
      type: 'number',
      value,
      ...(unit ? { unit } : {}),
    }
    onChange(
      index >= 0
        ? replaceAt(attributes, index, nextAttr)
        : [...attributes, nextAttr],
    )
  }

  const conditionIndex = attributes.findIndex(
    (attr) => 'key' in attr && attr.type === 'enum',
  )
  const condition =
    conditionIndex >= 0 && 'key' in attributes[conditionIndex]
      ? attributes[conditionIndex]
      : null

  const setCondition = (enumKey: string) => {
    if (!enumKey) {
      if (conditionIndex >= 0) {
        onChange(removeAt(attributes, conditionIndex))
      }
      return
    }
    const nextAttr: StoredProductAttribute = {
      key: 'condition',
      type: 'enum',
      enumKey: enumKey as ConditionEnumKey,
    }
    onChange(
      conditionIndex >= 0
        ? replaceAt(attributes, conditionIndex, nextAttr)
        : [...attributes, nextAttr],
    )
  }

  const featuredIndexes = new Set<number>()
  attributes.forEach((attr, index) => {
    if (!('key' in attr)) {
      return
    }
    if (attr.type === 'enum') {
      featuredIndexes.add(index)
      return
    }
    if (attr.type === 'text' && isFeaturedTextKey(attr.key)) {
      featuredIndexes.add(index)
      return
    }
    if (attr.type === 'number' && isFeaturedNumberKey(attr.key)) {
      featuredIndexes.add(index)
    }
  })
  const extraRows = attributes
    .map((attr, index) => ({ attr, index }))
    .filter((row) => !featuredIndexes.has(row.index))

  return (
    <div className={stack}>
      <div className={`flex flex-wrap items-center justify-between ${gap}`}>
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
            Attribut
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold text-brand-dark">
            Detaljer som går att skanna
          </h2>
        </div>
        <button
          type="button"
          className="rounded-lg border border-brand-dark/20 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
          disabled={disabled}
          onClick={addRow}
        >
          Lägg till extra attribut
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {FEATURED_TEXT_KEYS.map((key) => {
          const index = findTextIndex(key)
          const attr = index >= 0 ? attributes[index] : null
          const value =
            attr && 'key' in attr && attr.type === 'text' ? attr.text : ''
          return (
            <label
              key={key}
              className="rounded-xl border border-brand-dark/10 bg-brand-bg/65 p-3 text-xs font-semibold uppercase tracking-wide text-brand-dark/70"
            >
              {ATTRIBUTE_LABEL_SV[key]}
              <input
                className="mt-1.5 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-brand-dark shadow-inner shadow-brand-dark/[0.02] focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5"
                value={value}
                disabled={disabled}
                placeholder={`Ange ${ATTRIBUTE_LABEL_SV[key].toLowerCase()}`}
                onChange={(e) => setTextValue(key, e.target.value)}
              />
            </label>
          )
        })}
        <label className="rounded-xl border border-brand-dark/10 bg-brand-bg/65 p-3 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
          Skick
          <select
            className="mt-1.5 w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-brand-dark shadow-inner shadow-brand-dark/[0.02] focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5"
            value={
              condition && 'key' in condition && condition.type === 'enum'
                ? condition.enumKey
                : ''
            }
            disabled={disabled}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">Ej angivet</option>
            {(Object.keys(CONDITION_LABEL_SV) as Array<ConditionEnumKey>).map(
              (k) => (
                <option key={k} value={k}>
                  {CONDITION_LABEL_SV[k]}
                </option>
              ),
            )}
          </select>
        </label>
        {FEATURED_NUMBER_KEYS.map((key) => {
          const index = findNumberIndex(key)
          const attr = index >= 0 ? attributes[index] : null
          const value =
            attr && 'key' in attr && attr.type === 'number'
              ? String(attr.value)
              : ''
          const unit =
            attr && 'key' in attr && attr.type === 'number'
              ? (attr.unit ?? '')
              : ''
          return (
            <div
              key={key}
              className="rounded-xl border border-brand-dark/10 bg-brand-bg/65 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                {ATTRIBUTE_LABEL_SV[key]}
              </p>
              <div className="mt-1.5 grid grid-cols-[1fr_6rem] gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-brand-dark/15 bg-white px-3 py-2 text-sm text-brand-dark shadow-inner shadow-brand-dark/[0.02] focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5"
                  value={value}
                  disabled={disabled}
                  placeholder="Värde"
                  onChange={(e) => setNumberValue(key, e.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-brand-dark/15 bg-white px-2 py-2 text-sm text-brand-dark shadow-inner shadow-brand-dark/[0.02] focus:border-brand-dark/40 focus:outline-none focus:ring-2 focus:ring-brand-dark/10 disabled:bg-brand-dark/5"
                  value={unit}
                  disabled={disabled}
                  onChange={(e) => setNumberUnit(key, e.target.value)}
                >
                  <option value="">—</option>
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {attributes.length === 0 ? (
          <span className="rounded-full border border-brand-dark/10 bg-white px-3 py-1 font-mono text-[11px] text-brand-dark/50">
            Inga sparade attribut än
          </span>
        ) : (
          attributes.map((attr, index) => (
            <span
              key={index}
              className="rounded-full border border-brand-dark/10 bg-white px-3 py-1 font-mono text-[11px] text-brand-dark/65"
            >
              {attributeSummary(attr) || 'Tomt'}
            </span>
          ))
        )}
      </div>

      {extraRows.length === 0 ? null : (
        <div className="rounded-xl border border-brand-dark/10 bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/65">
            Extra attribut
          </p>
          <ul className={`mt-3 ${stack}`}>
            {extraRows.map(({ attr, index }) => {
              const kind = inferRowKind(attr)
              const setRow = (next: StoredProductAttribute) => {
                onChange(replaceAt(attributes, index, next))
              }
              const onKindChange = (newKind: string) => {
                onChange(
                  replaceAt(attributes, index, defaultAttrForRowKind(newKind)),
                )
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
                        <option value={ROW_KIND_LEGACY}>
                          Äldre format (etikett + värde)
                        </option>
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
                        <option value={ROW_KIND_CUSTOM_TEXT}>
                          Eget (text)
                        </option>
                        <option value={ROW_KIND_CUSTOM_NUMBER}>
                          Eget (tal)
                        </option>
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

                  {'key' in attr &&
                  attr.type === 'text' &&
                  attr.key !== 'custom' ? (
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

                  {'key' in attr &&
                  attr.type === 'number' &&
                  attr.key !== 'custom' ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-brand-dark/70">
                        Värde
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mt-0.5 w-full rounded-md border border-brand-dark/15 px-2 py-1.5 text-sm tabular-nums"
                          value={
                            Number.isFinite(attr.value)
                              ? String(attr.value)
                              : ''
                          }
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
                          Object.keys(
                            CONDITION_LABEL_SV,
                          ) as Array<ConditionEnumKey>
                        ).map((k) => (
                          <option key={k} value={k}>
                            {CONDITION_LABEL_SV[k]}
                          </option>
                        ))}
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
                            Number.isFinite(attr.value)
                              ? String(attr.value)
                              : ''
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
      )}
    </div>
  )
}
