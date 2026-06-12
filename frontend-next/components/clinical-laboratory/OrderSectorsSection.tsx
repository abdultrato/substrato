"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

type SectorChip = {
  key: string
  name: string
  code?: string
}

type TestMeta = {
  sectorKey?: string
  sectorName?: string
  sectorCode?: string
}

const ORDER_ITEM_ENDPOINT = "/clinical_laboratory/order_item/"
const TEST_ENDPOINT = "/clinical_laboratory/test/"

function text(value: any): string {
  return value === null || value === undefined ? "" : String(value).trim()
}

function sectorChipFromValues(params: {
  sector?: any
  sectorName?: any
  sectorCode?: any
}): SectorChip | null {
  const key = text(params.sector) || text(params.sectorCode) || text(params.sectorName)
  if (!key) return null
  const code = text(params.sectorCode)
  const name = text(params.sectorName) || code || `#${key}`
  return { key, name, code: code || undefined }
}

function testMetaFromRow(test: Row): TestMeta {
  return {
    sectorKey: text(test?.sector),
    sectorName: text(test?.sector_name),
    sectorCode: text(test?.sector_code),
  }
}

export default function OrderSectorsSection() {
  const params = useParams()
  const orderId = routeParamToString((params as any)?.id)
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const itemsQuery = useQuery({
    queryKey: ["lab-order-sectors-items", orderId, safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(ORDER_ITEM_ENDPOINT, {
        query: { order: orderId },
        pageSize: 200,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!orderId,
  })

  const testsQuery = useQuery({
    queryKey: ["lab-order-sectors-tests", safeRefreshToken],
    queryFn: async () =>
      await apiFetchList<Row>(TEST_ENDPOINT, {
        pageSize: 500,
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!orderId,
  })

  const testMetaById = useMemo(() => {
    const map = new Map<string, TestMeta>()
    for (const test of testsQuery.data?.items ?? []) {
      const key = text(test?.id)
      if (!key) continue
      map.set(key, testMetaFromRow(test))
    }
    return map
  }, [testsQuery.data])

  const sectors = useMemo(() => {
    const byKey = new Map<string, SectorChip>()
    for (const item of itemsQuery.data?.items ?? []) {
      const testMeta = testMetaById.get(text(item?.test))
      const chip = sectorChipFromValues({
        sector: item?.sector ?? testMeta?.sectorKey,
        sectorName: item?.sector_name ?? testMeta?.sectorName,
        sectorCode: item?.sector_code ?? testMeta?.sectorCode,
      })
      if (chip && !byKey.has(chip.key)) byKey.set(chip.key, chip)
    }
    return Array.from(byKey.values())
  }, [itemsQuery.data, testMetaById])

  const isLoading = itemsQuery.isLoading || testsQuery.isLoading
  const error = itemsQuery.error || testsQuery.error

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {t("Sectores", "Sectors")}
        </h2>
        <span className="text-xs text-[var(--gray-500)]">
          {sectors.length ? `${sectors.length}` : ""}
        </span>
      </header>

      {isLoading ? (
        <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {(error as any)?.message ||
            t("Falha ao carregar sectores do pedido.", "Failed to load order sectors.")}
        </div>
      ) : sectors.length ? (
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <span
              key={sector.key}
              className="inline-flex min-h-8 items-center rounded-md border border-[var(--border)] bg-[var(--gray-50)] px-3 text-sm font-medium text-[var(--text)]"
            >
              {sector.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--gray-500)]">
          {t("Este pedido ainda não tem sectores.", "This order has no sectors yet.")}
        </div>
      )}
    </section>
  )
}
