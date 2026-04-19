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
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function ContabilidadePage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [faturas, setFaturas] = useState<number>(0)
  const [recibos, setRecibos] = useState<number>(0)
  const [lancamentos, setLancamentos] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [fats, recs, lancs] = await Promise.all([
          apiFetch<any>("/faturas/"),
          apiFetch<any>("/payments/receipt/"),
          apiFetch<any>("/accounting/entry/"),
        ])

        if (!mounted) return
        setFaturas(extractTotalCount(fats))
        setRecibos(extractTotalCount(recs))
        setLancamentos(extractTotalCount(lancs))
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
  }, [])

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
          subtitle="Gestão financeira: contas, lançamentos, movimentos e conciliações."
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/accounting/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Abrir no admin
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
          <MetricCard label="Recepção" value="Somente leitura" hint="Auditoria sem alterar dados" />
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
            href="/recibos"
            icon={Receipt}
          />
          <ActionTile
            title="Contas"
            description="Plano de contas e cadastros financeiros."
            href="/contabilidade/contas"
            icon={Banknote}
          />
          <ActionTile
            title="Lançamentos"
            description="Lançamentos contabilísticos."
            href="/contabilidade/entries"
            icon={BookOpenCheck}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Movimentos"
            description="Movimentos e histórico de contas."
            href="/contabilidade/movements"
            icon={ClipboardList}
          />
          <ActionTile
            title="Conciliações"
            description="Conciliação financeira."
            href="/contabilidade/conciliacoes"
            icon={ClipboardList}
          />
          <ActionTile
            title="Recepção (audit)"
            description="Ver check-ins e atendimentos sem editar."
            href="/contabilidade/reception"
            icon={ClipboardList}
          />
          <ActionTile
            title="Pagamentos"
            description="Lançar e auditar pagamentos (sem redirecionar ao admin)."
            href="/recursos/pagamentos/pagamento"
            icon={ClipboardList}
          />
        </div>

        <Card
          title="Regra de ouro"
          subtitle="Contabilidade deve enxergar tudo que é feito na recepção, mas não alterar."
        >
          <div className="text-sm text-slate-700">
            Nesta fase, garantimos isso no frontend ao separar rotas e não expor botões de criação/edição para recepção dentro de contabilidade.
            Para segurança real, o backend deve também negar permissões de escrita para esses grupos.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}




