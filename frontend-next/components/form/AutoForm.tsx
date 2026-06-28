"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { z } from "zod"
import { Loader2, Search, X } from "lucide-react"

import { apiFetch, apiFetchList } from "@/lib/api"
import { buildFormSpec, FormField } from "@/lib/openapi/formBuilder"
import Etapas from "@/components/form/Etapas"
import useDebounce from "@/hooks/useDebounce"
import type { ResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { normalizeFormApiErrors } from "@/lib/resources/formErrors"
import {
  relationOptionFromRow,
  relationOptionsFromRows,
  relationTargetForField,
  type RelationOption,
  type RelationTarget,
} from "@/lib/resources/relationOptions"
import { fieldLabel, isInternalField } from "@/lib/ui/fieldLabels"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

type Method = "post" | "put" | "patch"
type RuntimeFormSpec = {
  fields: FormField[]
  submitFields: FormField[]
}

export type AutoFormProps = {
  endpoint: string
  method: Method
  submitLabel?: string
  initialValues?: Record<string, any>
  onSuccess?: (data: any) => void
  config?: ResourceFormConfig | null
  presentation?: "default" | "modern-nursing"
  compactFields?: string[]
}

const LONG_TEXT_FIELDS = new Set([
  "body",
  "content_text",
  "submission_payload",
  "teacher_feedback",
  "instructions",
  "notes",
  "findings",
  "actions_taken",
  "indication",
  "description",
  "reason",
  "feedback",
  "reaction_notes",
  "post_incident_actions",
])

const EMPTY_RELATION_OPTIONS: RelationOption[] = []

const RUNTIME_READONLY_FIELDS = new Set([
  // Calculado no backend (soma dos preços dos exames do painel) — nunca editável.
  "package_price",
  "id",
  "id_custom",
  "tenant",
  "tenant_id",
  "inquilino",
  "criado_por",
  "atualizado_por",
  "criado_em",
  "atualizado_em",
  "deletado",
  "deletado_em",
  "deletado_por",
  "versao",
  "created_at",
  "updated_at",
  "custom_id",
  "deleted",
  "deleted_at",
  "version",
  "created_by",
  "updated_by",
  "deleted_by",
])

function isForcedReadOnlyFormField(name: string): boolean {
  const key = String(name || "")
  return RUNTIME_READONLY_FIELDS.has(key) || isInternalField(key)
}

function shouldUseRelationField(field: FormField, endpoint: string): boolean {
  if (!relationTargetForField(field.name, endpoint)) return false
  return (
    field.type === "integer" ||
    field.type === "number" ||
    field.type === "select" ||
    field.type === "array-relation"
  )
}

function normalizeRuntimeRelationField(field: FormField, endpoint: string): FormField {
  if (!shouldUseRelationField(field, endpoint)) return field
  // M2M permanece array-relation (seletor de múltiplos); FK escalar vira integer.
  if (field.type === "array-relation") {
    return { ...field, enumValues: undefined, enumLabels: undefined }
  }
  return {
    ...field,
    type: "integer",
    enumValues: undefined,
    enumLabels: undefined,
  }
}

function normalizeRuntimeFormSpec(spec: RuntimeFormSpec | null, endpoint: string): RuntimeFormSpec | null {
  if (!spec) return null
  const fields = spec.fields.map((field) => normalizeRuntimeRelationField(field, endpoint))
  const submitFields = fields.filter((field) => !field.readOnly)
  return { fields, submitFields }
}

function placeholderForField(field: FormField, label: string, explicit?: string): string | undefined {
  if (explicit) return explicit
  if (field.type === "boolean" || field.type === "date" || field.type === "datetime" || field.type === "select") {
    return undefined
  }
  if (field.type === "array-string") return "Ex.: valor 1, valor 2"

  const name = field.name.toLowerCase()
  if (name.includes("url")) return "https://..."
  if (name.includes("email")) return "nome@exemplo.com"
  if (name.includes("phone") || name.includes("telefone") || name.includes("contact")) return "Ex.: +258 84 000 0000"
  if (name.includes("code") || name.includes("codigo")) return "Ex.: COD-001"
  if (field.type === "integer" || field.type === "number") return "Ex.: 10"

  const normalizedLabel = label.trim().toLocaleLowerCase("pt")
  return normalizedLabel ? `Introduza ${normalizedLabel}` : "Introduza o valor"
}

function uniqueRelationOptions(options: RelationOption[]): RelationOption[] {
  const seen = new Set<string>()
  const unique: RelationOption[] = []
  for (const option of options) {
    if (seen.has(option.value)) continue
    seen.add(option.value)
    unique.push(option)
  }
  return unique
}

function fallbackSelectedRelationOption(value: any, target: RelationTarget): RelationOption | null {
  const selectedId = relationIdFromValue(value)
  if (!selectedId) return null

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const option = relationOptionFromRow(value, target)
    if (option) return option
  }

  return {
    value: selectedId,
    label: "Registo selecionado",
  }
}

export function SearchableRelationSelect({
  fieldName,
  value,
  onChange,
  target,
  initialOptions,
  loadingInitial,
  readOnly,
  error,
  placeholder,
  safeRefreshToken,
}: {
  fieldName: string
  value: any
  onChange: (v: any) => void
  target: RelationTarget
  initialOptions?: RelationOption[]
  loadingInitial?: boolean
  readOnly?: boolean
  error?: string
  placeholder?: string
  safeRefreshToken?: number
}) {
  const knownOptions = initialOptions || EMPTY_RELATION_OPTIONS
  const selectedId = relationIdFromValue(value)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<RelationOption[]>(EMPTY_RELATION_OPTIONS)
  const [searching, setSearching] = useState(false)
  const [lastSelectedOption, setLastSelectedOption] = useState<RelationOption | null>(
    initialOptions?.find((o) => o.value === selectedId) ?? null
  )
  const listboxId = useId()
  const debouncedQuery = useDebounce(query.trim(), 250)

  const selectedOption = useMemo(() => {
    if (!selectedId) return null
    const fromKnown = knownOptions.find((option) => option.value === selectedId)
    if (fromKnown) return fromKnown
    const fromResults = results.find((option) => option.value === selectedId)
    if (fromResults) return fromResults
    if (lastSelectedOption?.value === selectedId) return lastSelectedOption
    return fallbackSelectedRelationOption(value, target)
  }, [knownOptions, results, selectedId, target, value, lastSelectedOption])

  useEffect(() => {
    if (open) return
    // Use lastSelectedOption label as source of truth to avoid showing fallback text
    const label = lastSelectedOption?.value === selectedId
      ? lastSelectedOption.label
      : selectedOption?.label || ""
    setQuery(label)
  }, [open, selectedOption?.label, lastSelectedOption, selectedId])

  useEffect(() => {
    if (!open) return

    let active = true
    async function searchRelationOptions() {
      const searchText = debouncedQuery.trim()
      if (!searchText) {
        setResults(knownOptions.slice(0, 25))
        setSearching(false)
        return
      }

      setSearching(true)
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1,
          pageSize: 25,
          query: { ...(target.staticFilters ?? {}), search: searchText },
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
        })
        if (active) setResults(relationOptionsFromRows(items, target))
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setSearching(false)
      }
    }

    searchRelationOptions().catch(() => {
      if (active) setSearching(false)
    })

    return () => {
      active = false
    }
  }, [debouncedQuery, knownOptions, open, safeRefreshToken, target])

  const options = useMemo(() => {
    const base = debouncedQuery ? results : knownOptions
    return uniqueRelationOptions(mergeSelectedRelationOption(base, selectedOption)).slice(0, 25)
  }, [debouncedQuery, knownOptions, results, selectedOption])

  const common =
    "min-h-11 w-full rounded-md border bg-[var(--card)] px-3 py-2 text-base leading-tight text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] disabled:cursor-not-allowed disabled:bg-[var(--gray-100)] disabled:text-[var(--gray-500)] sm:text-sm"
  const stateClass = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-[var(--border)]"
  const disabled = !!readOnly

  function handleInputChange(next: string) {
    setQuery(next)
    setOpen(true)
    if (selectedId && next !== selectedOption?.label) {
      onChange(null)
    }
  }

  function selectOption(option: RelationOption) {
    setLastSelectedOption(option)
    setQuery(option.label)
    setOpen(false)
    onChange(Number(option.value))
  }

  function clearSelection() {
    setQuery("")
    setResults(knownOptions.slice(0, 25))
    setOpen(false)
    onChange(null)
  }

  const showEmptyState = open && !searching && !loadingInitial && options.length === 0

  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]"
      />
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={!!error}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false)
        }}
        className={`${common} ${stateClass} pl-9 pr-10`}
        placeholder={placeholder || "Pesquisar pelo nome, código ou referência..."}
        disabled={disabled}
      />
      {selectedId || query ? (
        <button
          type="button"
          aria-label="Limpar seleção"
          title="Limpar seleção"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearSelection}
          disabled={disabled}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--gray-500)] transition hover:bg-[var(--gray-100)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      {open && !disabled ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-lg"
        >
          {searching || loadingInitial ? (
            <div className="flex items-center gap-2 px-3 py-2 text-[var(--gray-600)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              A pesquisar...
            </div>
          ) : null}
          {!searching &&
            options.map((option) => (
              <button
                key={`${fieldName}-${option.value}`}
                type="button"
                role="option"
                aria-selected={option.value === selectedId}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className="block w-full px-3 py-2 text-left text-[var(--text)] transition hover:bg-[var(--gray-100)] focus:bg-[var(--gray-100)] focus:outline-none"
              >
                {option.label}
              </button>
            ))}
          {showEmptyState ? (
            <div className="px-3 py-2 text-[var(--gray-500)]">
              {debouncedQuery ? "Nenhum registo encontrado." : "Digite para pesquisar."}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function SearchableMultiSelect({
  fieldName,
  value,
  onChange,
  target,
  initialOptions,
  readOnly,
  error,
  placeholder,
  safeRefreshToken,
}: {
  fieldName: string
  value: any
  onChange: (v: number[]) => void
  target: RelationTarget
  initialOptions?: RelationOption[]
  readOnly?: boolean
  error?: string
  placeholder?: string
  safeRefreshToken?: number
}) {
  const selectedIds = useMemo(
    () => (Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : []),
    [value]
  )
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<RelationOption[]>(EMPTY_RELATION_OPTIONS)
  const [searching, setSearching] = useState(false)
  const [labelById, setLabelById] = useState<Record<string, string>>({})
  const listboxId = useId()
  const debouncedQuery = useDebounce(query.trim(), 250)
  const disabled = !!readOnly

  // Semeia rótulos a partir das opções iniciais (modo edição).
  useEffect(() => {
    if (!initialOptions?.length) return
    setLabelById((current) => {
      const next = { ...current }
      for (const option of initialOptions) {
        if (!next[option.value]) next[option.value] = option.label
      }
      return next
    })
  }, [initialOptions])

  useEffect(() => {
    if (!open) return
    let active = true
    async function searchRelationOptions() {
      const searchText = debouncedQuery.trim()
      setSearching(true)
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1,
          pageSize: 25,
          query: { ...(target.staticFilters ?? {}), ...(searchText ? { search: searchText } : {}) },
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
        })
        if (active) {
          const options = relationOptionsFromRows(items, target)
          setResults(options)
          setLabelById((current) => {
            const next = { ...current }
            for (const option of options) next[option.value] = option.label
            return next
          })
        }
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setSearching(false)
      }
    }
    searchRelationOptions().catch(() => {
      if (active) setSearching(false)
    })
    return () => {
      active = false
    }
  }, [debouncedQuery, open, safeRefreshToken, target])

  const available = useMemo(
    () => uniqueRelationOptions(results).filter((option) => !selectedIds.includes(option.value)).slice(0, 25),
    [results, selectedIds]
  )

  function addOption(option: RelationOption) {
    setLabelById((current) => ({ ...current, [option.value]: option.label }))
    if (!selectedIds.includes(option.value)) {
      onChange([...selectedIds, option.value].map(Number))
    }
    setQuery("")
  }

  function removeId(id: string) {
    onChange(selectedIds.filter((selected) => selected !== id).map(Number))
  }

  const common =
    "min-h-11 w-full rounded-md border bg-[var(--card)] px-3 py-2 text-base leading-tight text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] disabled:cursor-not-allowed disabled:bg-[var(--gray-100)] disabled:text-[var(--gray-500)] sm:text-sm"
  const stateClass = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-[var(--border)]"
  const showEmptyState = open && !searching && available.length === 0

  return (
    <div>
      {selectedIds.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={`${fieldName}-chip-${id}`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-300)] bg-[var(--primary-300)]/30 px-2.5 py-1 text-xs font-medium text-[var(--text)]"
            >
              {labelById[id] || `#${id}`}
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Remover ${labelById[id] || id}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeId(id)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--gray-600)] transition hover:bg-[var(--gray-200)] hover:text-[var(--text)]"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray-400)]"
        />
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-invalid={!!error}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false)
          }}
          className={`${common} ${stateClass} pl-9`}
          placeholder={placeholder || "Pesquisar e adicionar..."}
          disabled={disabled}
        />
        {open && !disabled ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-lg"
          >
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[var(--gray-600)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                A pesquisar...
              </div>
            ) : null}
            {!searching &&
              available.map((option) => (
                <button
                  key={`${fieldName}-opt-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addOption(option)}
                  className="block w-full px-3 py-2 text-left text-[var(--text)] transition hover:bg-[var(--gray-100)] focus:bg-[var(--gray-100)] focus:outline-none"
                >
                  {option.label}
                </button>
              ))}
            {showEmptyState ? (
              <div className="px-3 py-2 text-[var(--gray-500)]">
                {debouncedQuery ? "Nenhum registo encontrado." : "Digite para pesquisar."}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function fieldToZod(field: FormField): z.ZodTypeAny {
  const required = field.required
  let base: z.ZodTypeAny
  switch (field.type) {
    case "boolean":
      base = z.boolean()
      break
    case "integer":
      base = z
        .number()
        .int("Deve ser inteiro")
      break
    case "number":
      base = z.number()
      break
    case "date":
    case "datetime":
      base = required ? z.string().trim().min(1, "Campo obrigatório") : z.string()
      break
    case "select":
      {
        const enumValues = (field.enumValues || []).map(String).filter(Boolean)
        base =
          enumValues.length > 0
            ? z.enum(enumValues as [string, ...string[]])
            : z.string()
      }
      break
    case "array-string":
      base = required ? z.array(z.string()).min(1, "Informe pelo menos um valor") : z.array(z.string())
      break
    case "array-relation":
      base = required
        ? z.array(z.number()).min(1, "Selecione pelo menos um")
        : z.array(z.number())
      break
    default:
      base = required ? z.string().trim().min(1, "Campo obrigatório") : z.string()
  }
  return required ? base : base.optional().nullable()
}

function renderInput(
  field: FormField,
  value: any,
  onChange: (v: any) => void,
  error?: string,
  opts?: {
    readOnly?: boolean
    placeholder?: string
    translate?: (value: string) => string
    widget?: "textarea"
    relationOptions?: RelationOption[]
    relationLoading?: boolean
    relationTarget?: RelationTarget
    safeRefreshToken?: number
  }
) {
  const common =
    "min-h-11 w-full rounded-md border bg-[var(--card)] px-3 py-2 text-base leading-tight text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] disabled:cursor-not-allowed disabled:bg-[var(--gray-100)] disabled:text-[var(--gray-500)] sm:text-sm"
  const stateClass = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-[var(--border)]"
  const disabled = !!opts?.readOnly
  const placeholder = opts?.placeholder
  const widget = opts?.widget

  if (opts?.relationTarget) {
    if (field.type === "array-relation") {
      return (
        <SearchableMultiSelect
          fieldName={field.name}
          value={value}
          onChange={onChange}
          target={opts.relationTarget}
          initialOptions={opts.relationOptions}
          readOnly={disabled}
          error={error}
          placeholder={placeholder}
          safeRefreshToken={opts.safeRefreshToken}
        />
      )
    }
    return (
      <SearchableRelationSelect
        fieldName={field.name}
        value={value}
        onChange={onChange}
        target={opts.relationTarget}
        initialOptions={opts.relationOptions}
        loadingInitial={opts.relationLoading}
        readOnly={disabled}
        error={error}
        placeholder={placeholder}
        safeRefreshToken={opts.safeRefreshToken}
      />
    )
  }

  switch (field.type) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4"
          disabled={disabled}
        />
      )
    case "integer":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={`${common} ${stateClass}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={`${common} ${stateClass}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
    case "date":
      return (
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${common} ${stateClass}`}
          disabled={disabled}
        />
      )
    case "datetime":
      return (
        <input
          type="datetime-local"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${common} ${stateClass}`}
          disabled={disabled}
        />
      )
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={`${common} ${stateClass}`}
          disabled={disabled}
        >
          <option value="">Selecione uma opção...</option>
          {(field.enumValues || []).map((opt, idx) => {
            const rawLabel = field.enumLabels?.[idx] || opt
            const label = opts?.translate ? opts.translate(String(rawLabel)) : rawLabel
            return (
              <option key={opt} value={opt}>
                {label}
              </option>
            )
          })}
        </select>
      )
    case "array-string":
      return (
        <input
          type="text"
          value={Array.isArray(value) ? value.join(",") : ""}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            )
          }
          className={`${common} ${stateClass}`}
          placeholder={placeholder || "valor1, valor2"}
          disabled={disabled}
        />
      )
    default:
      if (widget === "textarea") {
        return (
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${common} ${stateClass} min-h-[108px] resize-y`}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
          />
        )
      }
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${common} ${stateClass}`}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
  }
}

function inferFormFieldTypeFromMetadata(rawType?: string): FormField["type"] {
  const t = String(rawType || "").toLocaleLowerCase()
  if (t === "boolean") return "boolean"
  if (t === "integer") return "integer"
  if (t === "decimal" || t === "float" || t === "number") return "number"
  if (t === "date") return "date"
  if (t === "datetime") return "datetime"
  if (t === "choice") return "select"
  if (t === "list") return "array-string"
  return "text"
}

function metadataLooksLikeRelation(rawType?: string): boolean {
  const t = String(rawType || "").toLocaleLowerCase()
  return t === "field" || t === "related" || t === "primarykeyrelatedfield"
}

function buildFallbackSpecFromOptions(metadata: any, method: Method, endpoint: string): RuntimeFormSpec | null {
  const actions = metadata && typeof metadata === "object" ? metadata.actions : null
  if (!actions || typeof actions !== "object") return null

  const methodKey = method.toUpperCase()
  const actionSpec =
    (actions as Record<string, any>)[methodKey] ||
    (actions as Record<string, any>)[method] ||
    (actions as Record<string, any>)[method.toLocaleLowerCase()]

  if (!actionSpec || typeof actionSpec !== "object") return null

  const fields: FormField[] = []

  for (const [name, descRaw] of Object.entries(actionSpec)) {
    const desc = descRaw && typeof descRaw === "object" ? (descRaw as Record<string, any>) : {}
    const choices = Array.isArray(desc.choices) ? desc.choices : []
    const enumValues = choices
      .map((choice) => (choice && typeof choice === "object" ? choice.value : undefined))
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value))
    const enumLabels = choices
      .map((choice) =>
        choice && typeof choice === "object"
          ? String(choice.display_name ?? choice.value ?? "")
          : ""
      )
      .filter(Boolean)

    const rawType = String(desc.type || "")
    const relationTarget = relationTargetForField(name, endpoint)
    const isMultipleRelation = relationTarget != null && desc.multiple === true
    const type: FormField["type"] = isMultipleRelation
      ? "array-relation"
      : relationTarget && (metadataLooksLikeRelation(rawType) || enumValues.length)
        ? "integer"
        : enumValues.length
          ? "select"
          : inferFormFieldTypeFromMetadata(rawType)

    const label = fieldLabel({
      endpoint,
      name,
      title: typeof desc.label === "string" && desc.label.trim() ? desc.label.trim() : undefined,
    })

    fields.push({
      name,
      label,
      required: !!desc.required,
      readOnly: isForcedReadOnlyFormField(name) || !!desc.read_only,
      type,
      enumValues: type === "select" && enumValues.length ? enumValues : undefined,
      enumLabels: type === "select" && enumLabels.length ? enumLabels : undefined,
    })
  }

  if (!fields.length) return null
  const submitFields = fields.filter((field) => !field.readOnly)
  return { fields, submitFields }
}

function mergeSpecs(
  schemaSpec: RuntimeFormSpec | null,
  optionsSpec: RuntimeFormSpec | null,
  endpoint = ""
): RuntimeFormSpec | null {
  if (!schemaSpec && !optionsSpec) return null
  if (!schemaSpec) return normalizeRuntimeFormSpec(optionsSpec, endpoint)
  if (!optionsSpec) return normalizeRuntimeFormSpec(schemaSpec, endpoint)

  const byName = new Map<string, FormField>()
  for (const field of schemaSpec.fields) {
    byName.set(field.name, normalizeRuntimeRelationField({ ...field }, endpoint))
  }

  for (const source of optionsSpec.fields) {
    const current = byName.get(source.name)
    if (!current) {
      byName.set(source.name, normalizeRuntimeRelationField({
        ...source,
        readOnly: isForcedReadOnlyFormField(source.name) || source.readOnly,
      }, endpoint))
      continue
    }

    const merged: FormField = {
      ...current,
      required: source.required || current.required,
      readOnly:
        isForcedReadOnlyFormField(source.name) ||
        Boolean(source.readOnly) ||
        Boolean(current.readOnly),
    }

    if (source.type === "select" && source.enumValues?.length) {
      merged.type = "select"
      merged.enumValues = source.enumValues
      merged.enumLabels = source.enumLabels?.length ? source.enumLabels : source.enumValues
    } else if (current.type === "text" && source.type !== "text") {
      // OPTIONS fornece tipos mais precisos quando o schema é genérico.
      merged.type = source.type
    }

    byName.set(source.name, normalizeRuntimeRelationField(merged, endpoint))
  }

  const fields = Array.from(byName.values())
  const submitFields = fields.filter((field) => !field.readOnly)
  return { fields, submitFields }
}

function normalizeDraftKey(method: Method, endpoint: string): string {
  const e = String(endpoint || "").split("?")[0].split("#")[0]
  return `draft:autofrm:${method}:${e}`
}

function hasRequiredValue(value: any): boolean {
  if (Array.isArray(value)) return value.some((item) => String(item ?? "").trim() !== "")
  if (typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (value === null || value === undefined) return false
  return String(value).trim() !== ""
}

function visibleFormFields(formSpec: RuntimeFormSpec | null, config?: ResourceFormConfig | null): FormField[] {
  if (!formSpec) return []
  const esconder = new Set(config?.esconderCampos || [])
  let fields = formSpec.fields.filter((f) => {
    if (f.readOnly || isForcedReadOnlyFormField(f.name)) return false
    const requiredWritable = f.required && !f.readOnly && !isForcedReadOnlyFormField(f.name)
    if (esconder.has(f.name) && !requiredWritable) return false
    return true
  })

  const order = config?.ordenarCampos || []
  if (order.length) {
    const pos = new Map<string, number>()
    order.forEach((n, i) => pos.set(n, i))
    fields = fields.slice().sort((a, b) => {
      const pa = pos.has(a.name) ? (pos.get(a.name) as number) : 9999
      const pb = pos.has(b.name) ? (pos.get(b.name) as number) : 9999
      if (pa !== pb) return pa - pb
      return a.label.localeCompare(b.label, "pt")
    })
  }

  return fields
}

function conditionVisible(
  fieldName: string,
  values: Record<string, any>,
  config?: ResourceFormConfig | null
): boolean {
  const rule = config?.mostrarSe?.[fieldName]
  if (!rule) return true
  const expected = rule.igualA === undefined ? true : rule.igualA
  return values[rule.campo] === expected
}

function safeFieldSelector(fieldName: string): string {
  return fieldName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function relationIdFromValue(value: any): string | null {
  // Many-to-many (array) values are not a single related id: collapsing them
  // with String([...]) would yield "1,2,3" and, when used to build a detail
  // URL, request `/endpoint/1%2C2%2C3/` (404). Those fields resolve their
  // labels through the list/multi-select instead.
  if (Array.isArray(value)) return null
  const raw =
    value && typeof value === "object"
      ? value.id ?? value.pk
      : value
  if (raw === undefined || raw === null || raw === "") return null
  if (typeof raw === "number" && !Number.isFinite(raw)) return null
  return String(raw)
}

function relationDetailEndpoint(target: RelationTarget, id: string): string {
  const base = target.endpoint.split("?")[0].replace(/\/?$/, "/")
  return `${base}${encodeURIComponent(id)}/`
}

function mergeSelectedRelationOption(
  options: RelationOption[],
  selected: RelationOption | null
): RelationOption[] {
  if (!selected) return options
  if (options.some((option) => option.value === selected.value)) return options
  return [selected, ...options]
}

type WizardStep = { key: string; title: string; description?: string }

function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: WizardStep[]
  current: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="font-display text-sm font-semibold text-foreground">
          Etapa {current + 1} de {steps.length}: {steps[current]?.title}
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((s, idx) => {
            const active = idx === current
            const done = idx < current
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => (idx <= current ? onSelect(idx) : null)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-[var(--primary-500)] bg-[var(--primary-600)] text-white"
                    : done
                      ? "border-border bg-muted text-foreground"
                      : "border-border bg-card text-muted-foreground",
                ].join(" ")}
                disabled={idx > current}
              >
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    active ? "bg-white/20 text-white" : "bg-muted text-foreground",
                  ].join(" ")}
                >
                  {idx + 1}
                </span>
                {s.title}
              </button>
            )
          })}
        </div>
      </div>
      {steps[current]?.description ? (
        <div className="mt-2 text-xs text-muted-foreground">{steps[current].description}</div>
      ) : null}
    </div>
  )
}

export default function AutoForm({
  endpoint,
  method,
  submitLabel = "Salvar",
  initialValues = {},
  onSuccess,
  config,
  presentation = "default",
  compactFields = [],
}: AutoFormProps) {
  const { tr } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const compactFieldNames = useMemo(() => new Set(compactFields), [compactFields])
  const modernNursingProcedureFlow = presentation === "modern-nursing" || /^\/nursing\/procedure(?:\/[^/]+)?$/.test(
    String(endpoint || "").split("?")[0].replace(/\/+$/, "")
  )
  const effectiveMethod = useMemo<Method>(() => {
    if (buildFormSpec(endpoint, method)) return method
    if (method === "put" && buildFormSpec(endpoint, "patch")) return "patch"
    return method
  }, [endpoint, method])

  const schemaFormSpec = useMemo(
    () => buildFormSpec(endpoint, effectiveMethod),
    [endpoint, effectiveMethod]
  )
  const [optionsFormSpec, setOptionsFormSpec] = useState<RuntimeFormSpec | null>(null)
  const [loadingOptionsSpec, setLoadingOptionsSpec] = useState(false)
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({})
  const [loadingRelationFields, setLoadingRelationFields] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const etapas = config?.etapas || null
  const [etapaAtual, setEtapaAtual] = useState(0)
  const draftKey = useMemo(() => normalizeDraftKey(effectiveMethod, endpoint), [effectiveMethod, endpoint])

  useEffect(() => {
    setHasAttemptedSubmit(false)
  }, [endpoint, effectiveMethod])

  useEffect(() => {
    let mounted = true

    async function loadOptionsSpec() {
      setOptionsFormSpec(null)
      try {
        setLoadingOptionsSpec(true)
        const metadata = await apiFetch<any>(endpoint, {
          method: "OPTIONS",
          clientCache: false,
        })
        const derivedSpec = buildFallbackSpecFromOptions(metadata, effectiveMethod, endpoint)
        if (mounted) setOptionsFormSpec(derivedSpec)
      } catch {
        if (mounted) setOptionsFormSpec(null)
      } finally {
        if (mounted) setLoadingOptionsSpec(false)
      }
    }

    loadOptionsSpec().catch(() => {})
    return () => {
      mounted = false
    }
  }, [endpoint, effectiveMethod])

  const formSpec = useMemo(
    () => mergeSpecs(schemaFormSpec, optionsFormSpec, endpoint),
    [schemaFormSpec, optionsFormSpec, endpoint]
  )
  const visibleFieldsForRelationTargets = useMemo(
    () => visibleFormFields(formSpec, config),
    [formSpec, config]
  )
  const relationFieldTargets = useMemo(
    () =>
      visibleFieldsForRelationTargets
        .filter((field) => shouldUseRelationField(field, endpoint))
        .map((field) => {
          const target = relationTargetForField(field.name, endpoint)
          return target ? { field, target } : null
        })
        .filter(Boolean) as Array<{ field: FormField; target: RelationTarget }>,
    [visibleFieldsForRelationTargets, endpoint]
  )
  const relationTargetsByField = useMemo(() => {
    const byField: Record<string, RelationTarget> = {}
    for (const { field, target } of relationFieldTargets) {
      byField[field.name] = target
    }
    return byField
  }, [relationFieldTargets])
  const relationSelectedValueKey = useMemo(
    () =>
      relationFieldTargets
        .map(({ field }) => {
          const value = values[field.name]
          const selected = Array.isArray(value)
            ? value.map((item) => relationIdFromValue(item)).filter(Boolean).join(",")
            : relationIdFromValue(value) || ""
          return `${field.name}:${selected}`
        })
        .join("|"),
    [relationFieldTargets, values]
  )

  useEffect(() => {
    let mounted = true

    async function loadRelationOptions() {
      if (!relationFieldTargets.length) {
        setRelationOptions({})
        setLoadingRelationFields(new Set())
        return
      }

      const loadingNames = new Set(relationFieldTargets.map((item) => item.field.name))
      setLoadingRelationFields(loadingNames)

      const loaded: Record<string, RelationOption[]> = {}
      await Promise.all(
        relationFieldTargets.map(async ({ field, target }) => {
          let options: RelationOption[] = []
          try {
            const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
              page: 1,
              pageSize: 100,
              query: target.staticFilters ? { ...target.staticFilters } : undefined,
              clientCache: safeRefreshToken === 0,
              clientCacheTtlMs: 60000,
            })
            options = relationOptionsFromRows(items, target)
          } catch {
            options = []
          }

          const currentRaw = values[field.name]
          if (Array.isArray(currentRaw)) {
            const selectedIds = currentRaw
              .map((item) => relationIdFromValue(item))
              .filter((item): item is string => Boolean(item))
            const missingIds = selectedIds.filter(
              (selectedId) => !options.some((option) => option.value === selectedId)
            )
            if (missingIds.length) {
              const selectedOptions = await Promise.all(
                missingIds.map(async (selectedId) => {
                  try {
                    const row = await apiFetch<Record<string, any>>(
                      relationDetailEndpoint(target, selectedId),
                      {
                        clientCache: safeRefreshToken === 0,
                        clientCacheTtlMs: 60000,
                      }
                    )
                    return relationOptionFromRow(row, target)
                  } catch {
                    return null
                  }
                })
              )
              for (const selectedOption of selectedOptions) {
                options = mergeSelectedRelationOption(options, selectedOption)
              }
            }
          }

          const currentValue = relationIdFromValue(values[field.name])
          if (currentValue && !options.some((option) => option.value === currentValue)) {
            let selectedOption =
              currentRaw && typeof currentRaw === "object" && !Array.isArray(currentRaw)
                ? relationOptionFromRow(currentRaw, target)
                : null

            if (!selectedOption) {
              try {
                const row = await apiFetch<Record<string, any>>(relationDetailEndpoint(target, currentValue), {
                  clientCache: safeRefreshToken === 0,
                  clientCacheTtlMs: 60000,
                })
                selectedOption = relationOptionFromRow(row, target)
              } catch {
                selectedOption = null
              }
            }

            options = mergeSelectedRelationOption(options, selectedOption)
          }

          loaded[field.name] = options
        })
      )

      if (!mounted) return
      setRelationOptions(loaded)
      setLoadingRelationFields(new Set())
    }

    loadRelationOptions().catch(() => {
      if (mounted) setLoadingRelationFields(new Set())
    })

    return () => {
      mounted = false
    }
    // relationSelectedValueKey limits reloads to relation field ID changes instead of every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationFieldTargets, relationSelectedValueKey, safeRefreshToken])

  useEffect(() => {
    if (!config?.lembrarCampos?.length) return
    setValues((prev) => {
      const next = { ...prev }
      for (const f of config.lembrarCampos || []) {
        const key = `substrato:ultimo_valor:${f}`
        const current = next[f]
        if (current !== undefined && current !== null && current !== "") continue
        try {
          const v = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null
          if (v !== null && v !== "") {
            const num = Number(v)
            next[f] = Number.isFinite(num) && String(num) === v ? num : v
          }
        } catch {}
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.lembrarCampos?.join(",")])

  useEffect(() => {
    if (effectiveMethod !== "post") return
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(draftKey) : null
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft || typeof draft !== "object") return
      setValues((prev) => ({ ...draft, ...prev }))
    } catch {}
  }, [draftKey, effectiveMethod])

  const activeSubmitFields = useMemo(() => {
    if (!formSpec) return []
    const visibleNames = new Set(visibleFieldsForRelationTargets.map((field) => field.name))
    return formSpec.submitFields.filter((field) => visibleNames.has(field.name))
  }, [formSpec, visibleFieldsForRelationTargets])

  useEffect(() => {
    if (effectiveMethod !== "post" || !formSpec) return
    const payload: Record<string, any> = {}
    for (const field of activeSubmitFields) {
      const value = values[field.name]
      if (!hasRequiredValue(value)) continue
      payload[field.name] = value
    }
    try {
      if (typeof localStorage === "undefined") return
      if (Object.keys(payload).length) {
        localStorage.setItem(draftKey, JSON.stringify(payload))
      } else {
        localStorage.removeItem(draftKey)
      }
    } catch {}
  }, [activeSubmitFields, draftKey, effectiveMethod, formSpec, values])

  const schema = useMemo(() => {
    if (!formSpec) return null
    const shape: Record<string, z.ZodTypeAny> = {}
    activeSubmitFields.forEach((f) => {
      shape[f.name] = fieldToZod(f)
    })
    return z.object(shape)
  }, [activeSubmitFields, formSpec])

  function listVisibleFields(): FormField[] {
    return visibleFormFields(formSpec, config)
  }

  function firstStepIndexForField(fieldName: string): number {
    if (!etapas?.length) return 0
    const idx = etapas.findIndex((etapa) => etapa.campos.includes(fieldName))
    return idx >= 0 ? idx : etapas.length - 1
  }

  function focusField(fieldName?: string) {
    if (!fieldName || typeof document === "undefined") return
    window.setTimeout(() => {
      const container = document.querySelector<HTMLElement>(
        `[data-form-field="${safeFieldSelector(fieldName)}"]`
      )
      container?.scrollIntoView({ block: "center", behavior: "smooth" })
      const focusable = container?.querySelector<HTMLElement>("input, select, textarea, button")
      focusable?.focus()
    }, 50)
  }

  function showFieldErrors(errs: Record<string, string>, fallbackMessage: string) {
    setErrors(errs)
    setMessage(fallbackMessage)
    const firstField = Object.keys(errs)[0]
    if (firstField && etapas?.length) setEtapaAtual(firstStepIndexForField(firstField))
    focusField(firstField)
  }

  function stepFieldNames(): string[] | null {
    if (!etapas?.length) return null
    const etapa = etapas[Math.max(0, Math.min(etapas.length - 1, etapaAtual))]
    return etapa?.campos || []
  }

  function buildStepSchema(names: string[]): z.ZodObject<any> | null {
    if (!formSpec) return null
    const byName = new Map(activeSubmitFields.map((f) => [f.name, f] as const))
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const n of names) {
      const f = byName.get(n)
      if (!f) continue
      shape[f.name] = fieldToZod(f)
    }
    return z.object(shape)
  }

  async function handleSubmit() {
    if (!formSpec || !schema) return

    // Navegação por etapas: valida apenas a etapa atual e avança.
    if (etapas?.length && etapaAtual < etapas.length - 1) {
      const names = stepFieldNames() || []
      const stepSchema = buildStepSchema(names)
      if (!stepSchema) return
      setErrors({})
      setMessage(null)
      try {
        stepSchema.parse(values)
        setEtapaAtual((prev) => Math.min(etapas.length - 1, prev + 1))
      } catch (e: any) {
        setHasAttemptedSubmit(true)
        if (e?.issues) {
          const errs: Record<string, string> = {}
          e.issues.forEach((issue: any) => {
            const path = issue.path.join(".")
            errs[path] = issue.message
          })
          showFieldErrors(errs, "Revise os campos desta etapa.")
        } else {
          setMessage(e?.message || "Revise os campos desta etapa.")
        }
      }
      return
    }

    setSubmitting(true)
    setMessage(null)
    setErrors({})
    try {
      const missing = activeSubmitFields.filter(
        (field) =>
          field.required &&
          conditionVisible(field.name, values, config) &&
          !hasRequiredValue(values[field.name])
      )
      if (missing.length) {
        setHasAttemptedSubmit(true)
        const errs: Record<string, string> = {}
        missing.forEach((field) => {
          errs[field.name] = "Campo obrigatório"
        })
        showFieldErrors(
          errs,
          `Preencha os campos obrigatórios: ${missing.map((field) => field.label).join(", ")}.`
        )
        return
      }
      const parsed: Record<string, any> = schema.parse(values)
      for (const key of Object.keys(parsed)) {
        if (!conditionVisible(key, values, config)) delete parsed[key]
      }
      const res = await apiFetch(endpoint, {
        method: effectiveMethod.toUpperCase(),
        body: JSON.stringify(parsed),
      })
      setMessage("Salvo com sucesso.")
      setHasAttemptedSubmit(false)
      if (effectiveMethod === "post") {
        try {
          if (typeof localStorage !== "undefined") localStorage.removeItem(draftKey)
        } catch {}
      }
      if (config?.lembrarCampos?.length) {
        for (const f of config.lembrarCampos || []) {
          const v = (parsed as any)?.[f]
          if (v === undefined || v === null || v === "") continue
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(`substrato:ultimo_valor:${f}`, String(v))
            }
          } catch {}
        }
      }
      onSuccess?.(res)
    } catch (e: any) {
      if (e?.issues) {
        setHasAttemptedSubmit(true)
        // ZodError
        const errs: Record<string, string> = {}
        e.issues.forEach((issue: any) => {
          const path = issue.path.join(".")
          errs[path] = issue.message
        })
        showFieldErrors(errs, "Revise os campos destacados antes de salvar.")
      } else {
        const normalized = normalizeFormApiErrors(
          e,
          activeSubmitFields.map((field) => field.name),
          { endpoint }
        )
        const hasFieldErrors = Object.keys(normalized.fieldErrors).length > 0
        if (hasFieldErrors) {
          setHasAttemptedSubmit(true)
          setErrors(normalized.fieldErrors)
          if (normalized.firstField && etapas?.length) {
            setEtapaAtual(firstStepIndexForField(normalized.firstField))
          }
          focusField(normalized.firstField)
        }
        const fallbackMessage = hasFieldErrors
          ? "Revise os campos destacados e tente novamente."
          : e?.message || "Falha ao salvar."
        setMessage(normalized.message || fallbackMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!formSpec) {
    if (loadingOptionsSpec) {
      return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--gray-700)]">
          Carregando metadados do formulário...
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Formulário indisponível para este recurso no momento.
      </div>
    )
  }

  const visibleFields = listVisibleFields()
  const visibleByName = new Map(visibleFields.map((f) => [f.name, f] as const))
  const stepNames = stepFieldNames()
  const configuredStepNames = new Set((etapas || []).flatMap((etapa) => etapa.campos))
  const unassignedRequiredFields =
    stepNames && etapas?.length && etapaAtual === etapas.length - 1
      ? visibleFields.filter((field) => field.required && !configuredStepNames.has(field.name))
      : []
  const stepFields = stepNames
    ? stepNames.map((n) => visibleByName.get(n)).filter(Boolean) as FormField[]
    : visibleFields
  const fieldsToRender = (stepNames
    ? [
        ...stepFields,
        ...unassignedRequiredFields.filter((field) => !stepFields.some((current) => current.name === field.name)),
      ]
    : visibleFields
  ).filter((field) => conditionVisible(field.name, values, config))
  const somenteLeitura = new Set(config?.somenteLeituraCampos || [])
  const requiredFields = activeSubmitFields.filter((field) => field.required)
  const missingRequiredFields = requiredFields.filter(
    (field) => conditionVisible(field.name, values, config) && !hasRequiredValue(values[field.name])
  )
  const submitDisabled = submitting

  return (
    <div className={`mx-auto w-full max-w-3xl ${modernNursingProcedureFlow ? "space-y-2" : "space-y-3"}`}>
      {message && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-1.5 text-sm text-[var(--text)]">
          {message}
        </div>
      )}

      {etapas?.length ? (
        <Etapas
          etapas={etapas.map((e) => ({ titulo: e.titulo, descricao: e.descricao }))}
          etapaAtual={etapaAtual}
          onChange={setEtapaAtual}
          variant={modernNursingProcedureFlow ? "modern" : "default"}
        />
      ) : null}

      <div className={modernNursingProcedureFlow
        ? "overflow-hidden rounded-xl border border-white/[0.32] bg-gradient-to-br from-white/[0.18] via-white/[0.08] to-sky-100/[0.08] p-3 shadow-lg shadow-slate-900/5 backdrop-blur-2xl [&_input]:!border-white/[0.32] [&_input]:!bg-white/[0.18] [&_select]:!border-white/[0.32] [&_select]:!bg-white/[0.18] [&_textarea]:!border-white/[0.32] [&_textarea]:!bg-white/[0.18] dark:border-white/10 dark:from-white/[0.055] dark:via-white/[0.025] dark:to-sky-950/[0.04] dark:[&_input]:!border-white/10 dark:[&_input]:!bg-white/[0.05] dark:[&_select]:!border-white/10 dark:[&_select]:!bg-white/[0.05] dark:[&_textarea]:!border-white/10 dark:[&_textarea]:!bg-white/[0.05]"
        : "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
      }>
        {requiredFields.length ? (
          <div className={modernNursingProcedureFlow
            ? "mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-violet-200/70 bg-violet-50/60 px-2.5 py-1.5 text-xs text-violet-800 dark:border-violet-700/30 dark:bg-violet-900/15 dark:text-violet-300"
            : "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--gray-50)] px-3 py-2 text-xs text-[var(--gray-700)]"
          }>
            <span className="font-semibold">
              Obrigatórios: {requiredFields.length}
            </span>
            {hasAttemptedSubmit ? (
              <span className={missingRequiredFields.length ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
                Em falta: {missingRequiredFields.length}
              </span>
            ) : null}
          </div>
        ) : null}

        {etapas?.length ? (
          <div className={modernNursingProcedureFlow ? "mb-3 border-b border-border/50 pb-2" : "mb-3 text-sm font-semibold text-[var(--text)]"}>
            {modernNursingProcedureFlow ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">
                  Etapa {etapaAtual + 1}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold text-foreground">{etapas[etapaAtual]?.titulo}</h2>
                {etapas[etapaAtual]?.descricao ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{etapas[etapaAtual]?.descricao}</p>
                ) : null}
              </>
            ) : etapas[etapaAtual]?.titulo}
          </div>
        ) : null}

        <div className={`grid ${compactFieldNames.size ? "grid-cols-2 md:grid-cols-4" : "md:grid-cols-2"} ${modernNursingProcedureFlow ? "gap-2" : "gap-3"}`}>
          {fieldsToRender.map((field) => {
            const label = config?.labels?.[field.name] || field.label
            const hint = config?.hints?.[field.name]
            const placeholder = placeholderForField(field, label, config?.placeholders?.[field.name])
            const widget = config?.widgets?.[field.name] || (LONG_TEXT_FIELDS.has(field.name) ? "textarea" : undefined)
            const isReadOnly = somenteLeitura.has(field.name)
            return (
              <label
                key={field.name}
                data-form-field={field.name}
                className={`${compactFieldNames.size ? (compactFieldNames.has(field.name) ? "col-span-1 min-w-0" : "col-span-2") : ""} ${modernNursingProcedureFlow ? "space-y-0.5" : "space-y-1"} text-sm text-[var(--gray-700)]`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--gray-700)]">
                    {label}
                    {field.required ? " *" : ""}
                  </span>
                  {errors[field.name] && (
                    <span className="text-xs text-red-600">{errors[field.name]}</span>
                  )}
                </div>
                {renderInput(
                  field,
                  values[field.name],
                  (v) => setValues((prev) => ({ ...prev, [field.name]: v })),
                  errors[field.name],
                  {
                    placeholder,
                    widget,
                    readOnly: isReadOnly,
                    translate: tr,
                    relationOptions: relationOptions[field.name],
                    relationLoading: loadingRelationFields.has(field.name),
                    relationTarget: relationTargetsByField[field.name],
                    safeRefreshToken,
                  }
                )}
                {hint ? (
                  <div className="text-xs text-[var(--gray-500)]">{hint}</div>
                ) : null}
              </label>
            )
          })}
        </div>
        {modernNursingProcedureFlow && etapas?.length ? (
          <div className="mt-3 flex flex-nowrap items-center justify-between gap-2 border-t border-white/30 pt-3 dark:border-white/10">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/40 bg-white/25 px-4 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/45 disabled:opacity-40 dark:border-white/10 dark:bg-white/5"
              onClick={() => setEtapaAtual((prev) => Math.max(0, prev - 1))}
              disabled={submitting || etapaAtual === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Salvando..." : etapaAtual < etapas.length - 1 ? "Seguinte" : submitLabel}
            </button>
          </div>
        ) : null}
        {modernNursingProcedureFlow && !etapas?.length ? (
          <div className="mt-3 flex justify-end border-t border-white/30 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Salvando..." : submitLabel}
            </button>
          </div>
        ) : null}
      </div>
      {!modernNursingProcedureFlow ? <div>
        {etapas?.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className={modernNursingProcedureFlow
                ? "inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-40 sm:w-auto"
                : "inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold leading-tight text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)] disabled:opacity-60 sm:w-auto"
              }
              onClick={() => setEtapaAtual((prev) => Math.max(0, prev - 1))}
              disabled={submitting || etapaAtual === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              className={modernNursingProcedureFlow
                ? "inline-flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 sm:w-auto"
                : "inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:opacity-60 sm:w-auto"
              }
            >
              {submitting ? "Salvando..." : etapaAtual < etapas.length - 1 ? "Seguinte" : submitLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={modernNursingProcedureFlow
              ? "inline-flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 sm:w-auto"
              : "inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:opacity-60 sm:w-auto"
            }
          >
            {submitting ? "Salvando..." : submitLabel}
          </button>
        )}
      </div> : null}
    </div>
  )
}
