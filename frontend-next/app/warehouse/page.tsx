"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ListChecks,
  PackageCheck,
  PackageSearch,
  Plus,
  RefreshCcw,
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

type WarehouseRow = Record<string, any>

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

type QueueKey =
  | "purchaseOrders"
  | "goodsReceipts"
  | "replenishmentPlans"
  | "salesOrders"
  | "reservations"
  | "pickLists"
  | "shipments"
  | "transfers"
  | "stockLevels"

type Queues = Record<QueueKey, WarehouseRow[]>

const EMPTY_QUEUES: Queues = {
  purchaseOrders: [],
  goodsReceipts: [],
  replenishmentPlans: [],
  salesOrders: [],
  reservations: [],
  pickLists: [],
  shipments: [],
  transfers: [],
  stockLevels: [],
}

type QueueConfig = {
  key: QueueKey
  title: string
  description: string
  resource: string
  href: string
  createHref?: string
  createLabel?: string
  emptyMessage: string
  titleFields: string[]
  detailFields: string[]
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

async function fetchQueue(endpoint: string, query?: Record<string, string>, pageSize = 5): Promise<WarehouseRow[]> {
  try {
    const { items } = await apiFetchList<WarehouseRow>(endpoint, {
      page: 1,
      pageSize,
      query,
      timeoutMs: 5000,
      retryOnTimeout: 0,
      clientCache: false,
    })
    return items
  } catch (error) {
    if (isNotFoundLikeError(error)) return []
    throw error
  }
}

function firstText(row: WarehouseRow, fields: string[]): string {
  for (const field of fields) {
    const value = row?.[field]
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value)
    }
  }
  return ""
}

function recordId(row: WarehouseRow): string {
  return String(row?.id ?? row?.custom_id ?? "")
}

function recordTitle(row: WarehouseRow, fields: string[], fallback: string): string {
  return firstText(row, fields) || fallback
}

function recordDetail(row: WarehouseRow, fields: string[]): string {
  const values = fields
    .map((field) => firstText(row, [field]))
    .filter(Boolean)
  return values.length ? values.join(" · ") : "-"
}

function recordHref(resource: string, row: WarehouseRow): string {
  const id = recordId(row)
  return id ? `/resources/warehouse/${resource}/${id}` : `/resources/warehouse/${resource}`
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    ALLOCATED: "Reservado",
    CANCELLED: "Cancelado",
    CONFIRMED: "Confirmado",
    CONSUMED: "Consumida",
    DRAFT: "Rascunho",
    GENERATED: "Gerado",
    OPEN: "Aberta",
    ORDERED: "Pedido criado",
    PARTIALLY_SHIPPED: "Parcial",
    PICKED: "Separada",
    PICKING: "Em separação",
    POSTED: "Lançado",
    RELEASED: "Liberada",
    SHIPPED: "Expedido",
  }
  return labels[status] || status || "-"
}

function statusClass(status: string): string {
  if (["SHIPPED", "POSTED", "PICKED", "ORDERED", "CONSUMED"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800"
  }
  if (["DRAFT", "OPEN", "CONFIRMED", "GENERATED", "PICKING", "ALLOCATED", "ACTIVE"].includes(status)) {
    return "border-sky-200 bg-sky-50 text-sky-800"
  }
  if (["CANCELLED", "RELEASED"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }
  return "border-border bg-muted text-muted-foreground"
}

function quantitySummary(row: WarehouseRow): string {
  const available = row?.available_quantity
  const quantity = row?.quantity
  const recommended = row?.recommended_quantity
  const ordered = row?.ordered_quantity
  const picked = row?.quantity_picked
  const toPick = row?.quantity_to_pick

  if (available !== undefined && available !== null) return `Disp.: ${available}`
  if (recommended !== undefined && recommended !== null) return `Sug.: ${recommended}`
  if (ordered !== undefined && ordered !== null) return `Qtd.: ${ordered}`
  if (picked !== undefined && toPick !== undefined) return `${picked}/${toPick}`
  if (quantity !== undefined && quantity !== null) return `Qtd.: ${quantity}`
  return ""
}

function QueueCard({ config, rows, loading }: { config: QueueConfig; rows: WarehouseRow[]; loading: boolean }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.description}</p>
          </div>
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-foreground">
            {loading ? "..." : rows.length}
          </span>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {rows.length ? (
          rows.map((row) => {
            const status = String(row?.status || "")
            const qty = quantitySummary(row)
            return (
              <Link
                key={`${config.key}-${recordId(row) || JSON.stringify(row).slice(0, 32)}`}
                href={recordHref(config.resource, row)}
                className="group flex min-h-16 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {recordTitle(row, config.titleFields, "Registo WMS")}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {recordDetail(row, config.detailFields)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                    {qty ? (
                      <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {qty}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ArrowRight size={15} className="shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            )
          })
        ) : (
          <div className="flex min-h-24 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            {loading ? "A carregar fila..." : config.emptyMessage}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-3">
        <Link
          href={config.href}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground-2 transition hover:bg-muted"
        >
          <ListChecks size={13} />
          Abrir fila
        </Link>
        {config.createHref ? (
          <Link
            href={config.createHref}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus size={13} />
            {config.createLabel || `Criar ${config.title.toLocaleLowerCase("pt")}`}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

export default function WarehousePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [queues, setQueues] = useState<Queues>(EMPTY_QUEUES)

  const loadData = useCallback(async () => {
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
        purchaseOrderRows,
        goodsReceiptRows,
        replenishmentPlanRows,
        salesOrderRows,
        reservationRows,
        pickListRows,
        shipmentRows,
        transferRows,
        stockLevelRows,
      ] = await Promise.all([
        countEndpoint("/warehouse/item/"),
        countEndpoint("/warehouse/stock_level/"),
        countEndpoint("/warehouse/sales_order/", { status: "CONFIRMED" }),
        countEndpoint("/warehouse/stock_reservation/", { status: "ACTIVE" }),
        countEndpoint("/warehouse/shipment/"),
        countEndpoint("/warehouse/purchase_order/"),
        countEndpoint("/warehouse/replenishment_plan/"),
        fetchQueue("/warehouse/purchase_order/", { status: "DRAFT" }),
        fetchQueue("/warehouse/goods_receipt/", { status: "DRAFT" }),
        fetchQueue("/warehouse/replenishment_plan/"),
        fetchQueue("/warehouse/sales_order/", { status: "CONFIRMED" }),
        fetchQueue("/warehouse/stock_reservation/", { status: "ACTIVE" }),
        fetchQueue("/warehouse/pick_list/", { status: "OPEN" }),
        fetchQueue("/warehouse/shipment/", { status: "DRAFT" }),
        fetchQueue("/warehouse/stock_transfer/", { status: "DRAFT" }),
        fetchQueue("/warehouse/stock_level/", undefined, 6),
      ])

      setCounts({
        items,
        stockLevels,
        openSalesOrders,
        activeReservations,
        shipments,
        purchaseOrders,
        replenishmentPlans,
      })
      setQueues({
        purchaseOrders: purchaseOrderRows,
        goodsReceipts: goodsReceiptRows,
        replenishmentPlans: replenishmentPlanRows,
        salesOrders: salesOrderRows,
        reservations: reservationRows,
        pickLists: pickListRows,
        shipments: shipmentRows,
        transfers: transferRows,
        stockLevels: stockLevelRows,
      })
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar o workspace ERP/WMS.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const value = (number: number) => (loading ? "..." : number)
  const queueConfigs: QueueConfig[] = [
    {
      key: "replenishmentPlans",
      title: "Reposição",
      description: "Planos para gerar sugestões e criar pedidos de compra.",
      resource: "replenishment_plan",
      href: "/resources/warehouse/replenishment_plan",
      createHref: "/resources/warehouse/replenishment_plan/new",
      createLabel: "Criar plano de reposição",
      emptyMessage: "Sem plano de reposição recente.",
      titleFields: ["plan_number", "name", "custom_id"],
      detailFields: ["warehouse_label", "supplier_name", "purchase_order_number"],
    },
    {
      key: "purchaseOrders",
      title: "Compras",
      description: "Pedidos em rascunho antes de abastecer fisicamente.",
      resource: "purchase_order",
      href: "/resources/warehouse/purchase_order",
      createHref: "/resources/warehouse/purchase_order/new",
      createLabel: "Criar pedido de compra",
      emptyMessage: "Sem pedido de compra pendente.",
      titleFields: ["order_number", "name", "custom_id"],
      detailFields: ["supplier_name", "supplier_document", "expected_date"],
    },
    {
      key: "goodsReceipts",
      title: "Recebimentos",
      description: "Entradas físicas por armazém, localização e lote.",
      resource: "goods_receipt",
      href: "/resources/warehouse/goods_receipt",
      createHref: "/resources/warehouse/goods_receipt/new",
      createLabel: "Criar recebimento",
      emptyMessage: "Sem recebimento em rascunho.",
      titleFields: ["receipt_number", "name", "custom_id"],
      detailFields: ["purchase_order_number", "warehouse_label", "received_at"],
    },
    {
      key: "salesOrders",
      title: "Pedidos confirmados",
      description: "Vendas prontas para reserva, separação e expedição.",
      resource: "sales_order",
      href: "/resources/warehouse/sales_order",
      createHref: "/resources/warehouse/sales_order/new",
      createLabel: "Criar pedido de venda",
      emptyMessage: "Sem pedido confirmado a reservar.",
      titleFields: ["order_number", "name", "custom_id"],
      detailFields: ["customer_name", "customer_document", "requested_ship_date"],
    },
    {
      key: "reservations",
      title: "Reservas ativas",
      description: "Estoque já comprometido para pedidos de venda.",
      resource: "stock_reservation",
      href: "/resources/warehouse/stock_reservation",
      emptyMessage: "Sem reserva ativa.",
      titleFields: ["order_number", "custom_id"],
      detailFields: ["item_sku", "lot_number", "location_code"],
    },
    {
      key: "pickLists",
      title: "Separação",
      description: "Listas abertas para concluir a preparação do pedido.",
      resource: "pick_list",
      href: "/resources/warehouse/pick_list",
      emptyMessage: "Sem lista de separação aberta.",
      titleFields: ["pick_number", "name", "custom_id"],
      detailFields: ["sales_order", "started_at", "completed_at"],
    },
    {
      key: "shipments",
      title: "Expedições",
      description: "Documentos em rascunho antes de baixar estoque.",
      resource: "shipment",
      href: "/resources/warehouse/shipment",
      createHref: "/resources/warehouse/shipment/new",
      createLabel: "Criar expedição",
      emptyMessage: "Sem expedição em rascunho.",
      titleFields: ["shipment_number", "name", "custom_id"],
      detailFields: ["sales_order", "carrier_name", "tracking_number"],
    },
    {
      key: "transfers",
      title: "Transferências",
      description: "Movimentações internas aguardando lançamento.",
      resource: "stock_transfer",
      href: "/resources/warehouse/stock_transfer",
      createHref: "/resources/warehouse/stock_transfer/new",
      createLabel: "Criar transferência",
      emptyMessage: "Sem transferência em rascunho.",
      titleFields: ["transfer_number", "name", "custom_id"],
      detailFields: ["source_location", "destination_location", "requested_at"],
    },
    {
      key: "stockLevels",
      title: "Saldos",
      description: "Disponibilidade por item, lote e localização.",
      resource: "stock_level",
      href: "/resources/warehouse/stock_level",
      emptyMessage: "Sem saldo de estoque visível.",
      titleFields: ["item_sku", "custom_id"],
      detailFields: ["location_code", "lot_number", "quantity"],
    },
  ]

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS]}>
      <div className="space-y-6">
        <PageHeader
          title={t("ERP e WMS", "ERP & WMS")}
          subtitle={t(
            "Controle empresarial de compras, estoque, reservas, separação, expedição e inventário.",
            "Controle empresarial de compras, estoque, reservas, separação, expedição e inventário."
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/resources/warehouse"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted hover:shadow-md"
              >
                <PackageSearch size={16} />
                {t("Recursos", "Resources")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void loadData()
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                {t("Atualizar", "Refresh")}
              </button>
              {podeVerAdmin ? (
                <Link
                  href="/admin/warehouse/"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all duration-150 hover:border-primary/40 hover:bg-muted hover:shadow-md"
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
          <MetricCard label="Itens" value={value(counts.items)} hint="Códigos cadastrados" />
          <MetricCard label="Saldos" value={value(counts.stockLevels)} hint="Posições com estoque" />
          <MetricCard label="Pedidos abertos" value={value(counts.openSalesOrders)} hint="Confirmados para reserva" />
          <MetricCard label="Reservas ativas" value={value(counts.activeReservations)} hint="Estoque comprometido" />
          <MetricCard label="Expedições" value={value(counts.shipments)} hint="Saídas comerciais" />
          <MetricCard label="Compras" value={value(counts.purchaseOrders)} hint="Pedidos de abastecimento" />
          <MetricCard label="Reposição" value={value(counts.replenishmentPlans)} hint="Planos de compra automática" />
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Quadro de execução WMS</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Filas reais do ciclo compra-estoque-venda, com acesso ao registo onde os comandos operacionais ficam disponíveis.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
              <Clock3 size={13} />
              {loading ? "A sincronizar..." : "Dados recentes do tenant atual"}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {queueConfigs.map((config) => (
              <QueueCard key={config.key} config={config} rows={queues[config.key]} loading={loading} />
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pedidos de compra"
            description="Planeie abastecimento, custos e fornecedores."
            href="/resources/warehouse/purchase_order"
            icon={ClipboardList}
          />
          <ActionTile
            title="Recebimentos"
            description="Dê entrada física por armazém, localização e lote."
            href="/resources/warehouse/goods_receipt"
            icon={PackageCheck}
          />
          <ActionTile
            title="Reposição automática"
            description="Calcule faltas por ponto de reposição e gere compra."
            href="/resources/warehouse/replenishment_plan"
            icon={ClipboardCheck}
          />
          <ActionTile
            title="Pedidos de venda"
            description="Registe demanda, confirme e reserve estoque."
            href="/resources/warehouse/sales_order"
            icon={ShoppingCart}
          />
          <ActionTile
            title="Reservas"
            description="Acompanhe estoque prometido antes da expedição."
            href="/resources/warehouse/stock_reservation"
            icon={ClipboardCheck}
          />
          <ActionTile
            title="Separação"
            description="Gere listas de separação por pedido confirmado."
            href="/resources/warehouse/pick_list"
            icon={PackageSearch}
          />
          <ActionTile
            title="Expedição"
            description="Baixe estoque e feche entregas de clientes."
            href="/resources/warehouse/shipment"
            icon={Truck}
          />
          <ActionTile
            title="Transferências"
            description="Movimente estoque entre localizações internas."
            href="/resources/warehouse/stock_transfer"
            icon={Repeat}
          />
          <ActionTile
            title="Saldos e inventário"
            description="Audite disponibilidade, reservas e contagens."
            href="/resources/warehouse/stock_level"
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
