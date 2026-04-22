"use client"

<<<<<<< Updated upstream
import { useEffect, useMemo, useState } from "react"
=======
import { useCallback, useEffect, useMemo, useState } from "react"
>>>>>>> Stashed changes
import { z } from "zod"

import { apiFetch } from "@/lib/api"
import { buildFormSpec, FormField } from "@/lib/openapi/formBuilder"
<<<<<<< Updated upstream
import Etapas from "@/components/form/Etapas"
import type { ResourceFormConfig } from "@/lib/resources/resourceFormConfig"
=======
import { wizardStepsFor, type WizardStep } from "@/lib/ui/wizardSteps"
import { bloodbankResourceKeyFromEndpoint } from "@/lib/ui/fieldLabels"
>>>>>>> Stashed changes

type Method = "post" | "put" | "patch"

export type AutoFormProps = {
  endpoint: string
  method: Method
  submitLabel?: string
  initialValues?: Record<string, any>
  onSuccess?: (data: any) => void
  config?: ResourceFormConfig | null
}

const LONG_TEXT_FIELDS = new Set([
  "notes",
  "findings",
  "actions_taken",
  "indication",
  "description",
  "reason",
])

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
      base = z.enum((field.enumValues || [""]).map(String) as [string, ...string[]])
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
  opts?: { readOnly?: boolean; placeholder?: string; widget?: "textarea" }
) {
  const common =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm leading-tight text-[var(--text)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-red-500/10"
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
          className={common}
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
          className={common}
          disabled={disabled}
        />
      )
    case "datetime":
      return (
        <input
          type="datetime-local"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={common}
          disabled={disabled}
        />
      )
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={common}
          disabled={disabled}
        >
          <option value="">Selecione...</option>
          {(field.enumValues || []).map((opt, idx) => {
            const label = field.enumLabels?.[idx] || opt
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
          className={common}
          placeholder={placeholder || "valor1, valor2"}
          disabled={disabled}
        />
      )
    default:
<<<<<<< Updated upstream
      if (widget === "textarea") {
=======
      if (LONG_TEXT_FIELDS.has(field.name)) {
>>>>>>> Stashed changes
        return (
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
<<<<<<< Updated upstream
            className={`${common} min-h-[92px] resize-y px-3 py-2`}
            placeholder={placeholder}
            disabled={disabled}
            rows={4}
=======
            className={common}
            rows={4}
            disabled={disabled}
>>>>>>> Stashed changes
          />
        )
      }
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={common}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
  }
}

function normalizeDraftKey(method: Method, endpoint: string): string {
  const e = String(endpoint || "").split("?")[0].split("#")[0]
  return `draft:autofrm:${method}:${e}`
}

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
  const formSpec = useMemo(() => buildFormSpec(endpoint, method), [endpoint, method])
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
<<<<<<< Updated upstream
  const etapas = config?.etapas || null
  const [etapaAtual, setEtapaAtual] = useState(0)

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
=======
  const [stepIdx, setStepIdx] = useState(0)
  const [storageOptions, setStorageOptions] = useState<Array<{ id: number; name: string }>>([])

  const isBloodbank = !!bloodbankResourceKeyFromEndpoint(endpoint)
>>>>>>> Stashed changes

  const schema = useMemo(() => {
    if (!formSpec) return null
    const shape: Record<string, z.ZodTypeAny> = {}
    formSpec.submitFields.forEach((f) => {
      shape[f.name] = fieldToZod(f)
    })
    return z.object(shape)
  }, [formSpec])

<<<<<<< Updated upstream
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
=======
  const steps = useMemo(() => {
    if (!formSpec) return null
    return wizardStepsFor(endpoint, formSpec.submitFields)
  }, [endpoint, formSpec])

  const isWizard = !!steps?.length

  // Load draft values (wizard) so refreshes don't lose progress.
  useEffect(() => {
    if (!isWizard) return
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(normalizeDraftKey(method, endpoint))
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") return
      setValues((prev) => ({ ...parsed, ...prev }))
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWizard, endpoint, method])

  // Persist draft values.
  useEffect(() => {
    if (!isWizard) return
    if (typeof window === "undefined") return
    const key = normalizeDraftKey(method, endpoint)
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(values))
      } catch {
        // ignore
      }
    }, 250)
    return () => clearTimeout(t)
  }, [endpoint, isWizard, method, values])

  // Bloodbank foreign-key helpers (storage and related).
  useEffect(() => {
    let mounted = true
    async function loadStorages() {
      if (!isBloodbank) return
      if (!formSpec) return
      const needs =
        formSpec.submitFields.some((f) =>
          ["storage", "source_storage", "destination_storage"].includes(f.name)
        )
      if (!needs) return
      try {
        const res = await apiFetch<any>("/bloodbank/armazenamento/")
        const items = res && (res as any).results ? (res as any).results : res
        const opts: Array<{ id: number; name: string }> = []
        if (Array.isArray(items)) {
          for (const s of items) {
            const id = Number((s as any)?.id)
            if (!Number.isFinite(id)) continue
            const name = String((s as any)?.name || (s as any)?.custom_id || (s as any)?.id_custom || id)
            opts.push({ id, name })
          }
        }
        if (mounted) setStorageOptions(opts)
      } catch {
        // ignore
      }
    }
    loadStorages()
    return () => {
      mounted = false
    }
  }, [formSpec, isBloodbank])

  const currentStep = steps?.[Math.min(stepIdx, (steps?.length || 1) - 1)] || null

  const visibleFields = useMemo(() => {
    if (!formSpec) return []
    const writable = formSpec.fields.filter((f) => !f.readOnly)
    if (!isWizard || !currentStep) return writable
    const allow = new Set(currentStep.fields)
    return writable.filter((f) => allow.has(f.name))
  }, [currentStep, formSpec, isWizard])

  const stepSchema = useMemo(() => {
    if (!isWizard || !schema || !currentStep) return null
    const allow = new Set(currentStep.fields)
    const mask: Record<string, true> = {}
    for (const k of Object.keys((schema as any).shape || {})) {
      if (allow.has(k)) mask[k] = true
    }
    try {
      return (schema as any).pick(mask)
    } catch {
      return null
    }
  }, [currentStep, isWizard, schema])

  const saveStep = useCallback(async () => {
    if (!isWizard) return
    if (!currentStep) return

    // For POST create flows we cannot persist partial records in the backend reliably,
    // so we store the draft locally and proceed.
    if (method === "post") {
      setMessage("Rascunho guardado.")
      return
    }

    // For edit flows, save step-by-step using PATCH.
    const payload: Record<string, any> = {}
    for (const name of currentStep.fields) {
      if (name in values) payload[name] = values[name]
    }
    try {
      await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify(payload) })
      setMessage("Etapa guardada.")
    } catch (e: any) {
      setMessage(e?.message || "Falha ao guardar a etapa.")
      throw e
    }
  }, [currentStep, endpoint, isWizard, method, values])

  const nextStep = useCallback(async () => {
    if (!isWizard || !steps || !currentStep) return
    setMessage(null)
    setErrors({})

    try {
      if (stepSchema) stepSchema.parse(values)
      await saveStep()
      setStepIdx((i) => Math.min(steps.length - 1, i + 1))
    } catch (e: any) {
      if (e?.issues) {
        const errs: Record<string, string> = {}
        e.issues.forEach((issue: any) => {
          const path = issue.path.join(".")
          errs[path] = issue.message
        })
        setErrors(errs)
        setMessage("Verifique os campos desta etapa.")
      }
    }
  }, [currentStep, isWizard, saveStep, stepSchema, steps, values])
>>>>>>> Stashed changes

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
        method: method.toUpperCase(),
        body: JSON.stringify(parsed),
      })
      setMessage("Salvo com sucesso.")
<<<<<<< Updated upstream
      if (config?.lembrarCampos?.length) {
        for (const f of config.lembrarCampos || []) {
          const v = (parsed as any)?.[f]
          if (v === undefined || v === null || v === "") continue
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(`substrato:ultimo_valor:${f}`, String(v))
            }
          } catch {}
=======
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(normalizeDraftKey(method, endpoint))
        } catch {
          // ignore
>>>>>>> Stashed changes
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
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Schema do endpoint não encontrado em `schema.generated.json`. Regerar o schema
        para habilitar o formulário (ex.: `python generate_schema.py` e depois `python scripts/convert_schema_json.py`).
      </div>
    )
  }

<<<<<<< Updated upstream
  const visibleFields = listVisibleFields()
  const visibleByName = new Map(visibleFields.map((f) => [f.name, f] as const))
  const stepNames = stepFieldNames()
  const fieldsToRender = stepNames
    ? stepNames.map((n) => visibleByName.get(n)).filter(Boolean) as FormField[]
    : visibleFields
  const somenteLeitura = new Set(config?.somenteLeituraCampos || [])
=======
  function renderStorageSelect(
    field: FormField,
    value: any,
    onChange: (v: any) => void,
    opts?: { readOnly?: boolean }
  ) {
    const common =
      "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm leading-tight text-[var(--text)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-red-500/10"
    const disabled = !!opts?.readOnly
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={common}
        disabled={disabled}
      >
        <option value="">Selecione...</option>
        {storageOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    )
  }
>>>>>>> Stashed changes

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {isWizard && steps ? (
        <Stepper steps={steps} current={Math.min(stepIdx, steps.length - 1)} onSelect={setStepIdx} />
      ) : null}

      {message && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-1.5 text-sm text-[var(--text)]">
          {message}
        </div>
      )}

<<<<<<< Updated upstream
      {etapas?.length ? (
        <Etapas etapas={etapas.map((e) => ({ titulo: e.titulo, descricao: e.descricao }))} etapaAtual={etapaAtual} onChange={setEtapaAtual} />
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        {etapas?.length ? (
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">
            {etapas[etapaAtual]?.titulo}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {fieldsToRender.map((field) => {
            const label = config?.labels?.[field.name] || field.label
            const hint = config?.hints?.[field.name]
            const placeholder = config?.placeholders?.[field.name]
            const widget = config?.widgets?.[field.name]
            const isReadOnly = somenteLeitura.has(field.name)
            return (
              <label key={field.name} className="space-y-0.5 text-sm text-[var(--gray-700)]">
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
                  { placeholder, widget, readOnly: isReadOnly }
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
              className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm font-semibold leading-tight text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              onClick={() => setEtapaAtual((prev) => Math.max(0, prev - 1))}
              disabled={submitting || etapaAtual === 0}
            >
              Anterior
            </button>
=======
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          {visibleFields.map((field) => (
            <label key={field.name} className="space-y-1 text-sm text-[var(--gray-700)]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {errors[field.name] && (
                  <span className="shrink-0 text-xs font-semibold text-red-600">{errors[field.name]}</span>
                )}
              </div>

              {["storage", "source_storage", "destination_storage"].includes(field.name) && storageOptions.length
                ? renderStorageSelect(
                  field,
                  values[field.name],
                  (v) => setValues((prev) => ({ ...prev, [field.name]: v })),
                  { readOnly: false }
                )
                : renderInput(
                  field,
                  values[field.name],
                  (v) => setValues((prev) => ({ ...prev, [field.name]: v })),
                  errors[field.name]
                )}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {isWizard && steps ? (
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx <= 0 || submitting}
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            Voltar
          </button>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isWizard && steps ? (
            stepIdx < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
              >
                {method === "post" ? "Guardar rascunho e continuar" : "Guardar e continuar"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
              >
                {submitting ? "A guardar..." : submitLabel}
              </button>
            )
          ) : (
>>>>>>> Stashed changes
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
<<<<<<< Updated upstream
              className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              {submitting ? "Salvando..." : etapaAtual < etapas.length - 1 ? "Seguinte" : submitLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
          >
            {submitting ? "Salvando..." : submitLabel}
          </button>
        )}
=======
              className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              {submitting ? "A guardar..." : submitLabel}
            </button>
          )}
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  )
}
