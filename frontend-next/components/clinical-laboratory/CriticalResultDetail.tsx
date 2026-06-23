"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Hash,
  History,
  Loader2,
  Pencil,
  Phone,
  ShieldAlert,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"

type Row = Record<string, any>

const ENDPOINT = "/clinical_laboratory/critical_notification/"
const BOARD_PATH = "/clinical-laboratory/critical-results"
const OVERDUE_MIN = 30

// Translucent "glass" surfaces — let the brand canvas show through.
const GLASS =
  "rounded-2xl border border-white/30 bg-white/55 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"
const GLASS_SOFT =
  "rounded-md border border-white/40 bg-white/50 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]"
const SKELETON = "animate-pulse rounded-2xl border border-white/30 bg-white/40 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]"

const METHOD_LABELS: Record<string, { pt: string; en: string }> = {
  TELEFONE: { pt: "Telefone", en: "Phone" },
  SMS: { pt: "SMS", en: "SMS" },
  PRESENCIAL: { pt: "Presencial", en: "In person" },
  SISTEMA: { pt: "Sistema / Notificação", en: "System / Notification" },
  EMAIL: { pt: "E-mail", en: "E-mail" },
}

function isHigh(r: Row) { return String(r?.result_flag || "") === "CRITICO_ALTO" }

function minutesSince(value: any): number | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000))
}

function fmtDateTime(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function timeAgo(value: any, t: (pt: string, en: string) => string): string {
  const min = minutesSince(value)
  if (min == null) return "—"
  if (min < 1) return t("agora mesmo", "just now")
  if (min < 60) return t(`há ${min} min`, `${min} min ago`)
  const h = Math.floor(min / 60)
  if (h < 24) return t(`há ${h} h`, `${h} h ago`)
  const days = Math.floor(h / 24)
  return t(`há ${days} d`, `${days} d ago`)
}

function val(x: any): string {
  const s = String(x ?? "").trim()
  return s === "" ? "—" : s
}

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-[var(--gray-500)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-[var(--text)]">{children}</span>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`p-4 ${GLASS}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
        {icon} {title}
      </div>
      <div className="divide-y divide-white/30 dark:divide-white/10">{children}</div>
    </section>
  )
}

function Step({ done, current, icon, title, detail }: { done: boolean; current?: boolean; icon: React.ReactNode; title: string; detail?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
            done
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : current
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-[var(--gray-100)] text-[var(--gray-400)] dark:bg-white/5"
          }`}
        >
          {icon}
        </span>
        <span className="mt-1 w-px flex-1 bg-[var(--border)] last:hidden" />
      </div>
      <div className="pb-4">
        <p className={`text-sm font-medium ${done || current ? "text-[var(--text)]" : "text-[var(--gray-400)]"}`}>{title}</p>
        {detail ? <div className="mt-0.5 text-xs text-[var(--gray-500)]">{detail}</div> : null}
      </div>
    </li>
  )
}

export default function CriticalResultDetail() {
  useAuthGuard()
  const { t } = useLanguage()
  const qc = useQueryClient()
  const params = useParams()
  const id = String((params as any)?.id ?? "")
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["lab-critical-detail", id],
    queryFn: async () => await apiFetch<Row>(`${ENDPOINT}${encodeURIComponent(id)}/`, { clientCache: false }),
    enabled: !!id,
  })

  const d = data || {}
  const high = isHigh(d)
  const confirmed = !!d?.readback_confirmed
  const value = String(d?.result_value ?? "").trim()
  const unit = String(d?.result_unit ?? "").trim()
  const flagLabel = String(d?.result_flag_display || d?.result_flag || "").trim()
  const valueTone = high ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"
  const mins = minutesSince(d?.notified_at)
  const overdue = !confirmed && mins != null && mins >= OVERDUE_MIN
  const methodLabel = d?.method ? t(METHOD_LABELS[d.method]?.pt ?? String(d.method), METHOD_LABELS[d.method]?.en ?? String(d.method)) : "—"
  const notified = String(d?.notified_professional ?? "").trim()

  async function confirmReadback() {
    setBusy(true)
    setActionError(null)
    try {
      await apiFetch(`${ENDPOINT}${encodeURIComponent(id)}/`, {
        method: "PATCH",
        body: JSON.stringify({ readback_confirmed: true }),
      })
      await qc.invalidateQueries({ queryKey: ["lab-critical-detail", id] })
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao confirmar readback.", "Failed to confirm readback."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-white/30 pb-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
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
              {d?.custom_id ? <p className="font-mono text-xs text-[var(--gray-500)]">{String(d.custom_id)}</p> : null}
            </div>
          </div>
          {!isLoading && !error ? (
            <div className="flex items-center gap-2">
              {!confirmed ? (
                <button
                  type="button"
                  onClick={confirmReadback}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {t("Confirmar readback", "Confirm readback")}
                </button>
              ) : null}
              <Link
                href={`${BOARD_PATH}/${encodeURIComponent(id)}/edit`}
                className={`inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-white/70 dark:text-[var(--gray-300)] dark:hover:bg-white/10 ${GLASS_SOFT}`}
              >
                <Pencil size={14} /> {t("Editar", "Edit")}
              </Link>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className={`h-16 ${SKELETON}`} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className={`h-56 lg:col-span-2 ${SKELETON}`} />
              <div className={`h-56 ${SKELETON}`} />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 backdrop-blur-sm dark:bg-amber-900/15 dark:text-amber-200">
            {(error as any)?.message || t("Falha ao carregar o registo.", "Failed to load record.")}
          </div>
        ) : (
          <>
            {actionError ? (
              <div className="rounded-xl border border-red-300/50 bg-red-50/60 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                {actionError}
              </div>
            ) : null}

            {/* Status banner */}
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md ${
                confirmed
                  ? "border-emerald-200/50 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-200"
                  : overdue
                    ? "border-rose-300/60 bg-rose-50/55 text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
                    : "border-amber-200/50 bg-amber-50/50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"
              }`}
            >
              {confirmed ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${overdue ? "bg-rose-500" : "bg-amber-400"}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${overdue ? "bg-rose-600" : "bg-amber-500"}`} />
                </span>
              )}
              <p className="text-sm font-semibold">
                {confirmed
                  ? t("Readback confirmado", "Readback confirmed")
                  : overdue
                    ? t(`Atrasado há ${mins} min — comunicar já`, `Overdue ${mins} min — notify now`)
                    : t("Aguarda comunicação / readback", "Awaiting notification / readback")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Main */}
              <div className="space-y-4 lg:col-span-2">
                {/* Clinical context */}
                <section
                  className={`relative overflow-hidden rounded-2xl border p-4 pl-5 shadow-sm backdrop-blur-md
                    before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${high ? "before:bg-rose-500" : "before:bg-sky-500"}
                    ${high ? "border-rose-200/50 bg-rose-50/45 dark:border-rose-900/30 dark:bg-rose-950/20" : "border-sky-200/50 bg-sky-50/45 dark:border-sky-900/30 dark:bg-sky-950/20"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text)]">{val(d?.patient_name)}</span>
                        {d?.order ? (
                          <Link
                            href={`/clinical-laboratory/orders/${encodeURIComponent(String(d.order))}`}
                            className="shrink-0 rounded-md border border-white/40 bg-white/50 px-1.5 py-0.5 font-mono text-[11px] text-[var(--primary-600)] backdrop-blur-sm hover:bg-white/70 dark:border-white/10 dark:bg-white/5"
                            title={t("Abrir requisição", "Open requisition")}
                          >
                            {String(d?.order_code || `#${d.order}`)}
                          </Link>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--gray-500)]">
                        <span className="font-medium text-[var(--gray-700)] dark:text-[var(--gray-300)]">{val(d?.test_name)}</span>
                        {d?.field_name ? <span>· {String(d.field_name)}</span> : null}
                        <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeAgo(d?.notified_at, t)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`flex items-baseline justify-end gap-1 ${valueTone}`}>
                        <span className="text-3xl font-bold leading-none tabular-nums">{value || "—"}</span>
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

                {/* Communication */}
                <Card title={t("Comunicação", "Notification")} icon={<Phone size={13} />}>
                  <Row2 label={t("Profissional notificado", "Notified professional")}>{val(d?.notified_professional)}</Row2>
                  <Row2 label={t("Método", "Method")}>{methodLabel}</Row2>
                  <Row2 label={t("Notificado em", "Notified at")}>{fmtDateTime(d?.notified_at)}</Row2>
                  <Row2 label={t("Notificado por", "Notified by")}>{val(d?.notified_by)}</Row2>
                  <Row2 label={t("Readback confirmado", "Readback confirmed")}>
                    {confirmed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={13} /> {t("Sim", "Yes")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">{t("Não", "No")}</span>
                    )}
                  </Row2>
                  {String(d?.notes ?? "").trim() ? (
                    <div className="py-1.5">
                      <span className="text-xs text-[var(--gray-500)]">{t("Observações", "Notes")}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">{String(d.notes)}</p>
                    </div>
                  ) : null}
                </Card>
              </div>

              {/* Side */}
              <div className="space-y-4">
                {/* Timeline */}
                <section className={`p-4 ${GLASS}`}>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    <Activity size={13} /> {t("Fluxo", "Workflow")}
                  </div>
                  <ol>
                    <Step
                      done
                      icon={<Bell size={13} />}
                      title={t("Resultado crítico detetado", "Critical result detected")}
                      detail={fmtDateTime(d?.created_at || d?.notified_at)}
                    />
                    <Step
                      done={!!notified}
                      current={!notified && !confirmed}
                      icon={<Phone size={13} />}
                      title={t("Comunicado ao clínico", "Notified to clinician")}
                      detail={notified ? `${notified} · ${methodLabel}` : t("Pendente", "Pending")}
                    />
                    <Step
                      done={confirmed}
                      current={!!notified && !confirmed}
                      icon={<CheckCircle2 size={13} />}
                      title={t("Readback confirmado", "Readback confirmed")}
                      detail={confirmed ? fmtDateTime(d?.updated_at) : t("Pendente", "Pending")}
                    />
                  </ol>
                </section>

                {/* Audit */}
                <Card title={t("Auditoria", "Audit")} icon={<History size={13} />}>
                  <Row2 label={t("Código", "Code")}><span className="inline-flex items-center gap-1 font-mono text-xs"><Hash size={11} />{val(d?.custom_id)}</span></Row2>
                  {d?.institution_name || d?.institution ? (
                    <Row2 label={t("Instituição", "Institution")}><span className="inline-flex items-center gap-1"><Building2 size={12} />{val(d?.institution_name || d?.institution)}</span></Row2>
                  ) : null}
                  <Row2 label={t("Criado em", "Created at")}>{fmtDateTime(d?.created_at)}</Row2>
                  <Row2 label={t("Criado por", "Created by")}><span className="inline-flex items-center gap-1"><User size={12} />{val(d?.created_by)}</span></Row2>
                  <Row2 label={t("Atualizado em", "Updated at")}>{fmtDateTime(d?.updated_at)}</Row2>
                  <Row2 label={t("Atualizado por", "Updated by")}><span className="inline-flex items-center gap-1"><User size={12} />{val(d?.updated_by)}</span></Row2>
                  {d?.version != null ? <Row2 label={t("Versão", "Version")}>{String(d.version)}</Row2> : null}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
