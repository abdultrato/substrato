"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  FilePlus2,
  Stethoscope,
  Users,
  HeartPulse,
  ScrollText,
  Baby,
  Scissors,
  ImagePlus,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function MedicinaPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

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
          apiFetch<any>("/clinical/patient/"),
          apiFetch<any>("/clinical/labrequest/"),
        ])

        if (!mounted) return
        setPacientes(extractTotalCount(pacs))
        setRequisicoes(extractTotalCount(reqs))
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace de medicina."))
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
            podeVerAdmin ? (
              <Link
                href="/admin/clinico/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
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
          <MetricCard label="Pacientes" value={loading ? "..." : pacientes} />
          <MetricCard label="Requisições" value={loading ? "..." : requisicoes} />
          <MetricCard label="Anamnese" value="—" hint="Indisponível na API v1" />
          <MetricCard label="Diagnósticos" value="—" hint="Indisponível na API v1" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pacientes"
            description="Ver e registar pacientes vindos da recepção."
            href="/patients"
            icon={Users}
          />
          <ActionTile
            title="Nova requisição (laboratório)"
            description="Solicitar exames laboratoriais para um paciente."
            href="/requests/nova"
            icon={FilePlus2}
          />
          <ActionTile
            title="Prontuário (Cardex)"
            description="Registos clínicos e prescrição estruturada."
            href="/prontuario"
            icon={ScrollText}
          />
          <ActionTile
            title="Maternidade"
            description="Gestação, berçário, camas e partos."
            href="/maternidade"
            icon={Baby}
          />
          <ActionTile
            title="Cirurgia"
            description="Agendamento e procedimentos cirúrgicos."
            href="/cirurgia"
            icon={Scissors}
          />
          <ActionTile
            title="Exames médicos (catálogo)"
            description="Consultar cadastros de exames médicos (se aplicável)."
            href="/medicina/medical-exams"
            icon={Stethoscope}
          />
          <ActionTile
            title="Procedimentos"
            description="Acompanhar procedimentos executados na enfermagem."
            href="/enfermagem/procedimentos"
            icon={HeartPulse}
          />
          <ActionTile
            title="Resultados médicos"
            description="Anexar laudos e imagens por exame médico."
            href="/medicina/medical-results"
            icon={ImagePlus}
          />
        </div>

        <Card
          title="Cobertura da API v1"
          subtitle="Resumo do que está disponível para o módulo de medicina."
        >
          <div className="text-sm text-slate-700">
            Disponível:
            <ul className="mt-2 list-disc pl-5">
              <li>Cadastro de pacientes</li>
              <li>Requisição de análises laboratoriais</li>
              <li>Catálogo de exames laboratoriais</li>
              <li>Geração de PDF de resultados (via API v1: <code>/api/v1/clinical/labrequest/&lt;id&gt;/pdf_resultados/</code>)</li>
            </ul>

            <div className="mt-4">
              Indisponível na API v1:
              <ul className="mt-2 list-disc pl-5">
                <li>Atendimento clínico (anamnese, hipóteses, diagnósticos, plano)</li>
                <li>Requisições clínicas unificadas (laboratório, exames médicos, procedimentos, farmácia)</li>
                <li>Vínculo entre requisição e execução em enfermagem/farmácia</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}



