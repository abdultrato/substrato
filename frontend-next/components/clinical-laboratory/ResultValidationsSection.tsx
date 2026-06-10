"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"

import DataTable from "@/components/ui/DataTable"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const VALIDATION_ENDPOINT = "/clinical_laboratory/validation/"

function pickCode(row: Row): string {
  return String(row?.custom_id || row?.id_custom || row?.codigo || row?.code || row?.id || "-")
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/**
 * Validações de um resultado, renderizadas como segunda camada dentro do
 * detalhe do resultado (`?result=<id>`). A criação acontece em contexto, com o
 * resultado pré-selecionado — nunca como recurso solto.
 * Ver FRONTEND_API_EXPOSURE_MATRIX.md / readiness/clinical_laboratory.md.
 */
export default function ResultValidationsSection() {
  const params = useParams()
  const resultId = routeParamToString((params as any)?.id)
  const { t, tr } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const validationsQuery = useQuery({
    queryKey: ["lab-result-validations", resultId, safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(VALIDATION_ENDPOINT, {
        query: { result: resultId },
        pageSize: 100,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!resultId,
  })

  const items = validationsQuery.data?.items ?? []

  const columns = useMemo(
    () => [
      {
        header: t("Código", "Code"),
        render: (row: Row) => pickCode(row),
        className: "min-w-[120px] font-medium",
      },
      {
        header: t("Tipo", "Type"),
        render: (row: Row) => {
          const value = String(row?.validation_type || "").trim()
          return value ? tr(value) : "-"
        },
        className: "min-w-[140px]",
      },
      {
        header: t("Estado", "Status"),
        render: (row: Row) => {
          const value = String(row?.status || row?.estado || "").trim()
          return value ? tr(value) : "-"
        },
        className: "min-w-[120px]",
      },
      {
        header: t("Validado em", "Validated at"),
        render: (row: Row) => fmtDate(row?.validated_at),
        className: "whitespace-nowrap min-w-[160px]",
      },
    ],
    [t, tr]
  )

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {t("Validações", "Validations")}
        </h2>
        {resultId ? (
          <Link
            href={`/clinical-laboratory/validations/new?result=${encodeURIComponent(resultId)}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
          >
            <ShieldCheck size={13} />
            {t("Registar validação", "Add validation")}
          </Link>
        ) : null}
      </header>

      {validationsQuery.isLoading ? (
        <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      ) : validationsQuery.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(validationsQuery.error as any)?.message ||
            t("Falha ao carregar validações.", "Failed to load validations.")}
        </div>
      ) : (
        <DataTable<Row>
          columns={columns as any}
          data={items}
          emptyMessage={t("Este resultado ainda não tem validações.", "This result has no validations yet.")}
          searchable={false}
        />
      )}
    </section>
  )
}
