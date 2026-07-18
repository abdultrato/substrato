"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, BadgeCheck, ClipboardList, CreditCard, FileText, Receipt } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MetricCard from "@/components/ui/MetricCard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Counts = {
  quotations: number
  proformas: number
  invoices: number
  payments: number
  receipts: number
}

const FLOW = [
  {
    title: "Cotação",
    description: "Proposta não fiscal para serviços, produtos ou pacotes.",
    href: "/resources/cotacoes/quotation",
    icon: ClipboardList,
    accent: "border-l-emerald-500",
  },
  {
    title: "Proforma",
    description: "Documento comercial aprovado antes da fatura fiscal.",
    href: "/resources/cotacoes/proforma",
    icon: BadgeCheck,
    accent: "border-l-cyan-500",
  },
  {
    title: "Fatura",
    description: "Documento fiscal emitido a partir do acto, venda ou proforma.",
    href: "/billing/invoices",
    icon: FileText,
    accent: "border-l-indigo-500",
  },
  {
    title: "Pagamento",
    description: "Confirmação por método de pagamento ou convênio.",
    href: "/payments/payments",
    icon: CreditCard,
    accent: "border-l-amber-500",
  },
  {
    title: "Recibo",
    description: "Comprovativo gerado apenas depois da fatura paga.",
    href: "/receipts",
    icon: Receipt,
    accent: "border-l-rose-500",
  },
]

export default function BillingPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>({
    quotations: 0,
    proformas: 0,
    invoices: 0,
    payments: 0,
    receipts: 0,
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const [quotations, proformas, invoices, payments, receipts] = await Promise.all([
          apiFetch<any>("/cotacoes/quotation/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/cotacoes/proforma/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/billing/invoice/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/payments/payment/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/payments/receipt/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setCounts({
          quotations: extractTotalCount(quotations),
          proformas: extractTotalCount(proformas),
          invoices: extractTotalCount(invoices),
          payments: extractTotalCount(payments),
          receipts: extractTotalCount(receipts),
        })
      } catch (e: any) {
        if (mounted) setErro(e?.message || "Falha ao carregar o fluxo comercial.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE, GROUPS.FARMACIA]}>
      <div className="space-y-3">
        <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Substrato</p>
              <h1 className="truncate text-xl font-semibold text-foreground">Fluxo comercial</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cotação, proforma, fatura, pagamento e recibo numa cadeia única.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/resources/cotacoes/quotation/new"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Nova cotação
              </Link>
              <Link
                href="/billing/invoices"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Faturas
              </Link>
            </div>
          </div>

          {erro ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {erro}
            </div>
          ) : null}
        </section>

        <div className="grid gap-2 md:grid-cols-5">
          <MetricCard label="Cotações" value={loading ? "..." : counts.quotations} />
          <MetricCard label="Proformas" value={loading ? "..." : counts.proformas} />
          <MetricCard label="Faturas" value={loading ? "..." : counts.invoices} />
          <MetricCard label="Pagamentos" value={loading ? "..." : counts.payments} />
          <MetricCard label="Recibos" value={loading ? "..." : counts.receipts} />
        </div>

        <section className="grid gap-2 xl:grid-cols-5 md:grid-cols-3">
          {FLOW.map((step, index) => {
            const Icon = step.icon
            return (
              <Link
                key={step.title}
                href={step.href}
                className={`group min-h-[132px] rounded-xl border border-border border-l-4 ${step.accent} bg-card px-3 py-3 shadow-sm transition-colors hover:bg-muted`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">{step.title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </Link>
            )
          })}
        </section>

        <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div>
              <p className="font-semibold text-foreground">Regra geral</p>
              <p className="mt-1 text-muted-foreground">Venda ou serviço pode nascer de cotação; a proforma formaliza aprovação antes da fatura.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Regra fiscal</p>
              <p className="mt-1 text-muted-foreground">Pagamento e recibo dependem de fatura emitida; recibo só aparece após pagamento confirmado.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Regra operacional</p>
              <p className="mt-1 text-muted-foreground">Farmácia, recepção e contabilidade usam a mesma cadeia, mudando apenas a origem do documento.</p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
