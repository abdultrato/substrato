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
  Pill,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
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
                href="/admin/clinical/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
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
          <MetricCard label="Pacientes" value={loading ? "..." : pacientes} />
          <MetricCard label="Requisições" value={loading ? "..." : requisicoes} />
          <MetricCard label="Anamnese" value="—" />
          <MetricCard label="Diagnósticos" value="—" />
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
            href="/requests/new"
            icon={FilePlus2}
          />
          <ActionTile
            title="Prontuário (Cardex)"
            description="Registos clínicos e prescrição estruturada."
            href="/medical-records"
            icon={ScrollText}
          />
          <ActionTile
            title="Maternidade"
            description="Gestação, berçário, camas e partos."
            href="/maternity"
            icon={Baby}
          />
          <ActionTile
            title="Cirurgia"
            description="Agendamento e procedimentos cirúrgicos."
            href="/surgery"
            icon={Scissors}
          />
          <ActionTile
            title="Exames médicos (catálogo)"
            description="Consultar cadastros de exames médicos (se aplicável)."
            href="/medicine/medical-exams"
            icon={Stethoscope}
          />
          <ActionTile
            title="Procedimentos"
            description="Acompanhar procedimentos executados na enfermagem."
            href="/nursing/procedures"
            icon={HeartPulse}
          />
          <ActionTile
            title="Resultados médicos"
            description="Anexar laudos e imagens por exame médico."
            href="/medicine/medical-results"
            icon={ImagePlus}
          />
          <ActionTile
            title="Criar requisição de materiais"
            description="Abrir o formulário para solicitar insumos médico-cirúrgicos à farmácia."
            href="/pharmacy/material-requests/new"
            icon={Pill}
          />
        </div>

      </div>
    </AppLayout>
  )
}



