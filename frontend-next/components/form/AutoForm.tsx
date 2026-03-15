"use client"

import { useMemo, useState } from "react"
import { z } from "zod"

import { apiFetch } from "@/lib/api"
import { buildFormSpec, FormField } from "@/lib/openapi/formBuilder"

type Method = "post" | "put" | "patch"

export type AutoFormProps = {
  endpoint: string
  method: Method
  submitLabel?: string
  initialValues?: Record<string, any>
  onSuccess?: (data: any) => void
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
  opts?: { readOnly?: boolean }
) {
  const common =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm leading-tight text-[var(--text)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-red-500/10"
  const disabled = !!opts?.readOnly

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
          placeholder="valor1, valor2"
          disabled={disabled}
        />
      )
    default:
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={common}
          disabled={disabled}
        />
      )
  }
}

export default function AutoForm({
  endpoint,
  method,
  submitLabel = "Salvar",
  initialValues = {},
  onSuccess,
}: AutoFormProps) {
  const formSpec = useMemo(() => buildFormSpec(endpoint, method), [endpoint, method])
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const schema = useMemo(() => {
    if (!formSpec) return null
    const shape: Record<string, z.ZodTypeAny> = {}
    formSpec.submitFields.forEach((f) => {
      shape[f.name] = fieldToZod(f)
    })
    return z.object(shape)
  }, [formSpec])

  async function handleSubmit() {
    if (!formSpec || !schema) return
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
        Schema do endpoint não encontrado em schema.json. Regerar o schema e tipos
        para habilitar o formulário.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-1.5 text-sm text-[var(--text)]">
          {message}
        </div>
      )}

      {formSpec.fields.some((f) => f.readOnly) ? (
        <details className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
          <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--text)]">
            Campos somente leitura
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {formSpec.fields
              .filter((f) => f.readOnly)
              .map((field) => (
                <label key={field.name} className="space-y-0.5 text-sm text-[var(--gray-700)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{field.label}</span>
                  </div>
                  <div className="opacity-80">
                    {renderInput(
                      field,
                      values[field.name],
                      () => {},
                      undefined,
                      { readOnly: true }
                    )}
                  </div>
                </label>
              ))}
          </div>
        </details>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {formSpec.fields.filter((f) => !f.readOnly).map((field) => (
          <label key={field.name} className="space-y-0.5 text-sm text-[var(--gray-700)]">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {field.label}
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
              errors[field.name]
            )}
          </label>
        ))}
      </div>
      <div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
        >
          {submitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </div>
  )
}
