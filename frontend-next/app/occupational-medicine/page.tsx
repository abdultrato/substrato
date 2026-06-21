"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import { FilePlus2, HeartPulse, ScrollText, Pill, UserPlus } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function MedicinaOcupacionalPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

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
          apiFetch<any>("/clinical/patient/?proveniencia=Medicina%20Ocupacional", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/clinical/labrequest/", { clientCache: safeRefreshToken === 0 }),
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
  }, [safeRefreshToken])

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

        {/* Registo de pacientes centralizado na Receção */}
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <UserPlus size={18} className="shrink-0 text-blue-600" />
          <div className="flex-1 text-sm text-blue-800">
            O registo de novos pacientes ocupacionais é feito na{" "}
            <Link href="/reception" className="font-semibold underline underline-offset-2 hover:text-blue-600">
              Receção
            </Link>
            {" "}— seleccione <strong>Medicina Ocupacional</strong> no fluxo de entrada de paciente.
          </div>
          <Link
            href="/reception"
            className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Ir para Receção
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Criar requisição laboratorial"
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




