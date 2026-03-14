"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FilePlus2, HeartPulse, Pill, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function MedicinaOcupacionalPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [pacientes, setPacientes] = useState<number>(0)
  const [requisicoes, setRequisicoes] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [pacs, reqs] = await Promise.all([
          apiFetch<any>("/pacientes/?proveniencia=Medicina%20Ocupacional"),
          apiFetch<any>("/requisicoes/"),
        ])

        if (!mounted) return
        setPacientes(extractTotalCount(pacs))
        setRequisicoes(extractTotalCount(reqs))
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace de medicina ocupacional.")
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="space-y-6">
        <PageHeader
          title="Medicina Ocupacional"
          subtitle="Registo e jornada ocupacional: pacientes, exames e encaminhamentos."
          actions={
            <Link
              href="/admin/clinico/paciente/?proveniencia__exact=Medicina+Ocupacional"
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
          <MetricCard label="Pacientes (ocupacional)" value={loading ? "..." : pacientes} />
          <MetricCard label="Requisições (lab)" value={loading ? "..." : requisicoes} />
          <MetricCard label="Procedimentos" value="—" hint="Solicitação integrada em evolução" />
          <MetricCard label="Medicação" value="—" hint="Vínculo com estoque em evolução" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pacientes"
            description="Registar e acompanhar pacientes de medicina ocupacional."
            href="/pacientes"
            icon={Users}
          />
          <ActionTile
            title="Nova requisição (laboratório)"
            description="Solicitar análises laboratoriais."
            href="/requisicoes/nova"
            icon={FilePlus2}
          />
          <ActionTile
            title="Procedimentos (Enfermagem)"
            description="Encaminhar para execução e registo de procedimentos."
            href="/enfermagem/procedimentos"
            icon={HeartPulse}
          />
          <ActionTile
            title="Almoxarifado/Farmácia"
            description="Consultar disponibilidade de itens e lotes."
            href="/farmacia"
            icon={Pill}
          />
        </div>

        <Card
          title="Visão"
          subtitle="A página ocupa o papel de cockpit da jornada ocupacional."
        >
          <div className="text-sm text-slate-700">
            O módulo de pacientes já suporta a proveniência <strong>Medicina Ocupacional</strong>. A próxima etapa para completar seu fluxo
            é expor endpoints de requisições clínicas unificadas (exames médicos, procedimentos e medicação) e amarrar execução
            em enfermagem/farmácia com rastreabilidade.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
