"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
import Card from "@/components/ui/Card"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetchList } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Counts = {
  items: number
  stockLevels: number
  openSalesOrders: number
  activeReservations: number
  shipments: number
  purchaseOrders: number
  replenishmentPlans: number
}

const EMPTY_COUNTS: Counts = {
  items: 0,
  stockLevels: 0,
  openSalesOrders: 0,
  activeReservations: 0,
  shipments: 0,
  purchaseOrders: 0,
  replenishmentPlans: 0,
}

async function countEndpoint(endpoint: string, query?: Record<string, string>): Promise<number> {
  try {
    const { meta } = await apiFetchList(endpoint, {
      page: 1,
      pageSize: 1,
      query,
      timeoutMs: 4000,
      retryOnTimeout: 0,
    })
    return meta.total ?? 0
  } catch (error) {
    if (isNotFoundLikeError(error)) return 0
    throw error
  }
}

export default function WarehousePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [
          items,
          stockLevels,
          openSalesOrders,
          activeReservations,
          shipments,
          purchaseOrders,
          replenishmentPlans,
        ] = await Promise.all([
          countEndpoint("/warehouse/item/"),
          countEndpoint("/warehouse/saldo/"),
          countEndpoint("/warehouse/pedidovenda/", { status: "CONFIRMED" }),
          countEndpoint("/warehouse/reserva/", { status: "ACTIVE" }),
          countEndpoint("/warehouse/expedicao/"),
          countEndpoint("/warehouse/ordemcompra/"),
          countEndpoint("/warehouse/planoreposicao/"),
        ])

        if (!mounted) return
        setCounts({
          items,
          stockLevels,
          openSalesOrders,
          activeReservations,
          shipments,
          purchaseOrders,
          replenishmentPlans,
        })
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || "Falha ao carregar o workspace ERP/WMS.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const value = (number: number) => (loading ? "..." : number)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS]}>
      <div className="space-y-6">
        <PageHeader
          title={t("ERP e WMS", "ERP & WMS")}
          subtitle={t(
            "Controle empresarial de compras, estoque, reservas, separação, expedição e inventário.",
            "Enterprise control for purchasing, stock, reservations, picking, shipping, and inventory."
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/resources/warehouse"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <PackageSearch size={16} />
                {t("Recursos", "Resources")}
              </Link>
              {podeVerAdmin ? (
                <Link
                  href="/admin/warehouse/"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
                >
                  <ShieldCheck size={16} />
                  {t("Administração", "Administration")}
                </Link>
              ) : null}
            </div>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Itens" value={value(counts.items)} hint="SKUs cadastrados" />
          <MetricCard label="Saldos" value={value(counts.stockLevels)} hint="Posições com estoque" />
          <MetricCard label="Pedidos abertos" value={value(counts.openSalesOrders)} hint="Confirmados para reserva" />
          <MetricCard label="Reservas ativas" value={value(counts.activeReservations)} hint="Estoque comprometido" />
          <MetricCard label="Expedições" value={value(counts.shipments)} hint="Saídas comerciais" />
          <MetricCard label="Compras" value={value(counts.purchaseOrders)} hint="Pedidos de abastecimento" />
          <MetricCard label="Reposição" value={value(counts.replenishmentPlans)} hint="Planos de compra automática" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pedidos de compra"
            description="Planeie abastecimento, custos e fornecedores."
            href="/resources/warehouse/ordemcompra"
            icon={ClipboardList}
          />
          <ActionTile
            title="Recebimentos"
            description="Dê entrada física por armazém, localização e lote."
            href="/resources/warehouse/recebimento"
            icon={PackageCheck}
          />
          <ActionTile
            title="Reposição automática"
            description="Calcule faltas por ponto de reposição e gere compra."
            href="/resources/warehouse/planoreposicao"
            icon={ClipboardCheck}
          />
          <ActionTile
            title="Pedidos de venda"
            description="Registe demanda, confirme e reserve estoque."
            href="/resources/warehouse/pedidovenda"
            icon={ShoppingCart}
          />
          <ActionTile
            title="Reservas"
            description="Acompanhe estoque prometido antes da expedição."
            href="/resources/warehouse/reserva"
            icon={ClipboardCheck}
          />
          <ActionTile
            title="Separação"
            description="Gere listas de picking por pedido confirmado."
            href="/resources/warehouse/separacao"
            icon={PackageSearch}
          />
          <ActionTile
            title="Expedição"
            description="Baixe estoque e feche entregas de clientes."
            href="/resources/warehouse/expedicao"
            icon={Truck}
          />
          <ActionTile
            title="Transferências"
            description="Movimente estoque entre localizações internas."
            href="/resources/warehouse/transferencia"
            icon={Repeat}
          />
          <ActionTile
            title="Saldos e inventário"
            description="Audite disponibilidade, reservas e contagens."
            href="/resources/warehouse/saldo"
            icon={Boxes}
          />
        </div>

        <Card title="Fluxo operacional recomendado" subtitle="Da reposição à expedição sem ajuste manual de saldo.">
          <div className="grid gap-3 text-sm text-foreground-2 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="font-semibold text-foreground">1. Planear e abastecer</div>
              <p className="mt-1">Gere reposição por ponto mínimo, crie o pedido de compra e lance o recebimento.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="font-semibold text-foreground">2. Vender</div>
              <p className="mt-1">Confirme o pedido de venda para transformar demanda comercial em compromisso operacional.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="font-semibold text-foreground">3. Reservar e separar</div>
              <p className="mt-1">A reserva bloqueia disponibilidade; a separação orienta a equipe no armazém.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="font-semibold text-foreground">4. Expedir</div>
              <p className="mt-1">A expedição consome a reserva, cria movimento de saída e atualiza o pedido.</p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
