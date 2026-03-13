"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ClipboardList,
  Droplets,
  HeartPulse,
  PackageSearch,
  Stethoscope,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function EnfermagemPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [requisicoesPendentes, setRequisicoesPendentes] = useState<number>(0)
  const [procedimentos, setProcedimentos] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [reqs, procs] = await Promise.all([
          apiFetch<any>("/requisicoes/?tipo=LAB&estado=pendente"),
          apiFetch<any>("/enfermagem/procedimento/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setRequisicoesPendentes(Array.isArray(list(reqs)) ? list(reqs).length : 0)
        setProcedimentos(Array.isArray(list(procs)) ? list(procs).length : 0)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace de enfermagem.")
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Enfermagem"
          subtitle="Execução: colheitas, procedimentos e registos."
          actions={
            <Link
              href="/admin/enfermagem/"
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
          <MetricCard label="Requisições pendentes" value={loading ? "..." : requisicoesPendentes} />
          <MetricCard label="Procedimentos" value={loading ? "..." : procedimentos} />
          <MetricCard label="Colheitas" value={loading ? "..." : "—"} hint="Fluxo detalhado em evolução" />
          <MetricCard label="Sinais vitais" value={loading ? "..." : "—"} hint="Entrada via módulo Enfermagem" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Requisições"
            description="Visualize as requisições pendentes e o que precisa ser executado."
            href="/enfermagem/requisicoes"
            icon={ClipboardList}
          />
          <ActionTile
            title="Itens de requisição"
            description="Lista de itens vinculados às requisições (exames)."
            href="/enfermagem/itens-requisicao"
            icon={Droplets}
          />
          <ActionTile
            title="Procedimentos"
            description="Registos e execução de procedimentos de enfermagem."
            href="/enfermagem/procedimentos"
            icon={HeartPulse}
          />
          <ActionTile
            title="Materiais e medicação"
            description="Consultar itens no almoxarifado/farmácia quando aplicável."
            href="/farmacia"
            icon={PackageSearch}
          />
        </div>

        <Card
          title="Notas de execução"
          subtitle="No backend atual, a requisição é laboratorial. Para procedimentos/exames médicos/medicação, os módulos existem mas a jornada unificada ainda está sendo amarrada no frontend."
        >
          <div className="text-sm text-slate-700">
            Para já, use:
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              <li>Requisições laboratoriais em <strong>Requisições</strong> e <strong>Itens de requisição</strong>.</li>
              <li>Execução de procedimentos e registos no módulo <strong>Enfermagem</strong>.</li>
              <li>Consulta de produtos/lotes em <strong>Farmácia</strong>.</li>
              <li>Solicitações médicas em <strong>Medicina</strong>.</li>
            </ul>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
