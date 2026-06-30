"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, BarChart3 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

type UserOption = { id: number; username: string; displayName: string }

export default function FaturasRelatoriosPage() {
  const { loading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [reportUsers, setReportUsers] = useState<UserOption[]>([])
  const [reportUserId, setReportUserId] = useState<string>("__all__")
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear())
  const [reportDate, setReportDate] = useState<string>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1)
  const [reportQuarter, setReportQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1)
  const [reportSemester, setReportSemester] = useState<number>(new Date().getMonth() + 1 <= 6 ? 1 : 2)
  const [reportLoading, setReportLoading] = useState<
    | null
    | "daily"
    | "monthly"
    | "quarterly"
    | "semiannual"
    | "annual"
    | "general-daily"
    | "general-monthly"
    | "general-annual"
  >(null)
  const [reportUsersLoading, setReportUsersLoading] = useState(false)
  const [reportUsersError, setReportUsersError] = useState<string | null>(null)

  const carregarUtilizadores = useCallback(async () => {
    try {
      setReportUsersLoading(true)
      setReportUsersError(null)
      const res = await apiFetch<any>("/identity/user/?page_size=500", { clientCache: safeRefreshToken === 0 })
      const items = res && res.results ? res.results : res
      const rows = Array.isArray(items) ? items : []
      const options: UserOption[] = rows.map((row: any) => {
        const firstName = String(row.first_name || "").trim()
        const lastName = String(row.last_name || "").trim()
        const fullName = `${firstName} ${lastName}`.trim()
        const username = String(row.username || "")
        return {
          id: Number(row.id),
          username,
          displayName: fullName || username || `Utilizador ${row.id}`,
        }
      })
      setReportUsers(options)
    } catch (e: any) {
      setReportUsers([])
      setReportUsersError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar utilizadores."))
    } finally {
      setReportUsersLoading(false)
    }
  }, [safeRefreshToken])

  useEffect(() => {
    carregarUtilizadores()
  }, [carregarUtilizadores])

  const downloadBillingHistoryPdf = useCallback(
    async (period: "daily" | "monthly" | "quarterly" | "semiannual" | "annual", forceAll = false) => {
      try {
        const loadingKey =
          forceAll && period === "daily"
            ? "general-daily"
            : forceAll && period === "monthly"
              ? "general-monthly"
              : forceAll && period === "annual"
                ? "general-annual"
                : period
        setReportLoading(loadingKey)

        const scope = forceAll ? "all" : "user"
        if (!forceAll && (!reportUserId || reportUserId === "__all__")) {
          setErro("Selecione um utilizador específico para gerar histórico individual.")
          return
        }

        const params = new URLSearchParams()
        params.set("period", period)
        params.set("scope", scope)
        params.set("year", String(reportYear))
        if (period === "daily") params.set("date", String(reportDate))
        if (period === "monthly") params.set("month", String(reportMonth))
        if (period === "quarterly") params.set("quarter", String(reportQuarter))
        if (period === "semiannual") params.set("semester", String(reportSemester))
        if (scope === "user") params.set("user_id", String(reportUserId))
        params.set("limit", "300")

        const blob = await apiFetch<Blob>(`/invoices/billing-history/pdf/?${params.toString()}`, {
          responseType: "blob",
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const periodRef = period === "daily" ? reportDate : String(reportYear)
        a.download = `billing_history_${period}_${scope}_${periodRef}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } catch (e: any) {
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar histórico de faturamento."))
      } finally {
        setReportLoading(null)
      }
    },
    [reportDate, reportMonth, reportQuarter, reportSemester, reportUserId, reportYear]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <div className="space-y-4">
        {/* ── Hero ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                <BarChart3 size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Relatórios de faturamento</h1>
                <p className="text-[11px] text-muted-foreground">Histórico por utilizador e geral, em PDF.</p>
              </div>
            </div>
            <Link
              href="/invoices"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft size={15} /> Voltar às faturas
            </Link>
          </div>
        </section>

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
        )}

        <Card glass title="Parâmetros do relatório">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Utilizador</label>
              <select
                aria-label="Utilizador"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportUserId}
                onChange={(e) => setReportUserId(e.target.value)}
                disabled={reportUsersLoading}
              >
                <option value="__all__">Todos os utilizadores</option>
                {reportUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Data (diário)</label>
              <input
                type="date"
                aria-label="Data do relatório diário"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Ano</label>
              <input
                type="number"
                min={2000}
                max={2100}
                aria-label="Ano do relatório"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value || new Date().getFullYear()))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Mês (mensal)</label>
              <select
                aria-label="Mês do relatório mensal"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {String(idx + 1).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Trimestre</label>
              <select
                aria-label="Trimestre do relatório"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportQuarter}
                onChange={(e) => setReportQuarter(Number(e.target.value))}
              >
                <option value={1}>1º trimestre</option>
                <option value={2}>2º trimestre</option>
                <option value={3}>3º trimestre</option>
                <option value={4}>4º trimestre</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Semestre</label>
              <select
                aria-label="Semestre do relatório"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={reportSemester}
                onChange={(e) => setReportSemester(Number(e.target.value))}
              >
                <option value={1}>1º semestre</option>
                <option value={2}>2º semestre</option>
              </select>
            </div>
          </div>

          {reportUsersError ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {reportUsersError}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Histórico por utilizador selecionado</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("daily")}
              >
                <PdfActionLabel loading={reportLoading === "daily"} loadingLabel="Gerando...">Gerar histórico diário</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("monthly")}
              >
                <PdfActionLabel loading={reportLoading === "monthly"} loadingLabel="Gerando...">Gerar histórico mensal</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("quarterly")}
              >
                <PdfActionLabel loading={reportLoading === "quarterly"} loadingLabel="Gerando...">Gerar histórico trimestral</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("semiannual")}
              >
                <PdfActionLabel loading={reportLoading === "semiannual"} loadingLabel="Gerando...">Gerar histórico semestral</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("annual")}
              >
                <PdfActionLabel loading={reportLoading === "annual"} loadingLabel="Gerando...">Gerar histórico anual</PdfActionLabel>
              </button>
            </div>

            <div className="text-xs font-semibold uppercase text-muted-foreground">Histórico geral (todos utilizadores)</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("daily", true)}
              >
                <PdfActionLabel loading={reportLoading === "general-daily"} loadingLabel="Gerando...">Gerar histórico geral diário</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("monthly", true)}
              >
                <PdfActionLabel loading={reportLoading === "general-monthly"} loadingLabel="Gerando...">Gerar histórico geral mensal</PdfActionLabel>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary-200)] px-3 py-2 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-50)] disabled:opacity-50"
                disabled={reportLoading !== null}
                onClick={() => downloadBillingHistoryPdf("annual", true)}
              >
                <PdfActionLabel loading={reportLoading === "general-annual"} loadingLabel="Gerando...">Gerar histórico geral anual</PdfActionLabel>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
