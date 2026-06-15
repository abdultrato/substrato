"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Banknote, BookOpenCheck, ClipboardList, FileText, Receipt } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function ContabilidadePage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [faturas, setFaturas] = useState<number>(0)
  const [recibos, setRecibos] = useState<number>(0)
  const [lancamentos, setLancamentos] = useState<number>(0)
  const [notasCreditoPendentes, setNotasCreditoPendentes] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [fats, recs, lancs, notasCredito] = await Promise.all([
          apiFetch<any>("/invoices/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/payments/receipt/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/accounting/entry/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/billing/credit-note-request/?status=PEND", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setFaturas(extractTotalCount(fats))
        setRecibos(extractTotalCount(recs))
        setLancamentos(extractTotalCount(lancs))
        setNotasCreditoPendentes(extractTotalCount(notasCredito))
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
      <div className="space-y-6">
        <PageHeader
          title="Contabilidade"
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/accounting/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Abrir na Administração
              </Link>
            ) : null
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Faturas" value={loading ? "..." : faturas} />
          <MetricCard label="Recibos" value={loading ? "..." : recibos} />
          <MetricCard label="Lançamentos" value={loading ? "..." : lancamentos} />
          <MetricCard
            label="Notas de crédito (pend.)"
            value={loading ? "..." : notasCreditoPendentes}
            hint="Pedidos aguardando decisão"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Faturas"
            description="Consulta, emissão de PDF e auditoria."
            href="/invoices"
            icon={FileText}
          />
          <ActionTile
            title="Recibos"
            description="Auditoria de recebimentos."
            href="/receipts"
            icon={Receipt}
          />
          <ActionTile
            title="Contas"
            description="Plano de contas e cadastros financeiros."
            href="/accounting/accounts"
            icon={Banknote}
          />
          <ActionTile
            title="Lançamentos"
            description="Lançamentos contabilísticos."
            href="/accounting/entries"
            icon={BookOpenCheck}
          />
          <ActionTile
            title="Notas de crédito"
            description="Aprovar ou rejeitar pedidos de nota de crédito."
            href="/accounting/credit-notes"
            icon={ClipboardList}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Movimentos"
            description="Movimentos e histórico de contas."
            href="/accounting/movements"
            icon={ClipboardList}
          />
          <ActionTile
            title="Conciliações"
            description="Conciliação financeira."
            href="/accounting/reconciliations"
            icon={ClipboardList}
          />
          <ActionTile
            title="Recepção (audit)"
            description="Ver check-ins e atendimentos sem editar."
            href="/accounting/reception"
            icon={ClipboardList}
          />
          <ActionTile
            title="Pagamentos"
            description="Lançar e auditar pagamentos (sem redirecionar ao admin)."
            href="/payments/payments"
            icon={ClipboardList}
          />
        </div>
      </div>
    </AppLayout>
  )
}




