"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { CreditCard, Receipt, Repeat, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function PagamentosPage() {
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    const [pagamentos, setPagamentos] = useState<number>(0)
    const [recibos, setRecibos] = useState<number>(0)
    const [transacoes, setTransacoes] = useState<number>(0)
    const [reconciliacoes, setReconciliacoes] = useState<number>(0)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)

                const [pags, recs, trans, recs2] = await Promise.all([
                    apiFetch<any>("/payments/payment/"),
                    apiFetch<any>("/payments/receipt/"),
                    apiFetch<any>("/payments/transaction/"),
                    apiFetch<any>("/payments/reconciliation/"),
                ])

                if (!mounted) return
                setPagamentos(extractTotalCount(pags))
                setRecibos(extractTotalCount(recs))
                setTransacoes(extractTotalCount(trans))
                setReconciliacoes(extractTotalCount(recs2))
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar pagamentos."))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [])

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
            <div className="space-y-6">
                <PageHeader
                    title="Pagamentos"
                    subtitle="Pagamentos, transações, reconciliações e recibos."
                    actions={null}
                />

                {erro ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Pagamentos" value={loading ? "..." : pagamentos} />
                    <MetricCard label="Recibos" value={loading ? "..." : recibos} />
                    <MetricCard label="Transações" value={loading ? "..." : transacoes} />
                    <MetricCard label="Reconciliações" value={loading ? "..." : reconciliacoes} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ActionTile
                        title="Pagamentos"
                        description="Listar pagamentos e auditar status."
                        href="/payments/payments"
                        icon={CreditCard}
                    />
                    <ActionTile
                        title="Recibos"
                        description="Gerados automaticamente quando a fatura é paga."
                        href="/recibos"
                        icon={Receipt}
                    />
                    <ActionTile
                        title="Transações"
                        description="Registo de gateway (referência externa e status)."
                        href="/payments/transactions"
                        icon={Repeat}
                    />
                    <ActionTile
                        title="Reconciliações"
                        description="Confirmações e auditoria por transação."
                        href="/payments/reconciliacoes"
                        icon={ShieldCheck}
                    />
                </div>

                <Card title="Gerenciamento" subtitle="Criação/edição completa via interface genérica (API v1).">
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/recursos/pagamentos"
                            className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                        >
                            Abrir recursos (Pagamentos)
                        </Link>
                        <Link
                            href="/recursos/payments/payment/novo"
                            className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                        >
                            Novo pagamento
                        </Link>
                    </div>
                </Card>
            </div>
        </AppLayout>
    )
}



