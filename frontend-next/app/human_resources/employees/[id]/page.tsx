"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, Trash2 } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Employee = Record<string, any>

const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo", DE_LICENCA: "De licença", SUSPENSO: "Suspenso",
  INATIVO: "Inativo", DESLIGADO: "Desligado", REFORMADO: "Reformado", FALECIDO: "Falecido",
}
const STATUS_STYLES: Record<string, string> = {
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  DE_LICENCA: "border-amber-200 bg-amber-50 text-amber-800",
  SUSPENSO: "border-orange-200 bg-orange-50 text-orange-800",
  INATIVO: "border-border bg-muted text-foreground-2",
  DESLIGADO: "border-rose-200 bg-rose-50 text-rose-800",
  REFORMADO: "border-slate-200 bg-slate-50 text-slate-700",
  FALECIDO: "border-slate-300 bg-slate-100 text-slate-600",
}

function fmtDate(v?: string | null) {
  if (!v) return "—"
  try { return new Date(v).toLocaleDateString("pt", { year: "numeric", month: "long", day: "2-digit" }) } catch { return v }
}
function fmtMoney(v?: string | null) {
  if (!v || parseFloat(v) === 0) return "—"
  return parseFloat(v).toLocaleString("pt", { minimumFractionDigits: 2 })
}
function fmtBool(v: any) { return v === true ? "Sim" : v === false ? "Não" : "—" }
function fmtVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return fmtBool(v)
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function Row({ label, value }: { label: string; value?: any }) {
  const display = fmtVal(value)
  if (display === "—") return null
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b border-border/50 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{display}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <dl className="px-1">{children}</dl>
    </Card>
  )
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [emp, setEmp] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiFetch<Employee>(`/human_resources/employee/${id}/`)
      .then(setEmp)
      .catch((e) => setError(e?.message ?? "Funcionário não encontrado."))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm("Tem a certeza que deseja eliminar este funcionário?")) return
    setDeleting(true)
    try {
      await apiFetch(`/human_resources/employee/${id}/`, { method: "DELETE" })
      router.push("/human_resources/employees")
    } catch (e: any) {
      alert(e?.message ?? "Erro ao eliminar funcionário.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          A carregar ficha do funcionário...
        </div>
      </AppLayout>
    )
  }

  if (error || !emp) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-rose-800">
          {error ?? "Funcionário não encontrado."}
        </div>
      </AppLayout>
    )
  }

  const statusStyle = STATUS_STYLES[emp.status] ?? "border-border bg-muted text-foreground-2"
  const statusLabel = STATUS_LABELS[emp.status] ?? emp.status

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
      <div className="space-y-5">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/human_resources/employees"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{emp.name || "Sem nome"}</h1>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{emp.custom_id} · {emp.role_name ?? "Sem cargo"} · {emp.profession_name ?? "Sem profissão"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/human_resources/employees/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground-2 transition hover:text-foreground"
            >
              <Edit size={14} /> Editar
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">

          {/* Dados pessoais */}
          <Section title="Dados pessoais">
            <Row label="Nome completo" value={emp.name} />
            <Row label="Género" value={emp.gender} />
            <Row label="Data de nascimento" value={fmtDate(emp.date_of_birth)} />
            <Row label="Nacionalidade" value={emp.nationality} />
            <Row label="Estado civil" value={emp.marital_status} />
            <Row label="Morada" value={emp.address} />
          </Section>

          {/* Documentos */}
          <Section title="Documentos e identificação">
            <Row label="Tipo de documento" value={emp.document_type} />
            <Row label="Número do documento" value={emp.document_number} />
            <Row label="NUIT" value={emp.nuit} />
            <Row label="Número INSS" value={emp.inss_number} />
          </Section>

          {/* Contacto */}
          <Section title="Contacto">
            <Row label="E-mail" value={emp.email} />
            <Row label="Telefone" value={emp.phone} />
            <Row label="Emergência (nome)" value={emp.emergency_contact_name} />
            <Row label="Emergência (telefone)" value={emp.emergency_contact_phone} />
          </Section>

          {/* Dados laborais */}
          <Section title="Dados laborais">
            <Row label="Código" value={emp.custom_id} />
            <Row label="Cargo" value={emp.role_name ?? emp.role} />
            <Row label="Profissão" value={emp.profession_name ?? emp.profession} />
            <Row label="Data de admissão" value={fmtDate(emp.admission_date)} />
            <Row label="Estado" value={statusLabel} />
          </Section>

          {/* Pagamento e remuneração */}
          <Section title="Remuneração">
            <Row label="Salário nominal" value={fmtMoney(emp.nominal_salary)} />
            <Row label="Aumento salarial" value={fmtMoney(emp.salary_increase)} />
            <Row label="Salário base" value={fmtMoney(emp.salary_base)} />
            <Row label="Salário líquido (estimado)" value={fmtMoney(emp.salary_liquido)} />
            <Row label="Abonos" value={fmtMoney(emp.salary_allowances_value)} />
            <Row label="NIB / Conta bancária" value={emp.nib} />
            <Row label="Método de pagamento" value={emp.payment_method} />
          </Section>

          {/* Horas e progressão */}
          <Section title="Horas e progressão">
            <Row label="Horas base (mês)" value={emp.base_month_hours} />
            <Row label="Valor hora ordinária" value={emp.ordinary_hour_value} />
            <Row label="Valor hora extraordinária" value={emp.extraordinary_hour_value} />
            <Row label="Meses mínimos de progressão" value={emp.minimum_progression_months} />
            <Row label="Meses mínimos de mudança de carreira" value={emp.minimum_career_change_months} />
            <Row label="Subsídio por agregado familiar" value={fmtMoney(emp.family_allowance_per_dependent)} />
          </Section>

          {/* Informações adicionais */}
          <Section title="Informações adicionais">
            <Row label="Pode progredir" value={fmtBool(emp.can_progress_salary)} />
            <Row label="Pode mudar de carreira" value={fmtBool(emp.can_change_career)} />
            <Row label="Processo disciplinar aberto" value={fmtBool(emp.has_open_disciplinary_process)} />
            <Row label="Antiguidade (meses)" value={emp.tenure_months} />
          </Section>

          {/* Auditoria */}
          <Section title="Auditoria">
            <Row label="ID interno" value={emp.id} />
            <Row label="Versão" value={emp.version} />
            <Row label="Criado em" value={fmtDate(emp.created_at)} />
            <Row label="Atualizado em" value={fmtDate(emp.updated_at)} />
          </Section>

        </div>
      </div>
    </AppLayout>
  )
}
