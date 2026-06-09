"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Loader2, Workflow } from "lucide-react"

import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import {
  getAvailableDetailActions,
  normalizeDetailEndpoint,
  recordActionEndpoint,
  type DetailActionDefinition,
  type DetailActionField,
} from "@/lib/resources/detailActions"

type FieldValue = string | boolean | number
type ActionState = { loading?: boolean; feedback?: string; error?: string }

function buttonClass(tone?: DetailActionDefinition["tone"]): string {
  if (tone === "primary") {
    return "inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
  }
  if (tone === "danger") {
    return "inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
  }
  return "inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
}

function defaultFieldValue(field: DetailActionField): FieldValue {
  if (field.defaultValue !== undefined) return field.defaultValue
  if (field.type === "checkbox") return false
  return ""
}

function coerceFieldValue(field: DetailActionField, raw: FieldValue): unknown {
  if (field.type === "checkbox") return Boolean(raw)
  if (field.type === "number") {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return String(raw ?? "").trim()
}

export default function ResourceDetailActionsPanel({
  endpoint,
  id,
  resourceLabel,
  onCompleted,
}: {
  endpoint: string
  id: string
  resourceLabel: string
  onCompleted?: () => void
}) {
  const { t, language } = useLanguage()
  const actions = useMemo(() => getAvailableDetailActions(endpoint), [endpoint])
  const [valuesByAction, setValuesByAction] = useState<Record<string, Record<string, FieldValue>>>({})
  const [stateByAction, setStateByAction] = useState<Record<string, ActionState>>({})

  if (!actions.length || !id) return null

  const isPt = language !== "en"

  function getValue(action: DetailActionDefinition, field: DetailActionField): FieldValue {
    const existing = valuesByAction[action.key]?.[field.name]
    return existing ?? defaultFieldValue(field)
  }

  function setValue(action: DetailActionDefinition, field: DetailActionField, value: FieldValue) {
    setValuesByAction((current) => ({
      ...current,
      [action.key]: { ...(current[action.key] || {}), [field.name]: value },
    }))
  }

  function patchState(action: DetailActionDefinition, next: ActionState) {
    setStateByAction((current) => ({
      ...current,
      [action.key]: { ...(current[action.key] || {}), ...next },
    }))
  }

  async function runAction(action: DetailActionDefinition) {
    patchState(action, { loading: true, error: "", feedback: "" })
    try {
      const body: Record<string, unknown> = {}
      for (const field of action.fields || []) {
        const raw = getValue(action, field)
        const isEmpty = field.type !== "checkbox" && String(raw ?? "").trim() === ""
        if (field.required && isEmpty) {
          throw new Error(
            isPt ? `${field.labelPt}: campo obrigatório.` : `${field.labelEn}: required field.`
          )
        }
        if (!field.required && isEmpty) continue
        body[field.name] = coerceFieldValue(field, raw)
      }

      await apiFetch(recordActionEndpoint(endpoint, id, action.action), {
        method: "POST",
        body: JSON.stringify(body),
        clientCache: false,
      })

      patchState(action, { loading: false, feedback: isPt ? action.successPt : action.successEn })
      onCompleted?.()
    } catch (error: any) {
      patchState(action, {
        loading: false,
        error: isNotFoundLikeError(error)
          ? t("Registo não encontrado.", "Record not found.")
          : error?.message || t("Falha ao executar ação.", "Failed to run action."),
      })
    }
  }

  function renderField(action: DetailActionDefinition, field: DetailActionField) {
    const value = getValue(action, field)
    const label = isPt ? field.labelPt : field.labelEn
    const helper = isPt ? field.helperPt : field.helperEn
    const baseClass =
      "w-full rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"

    if (field.type === "checkbox") {
      return (
        <label key={field.name} className="inline-flex h-9 items-center gap-2 text-sm text-[var(--gray-700)]">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setValue(action, field, event.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary-600)] focus:ring-[var(--primary-200)]"
          />
          <span>{label}</span>
        </label>
      )
    }

    return (
      <label key={field.name} className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">
          {label}
          {field.required ? " *" : ""}
        </span>
        {field.type === "select" ? (
          <select
            value={String(value ?? "")}
            onChange={(event) => setValue(action, field, event.target.value)}
            className={baseClass}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <textarea
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(event) => setValue(action, field, event.target.value)}
            className={`${baseClass} min-h-[72px] resize-y`}
          />
        ) : (
          <input
            type={field.type === "number" ? "number" : "text"}
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(event) => setValue(action, field, event.target.value)}
            className={baseClass}
          />
        )}
        {helper ? <p className="text-[11px] text-[var(--gray-500)]">{helper}</p> : null}
      </label>
    )
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gray-100)] text-[var(--primary-700)]">
          <Workflow size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{t("Ações do fluxo", "Workflow actions")}</p>
          <p className="text-xs text-[var(--gray-600)]">
            {resourceLabel} · {normalizeDetailEndpoint(endpoint)}
            {id}/
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        {actions.map((action) => {
          const state = stateByAction[action.key] || {}
          const description = isPt ? action.descriptionPt : action.descriptionEn
          const label = isPt ? action.labelPt : action.labelEn

          return (
            <div key={action.key} className="rounded-md border border-[var(--border)] bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
                  {description ? <p className="mt-0.5 text-xs text-[var(--gray-600)]">{description}</p> : null}
                </div>
              </div>

              {action.fields?.length ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {action.fields.map((field) => renderField(action, field))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {action.confirm ? (
                  <ConfirmDialog
                    title={label}
                    message={t(
                      "Confirma esta ação? A operação respeita as regras de estado do backend.",
                      "Confirm this action? The operation respects backend state rules."
                    )}
                    confirmText={label}
                    onConfirm={() => runAction(action)}
                    disabled={state.loading}
                  >
                    <button type="button" disabled={state.loading} className={buttonClass(action.tone)}>
                      {state.loading ? <Loader2 size={15} className="animate-spin" /> : null}
                      {state.loading ? t("Executando...", "Running...") : label}
                    </button>
                  </ConfirmDialog>
                ) : (
                  <button
                    type="button"
                    disabled={state.loading}
                    onClick={() => void runAction(action)}
                    className={buttonClass(action.tone)}
                  >
                    {state.loading ? <Loader2 size={15} className="animate-spin" /> : null}
                    {state.loading ? t("Executando...", "Running...") : label}
                  </button>
                )}
              </div>

              {state.feedback ? (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  <CheckCircle2 size={13} />
                  {state.feedback}
                </div>
              ) : null}

              {state.error ? (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
                  {state.error}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
