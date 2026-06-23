"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ListPlus, Pencil } from "lucide-react"

import DataTable from "@/components/ui/DataTable"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const TEST_FIELD_ENDPOINT = "/clinical_laboratory/test_field/"

function pickCode(row: Row): string {
  return String(row?.code || row?.custom_id || row?.id || "-")
}

function fmtRange(low: any, high: any, fallback?: any): string {
  const hasLow = low !== null && low !== undefined && low !== ""
  const hasHigh = high !== null && high !== undefined && high !== ""
  if (!hasLow && !hasHigh) {
    const text = String(fallback ?? "").trim()
    return text || "-"
  }
  return `${hasLow ? Number(low) : "−∞"} – ${hasHigh ? Number(high) : "+∞"}`
}

/**
 * Campos/analitos de um exame (ExameCampo), renderizados como segunda camada
 * dentro do detalhe do exame (`?test=<id>`). Os limiares definidos aqui é que
 * determinam automaticamente os resultados críticos. A criação/edição acontece
 * em contexto, com o exame pré-selecionado.
 */
export default function TestFieldsSection() {
  const params = useParams()
  const testId = routeParamToString((params as any)?.id)
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const fieldsQuery = useQuery({
    queryKey: ["lab-test-fields", testId, safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(TEST_FIELD_ENDPOINT, {
        query: { test: testId },
        pageSize: 200,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!testId,
  })

  const items = fieldsQuery.data?.items ?? []

  const columns = useMemo(
    () => [
      {
        header: t("Código", "Code"),
        render: (row: Row) => pickCode(row),
        className: "min-w-[100px] font-mono text-xs text-[var(--gray-500)]",
      },
      {
        header: t("Campo", "Field"),
        render: (row: Row) => (
          <Link
            href={`/clinical-laboratory/test-fields/${encodeURIComponent(String(row?.id))}/edit`}
            className="font-medium text-[var(--text)] hover:underline"
          >
            {String(row?.name || "-")}
          </Link>
        ),
        className: "min-w-[200px]",
      },
      {
        header: t("Unidade", "Unit"),
        render: (row: Row) => String(row?.unit || "-"),
        className: "min-w-[90px]",
      },
      {
        header: t("Referência", "Reference"),
        render: (row: Row) => fmtRange(row?.reference_low, row?.reference_high, row?.reference_range),
        className: "whitespace-nowrap min-w-[130px]",
      },
      {
        header: t("Crítico", "Critical"),
        render: (row: Row) => {
          const txt = fmtRange(row?.critical_low, row?.critical_high)
          return txt === "-" ? (
            <span className="text-[var(--gray-400)]">{txt}</span>
          ) : (
            <span className="font-medium text-red-600 dark:text-red-400">{txt}</span>
          )
        },
        className: "whitespace-nowrap min-w-[130px]",
      },
      {
        header: "",
        render: (row: Row) => (
          <Link
            href={`/clinical-laboratory/test-fields/${encodeURIComponent(String(row?.id))}/edit`}
            className="inline-flex items-center gap-1 text-xs text-[var(--gray-500)] hover:text-[var(--text)]"
          >
            <Pencil size={12} />
            {t("Editar", "Edit")}
          </Link>
        ),
        className: "whitespace-nowrap text-right min-w-[80px]",
      },
    ],
    [t]
  )

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t("Campos do exame", "Test fields")}
          </h2>
          <span className="text-xs text-[var(--gray-500)]">
            {fieldsQuery.isSuccess ? `${items.length}` : ""}
          </span>
        </div>
        {testId ? (
          <Link
            href={`/clinical-laboratory/test-fields/new?test=${encodeURIComponent(testId)}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
          >
            <ListPlus size={13} />
            {t("Adicionar campo", "Add field")}
          </Link>
        ) : null}
      </header>

      {fieldsQuery.isLoading ? (
        <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      ) : fieldsQuery.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(fieldsQuery.error as any)?.message ||
            t("Falha ao carregar campos do exame.", "Failed to load test fields.")}
        </div>
      ) : (
        <DataTable<Row>
          columns={columns as any}
          data={items}
          emptyMessage={t(
            "Este exame ainda não tem campos. Adicione campos com limiares críticos para deteção automática.",
            "This test has no fields yet. Add fields with critical thresholds for automatic detection."
          )}
          searchable={false}
        />
      )}
    </section>
  )
}
