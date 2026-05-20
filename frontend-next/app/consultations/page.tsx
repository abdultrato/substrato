"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Paciente = { id: number; nome: string }
type Medico = { id: number; nome?: string; profissao?: string; cargo_nome?: string }
type Especialidade = {
  id: number
  nome?: string
  preco_base?: string | number
  ativo?: boolean
}

type PrecoPreview = {
  especialidade: number
  especialidade_nome?: string
  preco_base?: string
  feriado_manual?: boolean
  is_holiday?: boolean
  tipo_horario?: string
  multiplicador_preco?: string
  preco_final?: string
  moeda?: string
}

type ConsultaRow = {
  id: number
  id_custom?: string
  paciente?: number
  paciente_nome?: string
  medico?: number | null
  medico_nome?: string
  tipo?: string
  estado?: string
  preco?: string | number
  tipo_horario?: string
  multiplicador_preco?: string | number
  feriado_manual?: boolean
  agendada_para?: string
  fatura_id?: number | null
  fatura_codigo?: string
  fatura_estado?: string
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

async function abrirPdfFatura(faturaId: number) {
  const blob = await apiFetch<Blob>(`/invoices/${faturaId}/pdf/`, { responseType: "blob" })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export default function ConsultasPage() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const canWrite = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
  ])

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [consultas, setConsultas] = useState<ConsultaRow[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([])

  const [pacienteId, setPacienteId] = useState("")
  const [medicoId, setMedicoId] = useState("")
  const [especialidadeId, setEspecialidadeId] = useState("")
  const [agendadaPara, setAgendadaPara] = useState("")
  const [feriado, setFeriado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [precoPreview, setPrecoPreview] = useState<PrecoPreview | null>(null)
  const [remarcarModalOpen, setRemarcarModalOpen] = useState(false)
  const [remarcando, setRemarcando] = useState(false)
  const [consultaRemarcar, setConsultaRemarcar] = useState<ConsultaRow | null>(null)
  const [novaDataHoraConsulta, setNovaDataHoraConsulta] = useState("")

  const localizeErrorMessage = useCallback((message?: string) => {
    const raw = (message || "").trim()
    if (!raw) return t("Ocorreu um erro inesperado.", "An unexpected error occurred.")
    if (/^internal server error$/i.test(raw)) {
      return t("Erro interno do servidor.", "Internal server error.")
    }
    return raw
  }, [t])

  const carregar = useCallback(async () => {
    const [cons, pacs, meds, especs] = await Promise.all([
      apiFetch<any>("/consultations/"),
      apiFetch<any>("/patients/"),
      apiFetch<any>("/consultations/doctors/"),
      apiFetch<any>("/consultations/specialty/"),
    ])

    const list = (v: any) => (v && v.results ? v.results : v) || []

    setConsultas(Array.isArray(list(cons)) ? list(cons) : [])
    setPacientes(Array.isArray(list(pacs)) ? list(pacs) : [])
    setMedicos(Array.isArray(list(meds)) ? list(meds) : [])
    const especItems = Array.isArray(list(especs)) ? (list(especs) as Especialidade[]) : []
    setEspecialidades(especItems)
    setEspecialidadeId((prev) => prev || (especItems[0]?.id ? String(especItems[0].id) : ""))
  }, [])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        await carregar()
        if (!mounted) return
      } catch (e: any) {
        if (!mounted) return
        setErro(
          isNotFoundLikeError(e)
            ? null
            : localizeErrorMessage(e?.message) || t("Falha ao carregar consultas.", "Failed to load consultations.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [carregar, localizeErrorMessage, t])

  async function criarConsulta(e: any) {
    e.preventDefault()
    if (!canWrite) return

    if (!pacienteId) {
      alert(t("Selecione um paciente.", "Select a patient."))
      return
    }
    if (!especialidadeId) {
      alert(t("Selecione uma especialidade.", "Select a specialty."))
      return
    }

    setSalvando(true)
    try {
      const payload: any = {
        paciente: Number(pacienteId),
        especialidade: Number(especialidadeId),
      }

      if (medicoId) payload.medico = Number(medicoId)

      if (agendadaPara) {
        const d = new Date(agendadaPara)
        payload.agendada_para = Number.isNaN(d.getTime()) ? agendadaPara : d.toISOString()
      }

      if (feriado) payload.feriado_manual = true

      await apiFetch("/consultations/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setPacienteId("")
      setMedicoId("")
      setEspecialidadeId("")
      setAgendadaPara("")
      setFeriado(false)
      setPrecoPreview(null)

      await carregar()
    } catch (e: any) {
      alert(localizeErrorMessage(e?.message) || t("Falha ao criar consulta.", "Failed to create consultation."))
    } finally {
      setSalvando(false)
    }
  }

  const criarFatura = useCallback(async (_consultaId: number) => {
    alert(t("Criar fatura apenas em Faturamento/Receção.", "Create invoice only in Billing/Reception."))
  }, [t])

  const cancelarConsulta = useCallback(async (consultaId: number) => {
    if (!canWrite) return
    if (!confirm(t("Cancelar esta consulta?", "Cancel this consultation?"))) return
    try {
      await apiFetch(`/consultations/${consultaId}/cancelar/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await carregar()
    } catch (e: any) {
      alert(localizeErrorMessage(e?.message) || t("Falha ao cancelar consulta.", "Failed to cancel consultation."))
    }
  }, [canWrite, carregar, localizeErrorMessage, t])

  const concluirConsulta = useCallback(async (consultaId: number) => {
    if (!canWrite) return
    if (!confirm(t("Marcar esta consulta como concluída?", "Mark this consultation as completed?"))) return
    try {
      await apiFetch(`/consultations/${consultaId}/concluir/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await carregar()
    } catch (e: any) {
      alert(localizeErrorMessage(e?.message) || t("Falha ao concluir consulta.", "Failed to complete consultation."))
    }
  }, [canWrite, carregar, localizeErrorMessage, t])

  const fecharModalRemarcacao = useCallback(() => {
    if (remarcando) return
    setRemarcarModalOpen(false)
    setConsultaRemarcar(null)
    setNovaDataHoraConsulta("")
  }, [remarcando])

  const remarcarConsulta = useCallback(async (row: ConsultaRow) => {
    if (!canWrite) return
    const current = row.agendada_para ? new Date(row.agendada_para) : null
    const defaultValue = current && !Number.isNaN(current.getTime())
      ? current.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
      : ""
    setConsultaRemarcar(row)
    setNovaDataHoraConsulta(defaultValue)
    setRemarcarModalOpen(true)
  }, [canWrite])

  const confirmarRemarcacaoConsulta = useCallback(async () => {
    if (!consultaRemarcar?.id) return
    if (!novaDataHoraConsulta.trim()) {
      alert(t("Informe a nova data/hora da consulta.", "Provide the new consultation date/time."))
      return
    }
    const d = new Date(novaDataHoraConsulta)
    const value = Number.isNaN(d.getTime()) ? novaDataHoraConsulta : d.toISOString()

    setRemarcando(true)
    try {
      await apiFetch(`/consultations/${consultaRemarcar.id}/remarcar/`, {
        method: "POST",
        body: JSON.stringify({ agendada_para: value }),
      })
      setRemarcarModalOpen(false)
      setConsultaRemarcar(null)
      setNovaDataHoraConsulta("")
      await carregar()
    } catch (e: any) {
      alert(localizeErrorMessage(e?.message) || t("Falha ao remarcar consulta.", "Failed to reschedule consultation."))
    } finally {
      setRemarcando(false)
    }
  }, [carregar, consultaRemarcar?.id, localizeErrorMessage, novaDataHoraConsulta, t])

  const columns = useMemo(
    () => {
      const labelHorario = (value?: string) => {
        if (!value) return t("Normal", "Normal")
        if (value === "FIM_SEMANA") return t("Fim de semana", "Weekend")
        if (value === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
        if (value === "FERIADO_MANUAL") return t("Feriado", "Holiday")
        return t("Normal", "Normal")
      }

      const labelEstado = (value?: string) => {
        if (!value) return "-"
        if (value === "MARCADA") return t("Marcada", "Scheduled")
        if (value === "CONCLUIDA") return t("Concluída", "Completed")
        if (value === "CANCELADA") return t("Cancelada", "Canceled")
        return value
      }

      return [
        { header: t("Código", "Code"), render: (r: ConsultaRow) => r.id_custom || r.id },
        { header: t("Paciente", "Patient"), render: (r: ConsultaRow) => r.paciente_nome || "-" },
        { header: t("Médico", "Doctor"), render: (r: ConsultaRow) => r.medico_nome || "—" },
        { header: t("Tipo", "Type"), render: (r: ConsultaRow) => r.tipo || "-" },
        { header: t("Estado", "Status"), render: (r: ConsultaRow) => labelEstado(r.estado) },
        { header: t("Horário", "Schedule"), render: (r: ConsultaRow) => labelHorario(r.tipo_horario) },
        { header: t("Agendada", "Scheduled"), render: (r: ConsultaRow) => fmtDate(r.agendada_para) },
        { header: t("Preço", "Price"), render: (r: ConsultaRow) => <MoneyValue value={r.preco} />, className: "text-right" },
        {
          header: t("Fatura", "Invoice"),
          render: (r: ConsultaRow) => r.fatura_codigo || "—",
        },
        {
          header: t("Ações", "Actions"),
          render: (r: ConsultaRow) => (
            <div className="flex flex-wrap gap-2">
              {canWrite && r.estado === "MARCADA" ? (
                <button
                  type="button"
                  onClick={() => remarcarConsulta(r)}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t("Remarcar", "Reschedule")}
                </button>
              ) : null}

              {canWrite && r.estado === "MARCADA" ? (
                <button
                  type="button"
                  onClick={() => concluirConsulta(r.id)}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t("Concluir", "Complete")}
                </button>
              ) : null}

              {canWrite && r.estado !== "CANCELADA" && r.estado !== "CONCLUIDA" ? (
                <button
                  type="button"
                  onClick={() => cancelarConsulta(r.id)}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  {t("Cancelar", "Cancel")}
                </button>
              ) : null}

            {r.fatura_id ? (
              <button
                type="button"
                onClick={() => abrirPdfFatura(Number(r.fatura_id))}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {t("PDF Fatura", "Invoice PDF")}
              </button>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
        ),
      },
      ]
    },
    [canWrite, cancelarConsulta, concluirConsulta, remarcarConsulta, t]
  )

  const tipoHorarioLabel = useMemo(() => {
    const tipo = precoPreview?.tipo_horario
    if (!tipo) return t("Normal", "Normal")
    if (tipo === "FIM_SEMANA") return t("Fim de semana", "Weekend")
    if (tipo === "FORA_EXPEDIENTE") return t("Fora de expediente", "After hours")
    if (tipo === "FERIADO_MANUAL") return t("Feriado", "Holiday")
    return t("Normal", "Normal")
  }, [precoPreview?.tipo_horario, t])

  useEffect(() => {
    let mounted = true
    async function loadPreview() {
      if (!especialidadeId) {
        if (mounted) setPrecoPreview(null)
        return
      }

      try {
        const params = new URLSearchParams()
        params.set("especialidade", String(especialidadeId))
        if (agendadaPara) {
          const d = new Date(agendadaPara)
          const value = Number.isNaN(d.getTime()) ? agendadaPara : d.toISOString()
          params.set("agendada_para", value)
        }
        if (feriado) params.set("feriado_manual", "true")
        const res = await apiFetch<PrecoPreview>(`/consultations/consultation/preco/?${params.toString()}`)
        if (mounted) setPrecoPreview(res || null)
      } catch {
        if (mounted) setPrecoPreview(null)
      }
    }

    loadPreview()
    return () => {
      mounted = false
    }
  }, [especialidadeId, agendadaPara, feriado])

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-6">
        <PageHeader
          title={t("Consultas", "Consultations")}
          subtitle={t(
            "Marcação, registo e faturamento de consultas médicas.",
            "Scheduling, recording, and billing for medical consultations."
          )}
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {canWrite ? (
          <Card
            title={t("Nova consulta", "New consultation")}
            subtitle={t("Crie a consulta e, se necessário, emita a fatura.", "Create the consultation and issue the invoice if needed.")}
          >
            <form onSubmit={criarConsulta} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Paciente", "Patient")}</label>
                <select
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">{t("Selecione", "Select")}</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Médico (opcional)", "Doctor (optional)")}</label>
                <select
                  value={medicoId}
                  onChange={(e) => setMedicoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                  <option value="">{t("Sem médico", "No doctor")}</option>
                  {medicos.map((m) => {
                    const detalhe = m.cargo_nome || m.profissao
                    const label = [m.nome || `${t("Médico", "Doctor")} ${m.id}`, detalhe].filter(Boolean).join(" · ")
                    return (
                      <option key={m.id} value={m.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Especialidade", "Specialty")}</label>
                <select
                  value={especialidadeId}
                  onChange={(e) => setEspecialidadeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">{t("Selecione", "Select")}</option>
                  {especialidades
                    .filter((x) => x.ativo !== false)
                    .map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.nome || `${t("Especialidade", "Specialty")} ${esp.id}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">
                  {t("Preço", "Price")} {precoPreview?.moeda ? `(${precoPreview.moeda})` : "(MZN)"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    value={precoPreview?.preco_final || ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                    placeholder={especialidadeId ? t("Calculando...", "Calculating...") : t("Selecione uma especialidade", "Select a specialty")}
                  />

                  <div className="flex flex-col items-start">
                    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      {tipoHorarioLabel}
                    </span>
                    {precoPreview?.multiplicador_preco ? (
                      <span className="text-[11px] text-gray-500">x{precoPreview.multiplicador_preco}</span>
                    ) : null}
                    {precoPreview?.feriado_manual ? (
                      <span className="text-[11px] text-amber-700">{t("Feriado marcado", "Holiday marked")}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">{t("Agendada para (opcional)", "Scheduled for (optional)")}</label>
                <input
                  type="datetime-local"
                  value={agendadaPara}
                  onChange={(e) => setAgendadaPara(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                <input
                  id="feriado-manual"
                  type="checkbox"
                  checked={feriado}
                  onChange={(e) => setFeriado(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400"
                />
                <div className="flex flex-col leading-tight">
                  <label htmlFor="feriado-manual" className="text-xs font-semibold text-gray-700">{t("Feriado", "Holiday")}</label>
                  <span className="text-[11px] text-gray-500">
                    {t(
                      "Marca 2x o valor quando não for fim de semana/fora de expediente.",
                      "Applies 2x pricing when it's not weekend/after hours."
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  disabled={salvando}
                  className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:opacity-60"
                >
                  {salvando ? t("Salvando...", "Saving...") : t("Criar consulta", "Create consultation")}
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title={t("Modo leitura", "Read-only mode")} subtitle={t("Contabilidade pode ver, mas não alterar.", "Accounting can view, but cannot edit.")}>
            <div className="text-sm text-gray-600">
              {t(
                "Este módulo está disponível para auditoria e estatística. Para criar/edit consultas, use uma conta com permissão clínica.",
                "This module is available for auditing and statistics. To create/edit consultations, use an account with clinical permissions."
              )}
            </div>
          </Card>
        )}

        <Card title={t("Lista de consultas", "Consultations list")} subtitle={t("Consultas do tenant atual.", "Consultations for the current tenant.")}>
          {loading ? (
            <div className="text-sm text-gray-500">{t("Carregando...", "Loading...")}</div>
          ) : (
            <DataTable<ConsultaRow>
              columns={columns as any}
              data={consultas}
              emptyMessage={t("Nenhuma consulta encontrada.", "No consultations found.")}
            />
          )}
        </Card>
      </div>

      {remarcarModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={fecharModalRemarcacao}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t("Remarcar consulta", "Reschedule consultation")}
              </h3>
              <p className="mt-1 text-xs text-[var(--gray-600)]">
                {t("Atualize a data e hora da consulta selecionada.", "Update the date and time of the selected consultation.")}
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Consulta:", "Consultation:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {consultaRemarcar?.id_custom || consultaRemarcar?.id || "-"}
                </span>
                {" · "}
                {t("Paciente:", "Patient:")}{" "}
                <span className="font-semibold text-[var(--text)]">
                  {consultaRemarcar?.paciente_nome || "-"}
                </span>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-[var(--gray-600)]">
                  {t("Nova data/hora", "New date/time")}
                </span>
                <input
                  type="datetime-local"
                  value={novaDataHoraConsulta}
                  onChange={(e) => setNovaDataHoraConsulta(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  autoFocus
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={fecharModalRemarcacao}
                disabled={remarcando}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
              >
                {t("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                onClick={confirmarRemarcacaoConsulta}
                disabled={remarcando}
                className="inline-flex items-center rounded-lg bg-[var(--primary-700)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-800)] disabled:opacity-60"
              >
                {remarcando ? t("Atualizando...", "Updating...") : t("Atualizar data/hora", "Update date/time")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}



