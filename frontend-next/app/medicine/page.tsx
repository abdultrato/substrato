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
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

const medicineActionTiles = [
  {
    title: "Pacientes",
    description: "Ver e registar pacientes vindos da recepção.",
    href: "/patients",
    icon: Users,
    accentClass: "from-sky-500 via-cyan-500 to-teal-400",
  },
  {
    title: "Criar requisição laboratorial",
    description: "Solicitar exames laboratoriais para um paciente.",
    href: "/requests/new",
    icon: FilePlus2,
    accentClass: "from-emerald-500 via-lime-500 to-amber-400",
  },
  {
    title: "Prontuário (Cardex)",
    description: "Registos clínicos e prescrição estruturada.",
    href: "/medical-records",
    icon: ScrollText,
    accentClass: "from-violet-500 via-fuchsia-500 to-pink-400",
  },
  {
    title: "Maternidade",
    description: "Gestação, berçário, camas e partos.",
    href: "/maternity",
    icon: Baby,
    accentClass: "from-rose-400 via-pink-400 to-orange-300",
  },
  {
    title: "Cirurgia",
    description: "Agendamento e procedimentos cirúrgicos.",
    href: "/surgery",
    icon: Scissors,
    accentClass: "from-red-500 via-orange-500 to-amber-400",
  },
  {
    title: "Exames médicos (catálogo)",
    description: "Consultar cadastros de exames médicos (se aplicável).",
    href: "/medicine/medical-exams",
    icon: Stethoscope,
    accentClass: "from-cyan-500 via-sky-500 to-indigo-400",
  },
  {
    title: "Procedimentos",
    description: "Acompanhar procedimentos executados na enfermagem.",
    href: "/nursing/procedures",
    icon: HeartPulse,
    accentClass: "from-emerald-500 via-teal-500 to-cyan-400",
  },
  {
    title: "Resultados médicos",
    description: "Anexar laudos e imagens por exame médico.",
    href: "/medicine/medical-results",
    icon: ImagePlus,
    accentClass: "from-indigo-500 via-blue-500 to-cyan-400",
  },
  {
    title: "Criar requisição de materiais",
    description: "Abrir o formulário para solicitar insumos médico-cirúrgicos à farmácia.",
    href: "/pharmacy/material-requests/new",
    icon: Pill,
    accentClass: "from-amber-500 via-orange-500 to-rose-400",
  },
] as const

export default function MedicinaPage() {
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
          apiFetch<any>("/clinical/patient/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/labrequest/", { clientCache: safeRefreshToken === 0 }),
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
  }, [safeRefreshToken])

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

        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="min-w-[160px] flex-1">
            <MetricCard label="Pacientes" value={loading ? "..." : pacientes} />
          </div>
          <div className="min-w-[160px] flex-1">
            <MetricCard label="Requisições" value={loading ? "..." : requisicoes} />
          </div>
          <div className="min-w-[160px] flex-1">
            <MetricCard label="Anamnese" value="—" />
          </div>
          <div className="min-w-[160px] flex-1">
            <MetricCard label="Diagnósticos" value="—" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {medicineActionTiles.map((tile) => (
            <div
              key={tile.href}
              className="group relative overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/45 dark:hover:border-slate-700"
            >
              <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${tile.accentClass}`} />
              <div className="pl-2">
                <ActionTile
                  title={tile.title}
                  description={tile.description}
                  href={tile.href}
                  icon={tile.icon}
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  )
}
