"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
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

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiFetch<Employee>(`/human_resources/employee/${id}/`)
      .then(setEmp)
      .catch((e) => setError(e?.message ?? "Funcionário não encontrado."))
      .finally(() => setLoading(false))
  }, [id])

  const [panel, setPanel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    if (panel !== "promover" || roles.length) return
    apiFetch<any>(`/human_resources/role/?page_size=100`)
      .then((res) => setRoles(Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : []))
      .catch(() => setRoles([]))
  }, [panel, roles.length])

  const [docDates, setDocDates] = useState<{ inicio: string; fim: string }>({ inicio: "", fim: "" })
  const [docBusy, setDocBusy] = useState<string | null>(null)

  async function imprimirDocumento(tipo: string) {
    setDocBusy(tipo)
    setActionError(null)
    try {
      const params = new URLSearchParams({ tipo })
      if (docDates.inicio) params.set("inicio", docDates.inicio)
      if (docDates.fim) params.set("fim", docDates.fim)
      const blob = await apiFetch<Blob>(`/human_resources/employee/${id}/documento/?${params.toString()}`, {
        responseType: "blob",
      })
      const url = URL.createObjectURL(blob)
      const surname = String(emp?.name || "").trim().split(/\s+/).pop() || "funcionario"
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${tipo}_${emp?.custom_id || id}_${surname}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.open(url, "_blank", "noopener")
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      setActionError(e?.message ?? "Falha ao gerar o documento.")
    } finally {
      setDocBusy(null)
    }
  }

  function abrirPainel(nome: string) {
    setPanel((current) => (current === nome ? null : nome))
    setForm({})
    setActionError(null)
    setFeedback(null)
  }

  async function executar(action: string, body: Record<string, any>, successMessage: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return
    setBusy(true)
    setActionError(null)
    setFeedback(null)
    try {
      await apiFetch(`/human_resources/employee/${id}/${action}/`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      const updated = await apiFetch<Employee>(`/human_resources/employee/${id}/`, { clientCache: false })
      setEmp(updated)
      setPanel(null)
      setForm({})
      setFeedback(successMessage)
    } catch (e: any) {
      setActionError(e?.message ?? "Falha ao executar a ação.")
    } finally {
      setBusy(false)
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
          </div>
        </div>

        {/* Ações de RH (fluxos reais: nunca eliminar o funcionário) */}
        <div className="flex flex-wrap gap-2">
          {[
            ["disciplinar", "Iniciar processo disciplinar"],
            ["promover", "Promover"],
            ["aumento", "Dar aumento salarial"],
            ["revisao", "Revisão salarial"],
            ["aposentar", "Aposentar"],
            ["demitir", "Demitir"],
            ["expulsar", "Expulsar (justa causa)"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => abrirPainel(key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                panel === key
                  ? "border-[var(--primary-500)] bg-[var(--primary-600)] text-white"
                  : ["demitir", "expulsar"].includes(key)
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border-border bg-background text-foreground-2 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{feedback}</div>
        ) : null}
        {actionError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{actionError}</div>
        ) : null}

        {panel ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            {panel === "disciplinar" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Iniciar processo disciplinar</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Tipo de incidente (ex.: falta injustificada)" value={form.incident_type || ""} onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))} />
                  <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={form.severity || "MODERADA"} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                    <option value="LEVE">Leve</option>
                    <option value="MODERADA">Moderada</option>
                    <option value="GRAVE">Grave</option>
                    <option value="GRAVISSIMA">Gravíssima</option>
                  </select>
                  <input type="date" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={form.incident_date || ""} onChange={(e) => setForm((f) => ({ ...f, incident_date: e.target.value }))} />
                </div>
                <textarea className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" rows={3} placeholder="Descrição do incidente (obrigatório)" value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                <button type="button" disabled={busy} onClick={() => executar("iniciar-processo-disciplinar", { incident_type: form.incident_type, severity: form.severity || "MODERADA", description: form.description, incident_date: form.incident_date || undefined }, "Processo disciplinar aberto. Promoções e aumentos ficam bloqueados até ao encerramento.")} className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60">Abrir processo</button>
              </>
            ) : null}

            {panel === "promover" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Promover funcionário</div>
                <div className="text-xs text-muted-foreground">Exige antiguidade mínima de mudança de carreira e ausência de processo disciplinar aberto. O aumento associado soma-se ao salário e fica no histórico salarial.</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={form.role || ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="">Novo cargo...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <input type="number" min="0" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Aumento associado (opcional)" value={form.salary_increase || ""} onChange={(e) => setForm((f) => ({ ...f, salary_increase: e.target.value }))} />
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo (opcional)" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <button type="button" disabled={busy} onClick={() => executar("promover", { role: form.role ? Number(form.role) : null, salary_increase: form.salary_increase || undefined, reason: form.reason }, "Funcionário promovido com registo no histórico salarial.")} className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60">Promover</button>
              </>
            ) : null}

            {panel === "aumento" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Dar aumento salarial</div>
                <div className="text-xs text-muted-foreground">Exige antiguidade mínima de progressão e ausência de processo disciplinar aberto; registado no histórico salarial.</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="number" min="0" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Valor do aumento" value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo (ex.: mérito anual)" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <button type="button" disabled={busy} onClick={() => executar("dar-aumento", { amount: form.amount, reason: form.reason }, "Aumento aplicado e registado no histórico salarial.")} className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60">Aplicar aumento</button>
              </>
            ) : null}

            {panel === "revisao" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Revisão salarial</div>
                <div className="text-xs text-muted-foreground">Fixa um novo salário nominal (pode reduzir) e zera aumentos acumulados. Motivo obrigatório; tudo fica no histórico salarial.</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="number" min="0" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Novo salário nominal" value={form.nominal_salary || ""} onChange={(e) => setForm((f) => ({ ...f, nominal_salary: e.target.value }))} />
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo (obrigatório)" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <button type="button" disabled={busy} onClick={() => executar("revisao-salarial", { nominal_salary: form.nominal_salary, reason: form.reason }, "Revisão salarial aplicada e registada no histórico.", "Confirmar a revisão salarial? Esta operação substitui o salário de referência.")} className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60">Aplicar revisão</button>
              </>
            ) : null}

            {panel === "aposentar" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Aposentar funcionário</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="date" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={form.date || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo (opcional)" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <button type="button" disabled={busy} onClick={() => executar("aposentar", { date: form.date || undefined, reason: form.reason }, "Funcionário reformado; desligamento registado.", "Confirmar a aposentação deste funcionário?")} className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60">Aposentar</button>
              </>
            ) : null}

            {panel === "demitir" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Demitir funcionário</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo (obrigatório)" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                  <input type="date" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={form.date || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <button type="button" disabled={busy} onClick={() => executar("demitir", { reason: form.reason, date: form.date || undefined }, "Funcionário demitido; desligamento registado.", "Confirmar a demissão deste funcionário?")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60">Demitir</button>
              </>
            ) : null}

            {panel === "expulsar" ? (
              <>
                <div className="text-sm font-semibold text-foreground">Expulsar (despedimento por justa causa)</div>
                <div className="text-xs text-rose-700">Exige processo disciplinar concluído com sanção de despedimento — sem ele, a operação é recusada.</div>
                <input className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Motivo / referência do processo" value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                <button type="button" disabled={busy} onClick={() => executar("expulsar", { reason: form.reason }, "Funcionário expulso por justa causa; desligamento registado.", "Confirmar a expulsão por justa causa?")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60">Expulsar</button>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Documentos de RH imprimíveis (padrão institucional do sistema) */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-semibold text-foreground">Documentos</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Período (para guias e licenças):
            <input type="date" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" value={docDates.inicio} onChange={(e) => setDocDates((d) => ({ ...d, inicio: e.target.value }))} />
            até
            <input type="date" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" value={docDates.fim} onChange={(e) => setDocDates((d) => ({ ...d, fim: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["guia_marcha_ferias", "Guia de marcha — Férias", true],
              ["guia_marcha_dispensa", "Guia de marcha — Dispensa", true],
              ["licenca_maternidade", "Licença de maternidade", emp.gender === "F"],
              ["licenca_paternidade", "Licença de paternidade", emp.gender === "M"],
              ["licenca_doenca", "Licença por doença", true],
            ]
              .filter(([, , visible]) => visible)
              .map(([tipo, label]) => (
                <button
                  key={tipo as string}
                  type="button"
                  disabled={docBusy !== null}
                  onClick={() => imprimirDocumento(tipo as string)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground-2 transition hover:text-foreground disabled:opacity-60"
                >
                  {docBusy === tipo ? "Gerando..." : `Imprimir ${label}`}
                </button>
              ))}
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
