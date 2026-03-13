"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  FilePlus2,
  Stethoscope,
  Users,
  HeartPulse,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function MedicinaPage() {
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
          apiFetch<any>("/pacientes/"),
          apiFetch<any>("/requisicoes/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setPacientes(Array.isArray(list(pacs)) ? list(pacs).length : 0)
        setRequisicoes(Array.isArray(list(reqs)) ? list(reqs).length : 0)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace de medicina.")
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-6">
        <PageHeader
          title="Medicina"
          subtitle="Jornada clínica: pacientes, requisições e acompanhamento."
          actions={
            <Link
              href="/admin/clinico/"
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
          <MetricCard label="Pacientes" value={loading ? "..." : pacientes} />
          <MetricCard label="Requisições" value={loading ? "..." : requisicoes} />
          <MetricCard label="Anamnese" value="—" hint="Fluxo dedicado em evolução" />
          <MetricCard label="Diagnósticos" value="—" hint="Modelos/endpoint ainda não expostos na API v1" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pacientes"
            description="Ver e registar pacientes vindos da recepção."
            href="/pacientes"
            icon={Users}
          />
          <ActionTile
            title="Nova requisição (laboratório)"
            description="Solicitar exames laboratoriais para um paciente."
            href="/requisicoes/nova"
            icon={FilePlus2}
          />
          <ActionTile
            title="Exames médicos (catálogo)"
            description="Consultar cadastros de exames médicos (se aplicável)."
            href="/medicina/exames-medicos"
            icon={Stethoscope}
          />
          <ActionTile
            title="Procedimentos"
            description="Acompanhar procedimentos executados na enfermagem."
            href="/enfermagem/procedimentos"
            icon={HeartPulse}
          />
        </div>

        <Card
          title="Status do fluxo clínico"
          subtitle="O backend atual expõe principalmente a jornada laboratorial (Requisição de Análises)."
        >
          <div className="text-sm text-slate-700">
            O que já existe e está reutilizado aqui:
            <ul className="mt-2 list-disc pl-5">
              <li>Cadastro de pacientes</li>
              <li>Requisição de análises laboratoriais</li>
              <li>Catálogo de exames laboratoriais</li>
              <li>Geração de PDF de resultados (via API v1: <code>/api/v1/clinico/requisicaoanalise/&lt;id&gt;/pdf_resultados/</code>)</li>
            </ul>

            <div className="mt-4">
              O que ainda precisa ser criado no backend para cobrir 100% do seu pedido (anamnese/diagnósticos/medicação/procedimentos integrados):
              <ul className="mt-2 list-disc pl-5">
                <li>Modelos/endpoint para atendimento clínico (anamnese, hipóteses, diagnósticos, plano)</li>
                <li>Requisições unificadas (laboratório, exames médicos, procedimentos, farmácia) com estado de execução</li>
                <li>Vínculo explícito entre requisição e execução em enfermagem/farmácia</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
