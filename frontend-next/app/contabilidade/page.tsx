"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Banknote, BookOpenCheck, ClipboardList, FileText, Receipt } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function ContabilidadePage() {
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
          apiFetch<any>("/pagamentos/recibo/"),
          apiFetch<any>("/contabilidade/lancamento/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setFaturas(Array.isArray(list(fats)) ? list(fats).length : 0)
        setRecibos(Array.isArray(list(recs)) ? list(recs).length : 0)
        setLancamentos(Array.isArray(list(lancs)) ? list(lancs).length : 0)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace de contabilidade.")
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
            <Link
              href="/admin/contabilidade/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Abrir no admin
            </Link>
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
            href="/faturas"
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
            href="/contabilidade/lancamentos"
            icon={BookOpenCheck}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Movimentos"
            description="Movimentos e histórico de contas."
            href="/contabilidade/movimentos"
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
            href="/contabilidade/recepcao"
            icon={ClipboardList}
          />
          <ActionTile
            title="Pagamentos"
            description="Transações e reconciliações (admin)."
            href="/admin/pagamentos/"
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
