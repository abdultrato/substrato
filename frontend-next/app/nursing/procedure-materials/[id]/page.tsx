"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Package2,
  Pill,
  Receipt,
  Stethoscope,
  Tag,
  TriangleAlert,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

type ProcedureMaterialDetail = Record<string, any> & {
  id?: number
  custom_id?: string | null
  procedure?: number | null
  procedure_code?: string | null
  procedure_item?: number | null
  product?: number | null
  product_name?: string | null
  product_type?: string | null
  lot?: number | null
  lot_number?: string | null
  ward_name?: string | null
  quantity?: number | null
  position?: number | null
  inventory_movement?: number | null
  value_unitario?: string | number | null
  observation?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—"
  const amount = Number(value)
  if (!Number.isFinite(amount)) return "—"
  return amount.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCount(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—"
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString("pt-PT")
}

function val(record: Record<string, any> | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const candidate = record?.[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return candidate
    }
  }
  return null
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-2.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="min-w-0 text-sm leading-relaxed text-foreground">{value || "—"}</div>
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  icon: typeof Stethoscope
  accent: string
  children: ReactNode
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-3 flex items-start gap-3">
          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="divide-y divide-border/60">{children}</div>
      </div>
    </section>
  )
}

export default function ProcedureMaterialsDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [data, setData] = useState<ProcedureMaterialDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const detailEndpoint = ensureTrailingSlash("/nursing/procedure_material/") + `${id}/`
      const response = await apiFetch<ProcedureMaterialDetail>(detailEndpoint, {
        clientCache: safeRefreshToken === 0,
      })
      setData(response)
    } catch (reason: any) {
      setData(null)
      setError(isNotFoundLikeError(reason) ? null : reason?.message || "Falha ao carregar material.")
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  const title = useMemo(() => {
    if (!data) return `Material #${id}`
    return (
      val(data, "product_name", "custom_id") ||
      `Material #${id}`
    )
  }, [data, id])

  const quantity = Number(data?.quantity || 0)
  const unitCost = Number(data?.value_unitario)
  const totalCost = Number.isFinite(unitCost) ? quantity * unitCost : null
  const allocated = Boolean(data?.inventory_movement)

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Material não encontrado."}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                  <Package2 size={17} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {allocated ? "Material movimentado" : "Material pendente"} · {data.custom_id || `MAT-${data.id}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/nursing/procedure-materials"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Identificação"
            subtitle="Chave do registo e controlo temporal."
            icon={Tag}
            accent="bg-violet-500"
          >
            <FieldRow label="Código" value={data.custom_id || `MAT-${data.id}`} />
            <FieldRow label="Criado em" value={fmtDate(data.created_at)} />
            <FieldRow label="Atualizado em" value={fmtDate(data.updated_at)} />
            <FieldRow label="Posição" value={fmtCount(data.position)} />
          </SectionCard>

          <SectionCard
            title="Procedimento"
            subtitle="Contexto clínico onde o material foi aplicado."
            icon={Stethoscope}
            accent="bg-sky-500"
          >
            <FieldRow label="Procedimento" value={val(data, "procedure_code", "procedure") || "—"} />
            <FieldRow label="Item do procedimento" value={val(data, "procedure_item") || "—"} />
            <FieldRow label="Enfermaria" value={val(data, "ward_name") || "—"} />
            <FieldRow label="Movimento inventário" value={val(data, "inventory_movement") || "—"} />
          </SectionCard>

          <SectionCard
            title="Produto"
            subtitle="Descrição comercial e lote rastreável."
            icon={Pill}
            accent="bg-emerald-500"
          >
            <FieldRow label="Produto" value={val(data, "product_name", "product") || "—"} />
            <FieldRow label="Tipo" value={val(data, "product_type") || "—"} />
            <FieldRow label="Lote" value={val(data, "lot_number", "lot") || "—"} />
            <FieldRow label="Quantidade" value={fmtCount(data.quantity)} />
          </SectionCard>

          <SectionCard
            title="Quantidade e custo"
            subtitle="Valores usados para cálculo e conferência."
            icon={Receipt}
            accent="bg-amber-500"
          >
            <FieldRow label="Quantidade" value={fmtCount(data.quantity)} />
            <FieldRow label="Custo unitário" value={fmtMoney(data.value_unitario)} />
            <FieldRow label="Total" value={fmtMoney(totalCost)} />
            <FieldRow label="Movimentado" value={allocated ? "Sim" : "Não"} />
          </SectionCard>
        </div>

        <SectionCard
          title="Observações"
          subtitle="Notas livres e detalhes operacionais."
          icon={TriangleAlert}
          accent="bg-rose-500"
        >
          <FieldRow label="Observação" value={data.observation || "—"} />
          <FieldRow label="Resumo" value={`${data.product_name || "Material"} · ${data.product_type || "Produto"} · ${data.lot_number ? `Lote ${data.lot_number}` : "Sem lote"} `} />
          <FieldRow label="Identificador" value={data.custom_id || `MAT-${data.id}`} />
        </SectionCard>
      </div>
    </AppLayout>
  )
}
