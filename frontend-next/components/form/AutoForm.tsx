"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"

import { apiFetch } from "@/lib/api"
import { buildFormSpec, FormField } from "@/lib/openapi/formBuilder"
import Etapas from "@/components/form/Etapas"
import type { ResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { fieldLabel } from "@/lib/ui/fieldLabels"
import { useLanguage } from "@/hooks/useLanguage"

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
      base = z.string()
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
      base = z.array(z.string())
      break
    default:
      base = z.string()
  }
  return required ? base : base.optional().nullable()
}

function renderInput(
  field: FormField,
  value: any,
  onChange: (v: any) => void,
  error?: string,
  opts?: { readOnly?: boolean; placeholder?: string; translate?: (value: string) => string; widget?: "textarea" }
) {
  const common =
    "w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm leading-tight text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] disabled:cursor-not-allowed disabled:bg-[var(--gray-100)] disabled:text-[var(--gray-500)]"
  const stateClass = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-[var(--border)]"
  const disabled = !!opts?.readOnly
  const placeholder = opts?.placeholder
  const widget = opts?.widget

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

    const type = enumValues.length
      ? "select"
      : inferFormFieldTypeFromMetadata(String(desc.type || ""))

    const label = fieldLabel({
      endpoint,
      name,
      title: typeof desc.label === "string" && desc.label.trim() ? desc.label.trim() : undefined,
    })

    fields.push({
      name,
      label,
      required: !!desc.required,
      readOnly: !!desc.read_only,
      type,
      enumValues: enumValues.length ? enumValues : undefined,
      enumLabels: enumLabels.length ? enumLabels : undefined,
    })
  }

  if (!fields.length) return null
  const submitFields = fields.filter((field) => !field.readOnly)
  return { fields, submitFields }
}

function mergeSpecs(
  schemaSpec: RuntimeFormSpec | null,
  optionsSpec: RuntimeFormSpec | null
): RuntimeFormSpec | null {
  if (!schemaSpec && !optionsSpec) return null
  if (!schemaSpec) return optionsSpec
  if (!optionsSpec) return schemaSpec

  const byName = new Map<string, FormField>()
  for (const field of schemaSpec.fields) {
    byName.set(field.name, { ...field })
  }

  for (const source of optionsSpec.fields) {
    const current = byName.get(source.name)
    if (!current) {
      byName.set(source.name, { ...source })
      continue
    }

    const merged: FormField = {
      ...current,
      required: source.required || current.required,
      readOnly: source.readOnly ?? current.readOnly,
    }

    if (source.type === "select" && source.enumValues?.length) {
      merged.type = "select"
      merged.enumValues = source.enumValues
      merged.enumLabels = source.enumLabels?.length ? source.enumLabels : source.enumValues
    } else if (current.type === "text" && source.type !== "text") {
      // OPTIONS fornece tipos mais precisos quando o schema é genérico.
      merged.type = source.type
    }

    byName.set(source.name, merged)
  }

  const fields = Array.from(byName.values())
  const submitFields = fields.filter((field) => !field.readOnly)
  return { fields, submitFields }
}

function normalizeDraftKey(method: Method, endpoint: string): string {
  const e = String(endpoint || "").split("?")[0].split("#")[0]
  return `draft:autofrm:${method}:${e}`
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
}: AutoFormProps) {
  const { tr } = useLanguage()
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
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const etapas = config?.etapas || null
  const [etapaAtual, setEtapaAtual] = useState(0)

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
    () => mergeSpecs(schemaFormSpec, optionsFormSpec),
    [schemaFormSpec, optionsFormSpec]
  )

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

  const schema = useMemo(() => {
    if (!formSpec) return null
    const shape: Record<string, z.ZodTypeAny> = {}
    formSpec.submitFields.forEach((f) => {
      shape[f.name] = fieldToZod(f)
    })
    return z.object(shape)
  }, [formSpec])

  function listVisibleFields(): FormField[] {
    if (!formSpec) return []
    const esconder = new Set(config?.esconderCampos || [])
    let fields = formSpec.fields.filter((f) => !f.readOnly && !esconder.has(f.name))

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

  function stepFieldNames(): string[] | null {
    if (!etapas?.length) return null
    const etapa = etapas[Math.max(0, Math.min(etapas.length - 1, etapaAtual))]
    return etapa?.campos || []
  }

  function buildStepSchema(names: string[]): z.ZodObject<any> | null {
    if (!formSpec) return null
    const byName = new Map(formSpec.submitFields.map((f) => [f.name, f] as const))
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
      try {
        stepSchema.parse(values)
        setEtapaAtual((prev) => Math.min(etapas.length - 1, prev + 1))
      } catch (e: any) {
        if (e?.issues) {
          const errs: Record<string, string> = {}
          e.issues.forEach((issue: any) => {
            const path = issue.path.join(".")
            errs[path] = issue.message
          })
          setErrors(errs)
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
      const parsed = schema.parse(values)
      const res = await apiFetch(endpoint, {
        method: effectiveMethod.toUpperCase(),
        body: JSON.stringify(parsed),
      })
      setMessage("Salvo com sucesso.")
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
        // ZodError
        const errs: Record<string, string> = {}
        e.issues.forEach((issue: any) => {
          const path = issue.path.join(".")
          errs[path] = issue.message
        })
        setErrors(errs)
      } else {
        setMessage(e?.message || "Falha ao salvar.")
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
  const fieldsToRender = stepNames
    ? stepNames.map((n) => visibleByName.get(n)).filter(Boolean) as FormField[]
    : visibleFields
  const somenteLeitura = new Set(config?.somenteLeituraCampos || [])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {message && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-1.5 text-sm text-[var(--text)]">
          {message}
        </div>
      )}

      {etapas?.length ? (
        <Etapas etapas={etapas.map((e) => ({ titulo: e.titulo, descricao: e.descricao }))} etapaAtual={etapaAtual} onChange={setEtapaAtual} />
      ) : null}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        {etapas?.length ? (
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">
            {etapas[etapaAtual]?.titulo}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {fieldsToRender.map((field) => {
            const label = config?.labels?.[field.name] || field.label
            const hint = config?.hints?.[field.name]
            const placeholder = placeholderForField(field, label, config?.placeholders?.[field.name])
            const widget = config?.widgets?.[field.name] || (LONG_TEXT_FIELDS.has(field.name) ? "textarea" : undefined)
            const isReadOnly = somenteLeitura.has(field.name)
            return (
              <label key={field.name} className="space-y-1 text-sm text-[var(--gray-700)]">
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
                  { placeholder, widget, readOnly: isReadOnly, translate: tr }
                )}
                {hint ? (
                  <div className="text-xs text-[var(--gray-500)]">{hint}</div>
                ) : null}
              </label>
            )
          })}
        </div>
      </div>
      <div>
        {etapas?.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold leading-tight text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)] disabled:opacity-60"
              onClick={() => setEtapaAtual((prev) => Math.max(0, prev - 1))}
              disabled={submitting || etapaAtual === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:opacity-60"
            >
              {submitting ? "Salvando..." : etapaAtual < etapas.length - 1 ? "Seguinte" : submitLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold leading-tight text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:opacity-60"
          >
            {submitting ? "Salvando..." : submitLabel}
          </button>
        )}
      </div>
    </div>
  )
}
