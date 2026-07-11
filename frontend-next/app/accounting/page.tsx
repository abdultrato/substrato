"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Banknote, BookOpenCheck, Building2, ClipboardList, FileText, Receipt } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"

export default function ContabilidadePage() {
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [faturas, setFaturas] = useState<number>(0)
  const [recibos, setRecibos] = useState<number>(0)
  const [lancamentos, setLancamentos] = useState<number>(0)
  const [notasCreditoPendentes, setNotasCreditoPendentes] = useState<number>(0)
  const [contasBancarias, setContasBancarias] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [fats, recs, lancs, notasCredito, bancos] = await Promise.all([
          apiFetch<any>("/invoices/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/payments/receipt/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/accounting/entry/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/billing/credit-note-request/?status=PEND", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/accounting/bank_account/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setFaturas(extractTotalCount(fats))
        setRecibos(extractTotalCount(recs))
        setLancamentos(extractTotalCount(lancs))
        setNotasCreditoPendentes(extractTotalCount(notasCredito))
        setContasBancarias(extractTotalCount(bancos))
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace de contabilidade."))
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
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-3">
        <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-3 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                  <BookOpenCheck size={17} />
                </span>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-foreground">Contabilidade</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar…" : `${faturas} faturas · ${recibos} recibos · controlo financeiro`}
                  </p>
                </div>
              </div>
            </div>

            {erro ? (
              <div className="rounded-2xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                {erro}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2.5 md:flex-nowrap [&>*]:min-w-[140px] [&>*]:flex-1">
              <MetricCard label="Faturas" value={loading ? "..." : faturas} href="/invoices" accentClass="border-l-sky-500" />
              <MetricCard label="Recibos" value={loading ? "..." : recibos} href="/receipts" accentClass="border-l-emerald-500" />
              <MetricCard label="Lançamentos" value={loading ? "..." : lancamentos} href="/accounting/entries" accentClass="border-l-violet-500" />
              <MetricCard
                label="Notas de crédito (pend.)"
                value={loading ? "..." : notasCreditoPendentes}
                hint="Pedidos aguardando decisão"
                href="/accounting/credit-notes"
                accentClass="border-l-amber-500"
              />
              <MetricCard
                label="Contas bancárias"
                value={loading ? "..." : contasBancarias}
                href="/accounting/bank-accounts"
                accentClass="border-l-cyan-500"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Faturas"
            description="Consulta, emissão de PDF e auditoria."
            href="/invoices"
            icon={FileText}
            accentClass="border-l-sky-500"
          />
          <ActionTile
            title="Recibos"
            description="Auditoria de recebimentos."
            href="/receipts"
            icon={Receipt}
            accentClass="border-l-emerald-500"
          />
          <ActionTile
            title="Contas"
            description="Plano de contas e cadastros financeiros."
            href="/accounting/accounts"
            icon={Banknote}
            accentClass="border-l-teal-500"
          />
          <ActionTile
            title="Contas bancárias"
            description="Bancos, IBAN, titular e saldos."
            href="/accounting/bank-accounts"
            icon={Building2}
            accentClass="border-l-cyan-500"
          />
          <ActionTile
            title="Lançamentos"
            description="Lançamentos contabilísticos."
            href="/accounting/entries"
            icon={BookOpenCheck}
            accentClass="border-l-violet-500"
          />
          <ActionTile
            title="Notas de crédito"
            description="Aprovar ou rejeitar pedidos de nota de crédito."
            href="/accounting/credit-notes"
            icon={ClipboardList}
            accentClass="border-l-amber-500"
          />
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Movimentos"
            description="Movimentos e histórico de contas."
            href="/accounting/movements"
            icon={ClipboardList}
            accentClass="border-l-indigo-500"
          />
          <ActionTile
            title="Conciliações"
            description="Conciliação financeira."
            href="/accounting/reconciliations"
            icon={ClipboardList}
            accentClass="border-l-cyan-500"
          />
          <ActionTile
            title="Recepção (audit)"
            description="Check-ins ligados a fatura e cobrança."
            href="/accounting/reception"
            icon={ClipboardList}
            accentClass="border-l-rose-500"
          />
          <ActionTile
            title="Pagamentos"
            description="Lançar e auditar pagamentos (sem redirecionar ao admin)."
            href="/payments/payments"
            icon={ClipboardList}
            accentClass="border-l-lime-500"
          />
        </div>
      </div>
    </AppLayout>
  )
}

