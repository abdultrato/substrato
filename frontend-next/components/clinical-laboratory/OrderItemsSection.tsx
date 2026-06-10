"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import DataTable from "@/components/ui/DataTable"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

const ORDER_ITEM_ENDPOINT = "/clinical_laboratory/order_item/"
const TEST_ENDPOINT = "/clinical_laboratory/test/"

function pickCode(row: Row): string {
  return String(row?.custom_id || row?.id_custom || row?.codigo || row?.code || row?.id || "-")
}

function fmtMoney(value: any): string {
  if (value === null || value === undefined || value === "") return "-"
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : String(value)
}

/**
 * Renderiza os itens de um pedido laboratorial como segunda camada dentro do
 * detalhe da requisição (`?order=<id>`). Itens não devem aparecer como lista
 * solta no frontend — ver FRONTEND_EXPOSURE_BACKLOG.md / readiness.
 */
export default function OrderItemsSection() {
  const params = useParams()
  const orderId = routeParamToString((params as any)?.id)
  const { t, tr } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const itemsQuery = useQuery({
    queryKey: ["lab-order-items", orderId, safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(ORDER_ITEM_ENDPOINT, {
        query: { order: orderId },
        pageSize: 200,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!orderId,
  })

  const testsQuery = useQuery({
    queryKey: ["lab-tests-name-map", safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(TEST_ENDPOINT, {
        pageSize: 500,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!orderId,
  })

  const testNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const test of testsQuery.data?.items ?? []) {
      const key = String(test?.id ?? "")
      if (!key) continue
      const label = String(test?.name || test?.nome || test?.code || test?.custom_id || "").trim()
      if (label) map.set(key, label)
    }
    return map
  }, [testsQuery.data])

  const items = itemsQuery.data?.items ?? []

  const columns = useMemo(
    () => [
      {
        header: t("Código", "Code"),
        render: (row: Row) => pickCode(row),
        className: "min-w-[120px] font-medium",
      },
      {
        header: t("Exame", "Test"),
        render: (row: Row) => {
          const testKey = String(row?.test ?? "")
          return testNameById.get(testKey) || (testKey ? `#${testKey}` : "-")
        },
        className: "min-w-[200px]",
      },
      {
        header: t("Estado", "Status"),
        render: (row: Row) => {
          const status = String(row?.status || row?.estado || "").trim()
          return status ? tr(status) : "-"
        },
        className: "min-w-[120px]",
      },
      {
        header: t("Preço", "Price"),
        render: (row: Row) => fmtMoney(row?.price),
        className: "whitespace-nowrap text-right min-w-[100px]",
      },
    ],
    [t, tr, testNameById]
  )

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {t("Itens do pedido", "Order items")}
        </h2>
        <span className="text-xs text-[var(--gray-500)]">
          {itemsQuery.isSuccess ? `${items.length}` : ""}
        </span>
      </header>

      {itemsQuery.isLoading ? (
        <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      ) : itemsQuery.isError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(itemsQuery.error as any)?.message ||
            t("Falha ao carregar itens do pedido.", "Failed to load order items.")}
        </div>
      ) : (
        <DataTable<Row>
          columns={columns as any}
          data={items}
          emptyMessage={t("Este pedido ainda não tem exames.", "This order has no tests yet.")}
          searchable={false}
        />
      )}
    </section>
  )
}
