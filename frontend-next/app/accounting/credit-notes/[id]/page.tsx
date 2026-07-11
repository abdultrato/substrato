"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, ClipboardList, FileText, User } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"

type CreditNote = Record<string, any>

const STATUS_META: Record<string, { label: string; accent: string; badge: string }> = {
  PEND: { label: "Pendente", accent: "bg-amber-500", badge: "border-amber-300/50 bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  APRO: { label: "Aprovada", accent: "bg-emerald-500", badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  REJE: { label: "Rejeitada", accent: "bg-red-500", badge: "border-red-300/50 bg-red-500/15 text-red-600 dark:text-red-400" },
  CANC: { label: "Cancelada", accent: "bg-slate-400", badge: "border-white/30 bg-white/10 text-[var(--gray-600)] dark:text-[var(--gray-300)]" },
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{value || "-"}</p>
      </div>
    </div>
  )
}

export default function CreditNoteRequestDetailPage() {
  const params = useParams()
  const id = String((params as any)?.id ?? "")
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [data, setData] = useState<CreditNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<CreditNote>(`/billing/credit-note-request/${id}/`, {
          clientCache: safeRefreshToken === 0,
        })
        if (mounted) setData(res)
      } catch (e: any) {
        if (mounted) setErro(isNotFoundLikeError(e) ? "Pedido não encontrado." : (e?.message || "Falha ao carregar o pedido."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (id) load()
    return () => {
      mounted = false
    }
  }, [id, safeRefreshToken])

  const status = String(data?.status || "").toUpperCase()
  const meta = STATUS_META[status] || STATUS_META.PEND
  const code = String(data?.custom_id || `#${id}`)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE]}>
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : erro ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">{erro}</div>
            <Link href="/accounting/credit-notes" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-semibold text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              <ArrowLeft size={13} /> Voltar
            </Link>
          </div>
        ) : data ? (
          <>
            {/* Cabeçalho */}
            <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className={`absolute left-0 top-0 h-full w-1.5 ${meta.accent}`} />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
                    <ClipboardList size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Nota de crédito</p>
                    <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{code}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${meta.badge}`}>
                    {String(data?.status_display || meta.label)}
                  </span>
                  <Link href="/accounting/credit-notes" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-semibold text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                    <ArrowLeft size={13} /> Voltar
                  </Link>
                </div>
              </div>
            </section>

            {/* Metadados */}
            <div className="grid gap-2 sm:grid-cols-3">
              <MetaItem icon={<FileText size={15} />} label="Fatura" value={String(data?.invoice_code || "-")} />
              <MetaItem icon={<User size={15} />} label="Paciente" value={String(data?.patient_name || "-")} />
              <MetaItem icon={<ClipboardList size={15} />} label="Consulta" value={String(data?.consultation_code || "-")} />
            </div>

            {/* Valor */}
            <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary-500)]" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Valor solicitado</p>
              <MoneyValue value={data?.amount} className="text-xl font-bold text-black dark:text-white" />
            </section>

            {/* Motivo */}
            <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
                  <ClipboardList size={15} />
                </span>
                <h3 className="text-sm font-semibold text-[var(--text)]">Motivo</h3>
              </div>
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-black dark:text-white">
                  {String(data?.reason || "—")}
                </p>
              </div>
            </section>

            {/* Auditoria da decisão */}
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaItem icon={<User size={15} />} label="Solicitado por" value={`${data?.requested_by_name || "-"} · ${fmtDate(data?.created_at)}`} />
              <MetaItem icon={<User size={15} />} label="Decidido por" value={data?.reviewed_by_name ? `${data.reviewed_by_name} · ${fmtDate(data?.reviewed_at)}` : "—"} />
            </div>

            {data?.decision_note ? (
              <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                <span className={`absolute left-0 top-0 h-full w-1.5 ${meta.accent}`} />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Nota da decisão</p>
                <p className="mt-0.5 text-sm italic text-[var(--text)]">&quot;{data.decision_note}&quot;</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
