"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, CheckCircle2, Clock, Phone } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import DataTable from "@/components/ui/DataTable"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type Row = Record<string, any>

const ENDPOINT = "/clinical_laboratory/critical_notification/"

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

/**
 * Painel de resultados críticos: cada resultado fora dos limiares críticos é
 * auto-detetado e surge aqui (segunda camada gerada pelo backend), com a
 * requisição, exame/campo, valor e flag visíveis. A comunicação ao profissional
 * e a confirmação de readback fazem-se em contexto.
 */
export default function CriticalResultsBoard() {
  useAuthGuard()
  const { t, tr } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [scope, setScope] = useState<"pending" | "all">("pending")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["lab-critical-results", scope, safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(ENDPOINT, {
        query: scope === "pending" ? { readback_confirmed: false } : {},
        pageSize: 200,
        clientCache: false,
      }),
  })

  const items = query.data?.items ?? []

  async function confirmReadback(id: string) {
    setBusyId(id)
    setActionError(null)
    try {
      await apiFetch(`${ENDPOINT}${encodeURIComponent(id)}/`, {
        method: "PATCH",
        body: JSON.stringify({ readback_confirmed: true }),
      })
      await query.refetch()
    } catch (e: any) {
      setActionError(e?.message || t("Falha ao confirmar readback.", "Failed to confirm readback."))
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: t("Paciente", "Patient"),
        render: (row: Row) => (
          <Link
            href={`/clinical-laboratory/critical-results/${encodeURIComponent(String(row?.id))}`}
            className="font-medium text-[var(--text)] hover:underline"
          >
            {String(row?.patient_name || "-")}
          </Link>
        ),
        className: "min-w-[160px]",
      },
      {
        header: t("Requisição", "Requisition"),
        render: (row: Row) =>
          row?.order ? (
            <Link
              href={`/clinical-laboratory/orders/${encodeURIComponent(String(row.order))}`}
              className="font-mono text-xs text-[var(--primary-600)] hover:underline"
            >
              {String(row?.order_code || `#${row.order}`)}
            </Link>
          ) : (
            <span className="text-[var(--gray-400)]">-</span>
          ),
        className: "min-w-[130px]",
      },
      {
        header: t("Exame / Campo", "Test / Field"),
        render: (row: Row) => {
          const test = String(row?.test_name || "").trim()
          const field = String(row?.field_name || "").trim()
          return (
            <div className="min-w-0">
              <div className="truncate text-[var(--text)]">{test || "-"}</div>
              {field ? <div className="truncate text-xs text-[var(--gray-500)]">{field}</div> : null}
            </div>
          )
        },
        className: "min-w-[180px]",
      },
      {
        header: t("Valor", "Value"),
        render: (row: Row) => {
          const value = String(row?.result_value || "").trim()
          const unit = String(row?.result_unit || "").trim()
          return value ? `${value}${unit ? ` ${unit}` : ""}` : "-"
        },
        className: "whitespace-nowrap font-medium min-w-[100px]",
      },
      {
        header: t("Flag", "Flag"),
        render: (row: Row) => {
          const flag = String(row?.result_flag || "")
          const label = String(row?.result_flag_display || flag || "-")
          const isHigh = flag === "CRITICO_ALTO"
          const isLow = flag === "CRITICO_BAIXO"
          return (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/25 dark:text-red-300">
              {isHigh ? <ArrowUp size={12} /> : isLow ? <ArrowDown size={12} /> : null}
              {tr(label)}
            </span>
          )
        },
        className: "whitespace-nowrap min-w-[120px]",
      },
      {
        header: t("Comunicado a", "Notified to"),
        render: (row: Row) => {
          const prof = String(row?.notified_professional || "").trim()
          if (!prof) return <span className="text-[var(--gray-400)]">{t("—", "—")}</span>
          const method = String(row?.method || "").trim()
          return (
            <div className="min-w-0">
              <div className="truncate text-[var(--text)]">{prof}</div>
              {method ? <div className="truncate text-xs text-[var(--gray-500)]">{tr(method)}</div> : null}
            </div>
          )
        },
        className: "min-w-[150px]",
      },
      {
        header: t("Readback", "Readback"),
        render: (row: Row) =>
          row?.readback_confirmed ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">
              <CheckCircle2 size={12} />
              {t("Confirmado", "Confirmed")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/25 dark:text-amber-300">
              <Clock size={12} />
              {t("Pendente", "Pending")}
            </span>
          ),
        className: "whitespace-nowrap min-w-[120px]",
      },
      {
        header: t("Detetado em", "Detected at"),
        render: (row: Row) => fmtDate(row?.notified_at),
        className: "whitespace-nowrap text-xs text-[var(--gray-500)] min-w-[140px]",
      },
      {
        header: "",
        render: (row: Row) => {
          const id = String(row?.id)
          if (row?.readback_confirmed) {
            return (
              <Link
                href={`/clinical-laboratory/critical-results/${encodeURIComponent(id)}/edit`}
                className="text-xs text-[var(--gray-500)] hover:text-[var(--text)]"
              >
                {t("Editar", "Edit")}
              </Link>
            )
          }
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/clinical-laboratory/critical-results/${encodeURIComponent(id)}/edit`}
                className="inline-flex items-center gap-1 text-xs text-[var(--gray-600)] hover:text-[var(--text)]"
              >
                <Phone size={12} />
                {t("Comunicar", "Notify")}
              </Link>
              <button
                type="button"
                onClick={() => confirmReadback(id)}
                disabled={busyId === id}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--primary-600)] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
              >
                <CheckCircle2 size={12} />
                {busyId === id ? t("A confirmar...", "Confirming...") : t("Confirmar readback", "Confirm readback")}
              </button>
            </div>
          )
        },
        className: "whitespace-nowrap text-right min-w-[200px]",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tr, busyId]
  )

  const scopeButton = (key: "pending" | "all", label: string) => (
    <button
      type="button"
      onClick={() => setScope(key)}
      className={`h-8 rounded-md px-3 text-xs font-semibold transition ${
        scope === key
          ? "bg-[var(--primary-600)] text-white shadow-sm"
          : "border border-[var(--border)] bg-[var(--card)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
      }`}
    >
      {label}
    </button>
  )

  return (
    <AppLayout>
      <PageHeader
        title={t("Resultados críticos", "Critical results")}
        actions={
          <div className="flex items-center gap-2">
            {scopeButton("pending", t("Pendentes", "Pending"))}
            {scopeButton("all", t("Todos", "All"))}
          </div>
        }
      />

      {actionError ? (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="p-4 text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      ) : query.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(query.error as any)?.message ||
            t("Falha ao carregar resultados críticos.", "Failed to load critical results.")}
        </div>
      ) : (
        <DataTable<Row>
          columns={columns as any}
          data={items}
          searchable
          searchKeys={["patient_name", "order_code", "test_name", "field_name", "notified_professional"]}
          searchPlaceholder={t("Pesquisar por paciente, requisição, exame...", "Search by patient, requisition, test...")}
          emptyMessage={
            scope === "pending"
              ? t("Sem resultados críticos pendentes.", "No pending critical results.")
              : t("Sem resultados críticos.", "No critical results.")
          }
        />
      )}
    </AppLayout>
  )
}
