"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { FilePlus2, HeartPulse, ScrollText, Pill, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function MedicinaOcupacionalPage() {
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
          apiFetch<any>("/clinical/patient/?proveniencia=Medicina%20Ocupacional"),
          apiFetch<any>("/clinical/labrequest/"),
        ])

        if (!mounted) return
        setPacientes(extractTotalCount(pacs))
        setRequisicoes(extractTotalCount(reqs))
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace de medicina ocupacional."))
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
            podeVerAdmin ? (
              <Link
                href="/admin/clinical/patient/?proveniencia__exact=Medicina+Ocupacional"
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
          <MetricCard label="Pacientes (ocupacional)" value={loading ? "..." : pacientes} />
          <MetricCard label="Requisições (lab)" value={loading ? "..." : requisicoes} />
          <MetricCard label="Procedimentos" value="—" />
          <MetricCard label="Medicação" value="—" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Pacientes"
            description="Registar e acompanhar pacientes de medicina ocupacional."
            href="/patients"
            icon={Users}
          />
          <ActionTile
            title="Nova requisição (laboratório)"
            description="Solicitar análises laboratoriais."
            href="/requests/new"
            icon={FilePlus2}
          />
          <ActionTile
            title="Prontuário (Cardex)"
            description="Ver/registar cardex e prescrição."
            href="/medical-records"
            icon={ScrollText}
          />
          <ActionTile
            title="Procedimentos (Enfermagem)"
            description="Encaminhar para execução e registo de procedimentos."
            href="/nursing/procedures"
            icon={HeartPulse}
          />
          <ActionTile
            title="Almoxarifado/Farmácia"
            description="Solicitar materiais e acompanhar o estado de avio."
            href="/pharmacy/material-requests"
            icon={Pill}
          />
        </div>

      </div>
    </AppLayout>
  )
}




