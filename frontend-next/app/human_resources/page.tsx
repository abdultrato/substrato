"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  History,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

export default function HumanResourcesPage() {
  const { user } = useAuth()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [employees, setEmployees] = useState(0)
  const [absences, setAbsences] = useState(0)
  const [vacations, setVacations] = useState(0)
  const [overtime, setOvertime] = useState(0)
  const [disciplinary, setDisciplinary] = useState(0)
  const [payrolls, setPayrolls] = useState(0)
  const [contracts, setContracts] = useState(0)
  const [payrollRuns, setPayrollRuns] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const [emp, abs, vac, ot, disc, pay, cnt, runs] = await Promise.all([
          apiFetch<any>("/human_resources/employee/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/falta/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/ferias/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/horaextra/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/processodisciplinar/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/folhapagamento/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/contrato/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/human_resources/folha_run/", { clientCache: safeRefreshToken === 0 }),
        ])
        if (!mounted) return
        setEmployees(extractTotalCount(emp))
        setAbsences(extractTotalCount(abs))
        setVacations(extractTotalCount(vac))
        setOvertime(extractTotalCount(ot))
        setDisciplinary(extractTotalCount(disc))
        setPayrolls(extractTotalCount(pay))
        setContracts(extractTotalCount(cnt))
        setPayrollRuns(extractTotalCount(runs))
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar RH."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [safeRefreshToken])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
      <div className="space-y-6">
        <PageHeader
          title="Recursos Humanos"
          subtitle="Gestão do ciclo de vida do trabalhador: admissão, horário, assiduidade, férias, remuneração e histórico laboral."
          actions={
            canViewAdmin ? (
              <Link
                href="/admin/human-resources/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Abrir na Administração
              </Link>
            ) : null
          }
        />

        {errorMessage && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Funcionários" value={loading ? "..." : employees} />
          <MetricCard label="Faltas registadas" value={loading ? "..." : absences} />
          <MetricCard label="Férias" value={loading ? "..." : vacations} />
          <MetricCard label="Horas extras" value={loading ? "..." : overtime} />
          <MetricCard label="Processos disciplinares" value={loading ? "..." : disciplinary} />
          <MetricCard label="Folhas de pagamento" value={loading ? "..." : payrolls} />
          <MetricCard label="Contratos" value={loading ? "..." : contracts} />
          <MetricCard label="Folhas por período" value={loading ? "..." : payrollRuns} />
        </div>

        {/* Fluxo principal */}
        <Card title="Gestão de Pessoas" subtitle="Onboarding → Horário → Assiduidade → Remuneração → Histórico">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionTile title="Funcionários" description="Perfil completo, dados pessoais, laborais e salariais." href="/human_resources/employees" icon={Users} />
            <ActionTile title="Cargos" description="Estrutura hierárquica, níveis e responsabilidades." href="/human_resources/job-titles" icon={Briefcase} />
            <ActionTile title="Profissões" description="Catálogo de profissões com regras salariais." href="/human_resources/professions" icon={Award} />
            <ActionTile title="Contratos" description="Tipos de vínculo, vigência e salário contratual." href="/human_resources/contracts" icon={FileText} />
          </div>
        </Card>

        {/* Assiduidade */}
        <Card title="Assiduidade e Tempo" subtitle="Horários, presença, ausências e horas extra">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionTile title="Horários de Trabalho" description="Turnos, horários fixos e escalas semanais." href="/human_resources/work-schedules" icon={Clock} />
            <ActionTile title="Assiduidade" description="Registo diário de entradas, saídas e horas trabalhadas." href="/human_resources/attendance" icon={UserCheck} />
            <ActionTile title="Faltas" description="Faltas justificadas, injustificadas e médicas." href="/human_resources/absences" icon={Calendar} />
            <ActionTile title="Dispensas / Licenças" description="Saídas antecipadas, consultas médicas e autorizações." href="/human_resources/leave-permissions" icon={ClipboardList} />
            <ActionTile title="Horas Extras" description="Registo e aprovação de horas extraordinárias." href="/human_resources/overtimes" icon={TrendingUp} />
            <ActionTile title="Férias" description="Pedidos, aprovações e calendário de férias." href="/human_resources/vacations" icon={Calendar} />
            <ActionTile title="Saldo de Férias" description="Saldo anual, dias utilizados e dias restantes." href="/human_resources/vacation-balances" icon={BookOpen} />
          </div>
        </Card>

        {/* Remuneração */}
        <Card title="Remuneração" subtitle="Folhas de pagamento, histórico salarial e faturação">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ActionTile title="Folhas de Pagamento" description="Folha individual mensal por funcionário." href="/human_resources/payrolls" icon={CreditCard} />
            <ActionTile title="Folhas por Período" description="Gestão multi-funcionário por período (AAAA-MM)." href="/human_resources/payroll-runs" icon={CreditCard} />
            <ActionTile title="Itens de Folha" description="Breakdown individual: base, extras, descontos e líquido." href="/human_resources/payroll-items" icon={ClipboardList} />
            <ActionTile title="Histórico Salarial" description="Alterações salariais com vigência e motivo." href="/human_resources/salary-history" icon={History} />
          </div>
        </Card>

        {/* Pessoas e suporte */}
        <Card title="Pessoas e Suporte" subtitle="Agregados familiares, documentos e processos disciplinares">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionTile title="Agregados Familiares" description="Dependentes, contactos de emergência e benefícios." href="/human_resources/family-dependents" icon={Users} />
            <ActionTile title="Documentos" description="BI, NUIT, INSS, contratos e certificados." href="/human_resources/employee-documents" icon={FolderOpen} />
            <ActionTile title="Processos Disciplinares" description="Ocorrências, audiências, sanções e histórico." href="/human_resources/disciplinary-processes" icon={ShieldAlert} />
            <ActionTile title="Desligamentos" description="Demissões, rescisões e fim de contrato." href="/human_resources/terminations" icon={UserMinus} />
          </div>
        </Card>

        <Card title="Fluxo laboral completo" subtitle="Ciclo de vida do funcionário">
          <div className="text-sm text-slate-700 leading-relaxed">
            Admissão → Profissão → Cargo → Contrato → Horário → Assiduidade → Férias / Faltas / Dispensas / Horas Extras → Folha de Pagamento → Histórico Salarial → Desligamento
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
