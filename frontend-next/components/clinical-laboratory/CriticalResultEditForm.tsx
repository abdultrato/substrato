"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  ShieldAlert,
  XCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"

type Row = Record<string, any>

const ENDPOINT = "/clinical_laboratory/critical_notification/"
const BOARD_PATH = "/clinical-laboratory/critical-results"

const METHODS: { value: string; pt: string; en: string }[] = [
  { value: "TELEFONE", pt: "Telefone", en: "Phone" },
  { value: "SMS", pt: "SMS", en: "SMS" },
  { value: "PRESENCIAL", pt: "Presencial", en: "In person" },
  { value: "SISTEMA", pt: "Sistema / Notificação", en: "System / Notification" },
  { value: "EMAIL", pt: "E-mail", en: "E-mail" },
]

// Translucent "glass" surfaces — let the brand canvas show through.
const GLASS =
  "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
const GLASS_SOFT =
  "rounded-md border border-white/40 bg-white/50 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]"
const INPUT_CLASS =
  "w-full rounded-lg border border-white/40 bg-white/50 px-3 py-2 text-sm text-foreground shadow-sm outline-none backdrop-blur-sm transition placeholder:text-[var(--gray-400)] focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-500)]/25 dark:border-white/10 dark:bg-white/[0.06]"

function isHigh(r: Row) { return String(r?.result_flag || "") === "CRITICO_ALTO" }

function timeAgo(value: any, t: (pt: string, en: string) => string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  const min = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
  if (min < 1) return t("agora mesmo", "just now")
  if (min < 60) return t(`há ${min} min`, `${min} min ago`)
  const h = Math.floor(min / 60)
  if (h < 24) return t(`há ${h} h`, `${h} h ago`)
  const days = Math.floor(h / 24)
  return t(`há ${days} d`, `${days} d ago`)
}

export default function CriticalResultEditForm() {
  useAuthGuard()
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const id = String((params as any)?.id ?? "")
  const detailPath = `${BOARD_PATH}/${encodeURIComponent(id)}`

  const { data, isLoading, error } = useQuery({
    queryKey: ["lab-critical-edit", id],
    queryFn: async () => await apiFetch<Row>(`${ENDPOINT}${encodeURIComponent(id)}/`, { clientCache: false }),
    enabled: !!id,
  })

  const [professional, setProfessional] = useState("")
  const [method, setMethod] = useState("TELEFONE")
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setProfessional(String(data.notified_professional ?? ""))
    setMethod(String(data.method ?? "TELEFONE"))
    setConfirmed(!!data.readback_confirmed)
    setNotes(String(data.notes ?? ""))
  }, [data])

  const high = isHigh(data || {})
  const value = String(data?.result_value ?? "").trim()
  const unit = String(data?.result_unit ?? "").trim()
  const flagLabel = String(data?.result_flag_display || data?.result_flag || "").trim()
  const valueTone = high ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await apiFetch(`${ENDPOINT}${encodeURIComponent(id)}/`, {
        method: "PATCH",
        body: JSON.stringify({
          notified_professional: professional,
          method,
          readback_confirmed: confirmed,
          notes,
        }),
      })
      router.push(BOARD_PATH)
    } catch (err: any) {
      setSaveError(err?.message || t("Falha ao guardar as alterações.", "Failed to save changes."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/30 pb-3 dark:border-white/10">
          <Link
            href={BOARD_PATH}
            className={`inline-flex h-8 w-8 items-center justify-center text-[var(--gray-600)] transition hover:bg-white/70 dark:text-[var(--gray-300)] dark:hover:bg-white/10 ${GLASS_SOFT}`}
            aria-label={t("Voltar", "Back")}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-600 backdrop-blur-sm dark:text-rose-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-foreground">
              {t("Comunicação de resultado crítico", "Critical result notification")}
            </h1>
            <p className="text-xs text-[var(--gray-500)]">{t("Registar comunicação e confirmar readback", "Record notification and confirm readback")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className={`h-24 animate-pulse ${GLASS}`} />
            <div className={`h-64 animate-pulse ${GLASS}`} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 backdrop-blur-sm dark:bg-amber-900/15 dark:text-amber-200">
            {(error as any)?.message || t("Falha ao carregar o registo.", "Failed to load record.")}
          </div>
        ) : (
          <>
            {/* Clinical context — read-only summary */}
            <section
              className={`relative overflow-hidden p-4 pl-5 backdrop-blur-md
                before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${high ? "before:bg-rose-500" : "before:bg-sky-500"}
                rounded-2xl border shadow-sm ${
                  high
                    ? "border-rose-200/50 bg-rose-50/45 dark:border-rose-900/30 dark:bg-rose-950/20"
                    : "border-sky-200/50 bg-sky-50/45 dark:border-sky-900/30 dark:bg-sky-950/20"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--text)]">{String(data?.patient_name || "—")}</span>
                    {data?.order ? (
                      <Link
                        href={`/clinical-laboratory/orders/${encodeURIComponent(String(data.order))}`}
                        className="shrink-0 rounded-md border border-white/40 bg-white/50 px-1.5 py-0.5 font-mono text-[11px] text-[var(--primary-600)] backdrop-blur-sm hover:bg-white/70 dark:border-white/10 dark:bg-white/5"
                        title={t("Abrir requisição", "Open requisition")}
                      >
                        {String(data?.order_code || `#${data.order}`)}
                      </Link>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--gray-500)]">
                    <span className="font-medium text-[var(--gray-700)] dark:text-[var(--gray-300)]">{String(data?.test_name || "—")}</span>
                    {data?.field_name ? <span>· {String(data.field_name)}</span> : null}
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeAgo(data?.notified_at, t)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`flex items-baseline justify-end gap-1 ${valueTone}`}>
                    <span className="text-2xl font-bold leading-none tabular-nums">{value || "—"}</span>
                    {unit ? <span className="text-xs font-medium opacity-80">{unit}</span> : null}
                  </div>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${
                      high ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                    }`}
                  >
                    {high ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {flagLabel || t("Crítico", "Critical")}
                  </span>
                </div>
              </div>
            </section>

            {/* Readback form */}
            <form onSubmit={handleSubmit} className={`space-y-4 p-5 ${GLASS}`}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">{t("Profissional notificado", "Notified professional")}</span>
                <input
                  value={professional}
                  onChange={(e) => setProfessional(e.target.value)}
                  placeholder={t("Nome de quem recebeu a comunicação", "Name of who received the notification")}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">{t("Método de comunicação", "Notification method")}</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={INPUT_CLASS}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{t(m.pt, m.en)}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-foreground">{t("Readback confirmado", "Readback confirmed")}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium backdrop-blur-sm transition ${
                      confirmed
                        ? "border-emerald-300/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border-white/40 bg-white/40 text-[var(--gray-600)] hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-[var(--gray-300)]"
                    }`}
                  >
                    <CheckCircle2 size={15} /> {t("Sim", "Yes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmed(false)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium backdrop-blur-sm transition ${
                      !confirmed
                        ? "border-amber-300/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "border-white/40 bg-white/40 text-[var(--gray-600)] hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-[var(--gray-300)]"
                    }`}
                  >
                    <XCircle size={15} /> {t("Não", "No")}
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">{t("Observações", "Notes")}</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t("Detalhes da comunicação, instruções dadas, etc.", "Notification details, instructions given, etc.")}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </label>

              {saveError ? (
                <div className="rounded-lg border border-red-300/50 bg-red-50/60 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:bg-red-900/15 dark:text-red-300">
                  {saveError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-white/30 pt-4 dark:border-white/10">
                <Link
                  href={detailPath}
                  className={`inline-flex h-9 items-center px-3 text-sm font-medium text-[var(--gray-700)] transition hover:bg-white/70 dark:text-[var(--gray-300)] dark:hover:bg-white/10 ${GLASS_SOFT}`}
                >
                  {t("Cancelar", "Cancel")}
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary-600)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {t("Guardar alterações", "Save changes")}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  )
}
