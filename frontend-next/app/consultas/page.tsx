"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import { useAuth } from "@/hooks/useAuth"
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
  const blob = await apiFetch<Blob>(`/faturas/${faturaId}/pdf/`, { responseType: "blob" })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export default function ConsultasPage() {
  const { user } = useAuth()

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

  const carregar = useCallback(async () => {
    const [cons, pacs, meds, especs] = await Promise.all([
      apiFetch<any>("/consultas/"),
      apiFetch<any>("/pacientes/"),
      apiFetch<any>("/consultas/medicos/"),
      apiFetch<any>("/consultas/especialidade/"),
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
        setErro(e?.message || "Falha ao carregar consultas.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [carregar])

  async function criarConsulta(e: any) {
    e.preventDefault()
    if (!canWrite) return

    if (!pacienteId) {
      alert("Selecione um paciente.")
      return
    }
    if (!especialidadeId) {
      alert("Selecione uma especialidade.")
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

      await apiFetch("/consultas/", {
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
      alert(e?.message || "Falha ao criar consulta.")
    } finally {
      setSalvando(false)
    }
  }

  const criarFatura = useCallback(async (_consultaId: number) => {
    alert("Criar fatura apenas em Faturamento/Recepção.")
  }, [])

  const cancelarConsulta = useCallback(async (consultaId: number) => {
    if (!canWrite) return
    if (!confirm("Cancelar esta consulta?")) return
    try {
      await apiFetch(`/consultas/${consultaId}/cancelar/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await carregar()
    } catch (e: any) {
      alert(e?.message || "Falha ao cancelar consulta.")
    }
  }, [canWrite, carregar])

  const concluirConsulta = useCallback(async (consultaId: number) => {
    if (!canWrite) return
    if (!confirm("Marcar esta consulta como concluída?")) return
    try {
      await apiFetch(`/consultas/${consultaId}/concluir/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      await carregar()
    } catch (e: any) {
      alert(e?.message || "Falha ao concluir consulta.")
    }
  }, [canWrite, carregar])

  const remarcarConsulta = useCallback(async (row: ConsultaRow) => {
    if (!canWrite) return
    const current = row.agendada_para ? new Date(row.agendada_para) : null
    const defaultValue = current && !Number.isNaN(current.getTime())
      ? current.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
      : ""

    const input = prompt(
      "Nova data/hora (YYYY-MM-DDTHH:mm):",
      defaultValue
    )
    if (!input) return

    const d = new Date(input)
    const value = Number.isNaN(d.getTime()) ? input : d.toISOString()

    try {
      await apiFetch(`/consultas/${row.id}/remarcar/`, {
        method: "POST",
        body: JSON.stringify({ agendada_para: value }),
      })
      await carregar()
    } catch (e: any) {
      alert(e?.message || "Falha ao remarcar consulta.")
    }
  }, [canWrite, carregar])

  const columns = useMemo(
    () => {
      const labelHorario = (value?: string) => {
        if (!value) return "Normal"
        if (value === "FIM_SEMANA") return "Fim de semana"
        if (value === "FORA_EXPEDIENTE") return "Fora de expediente"
        if (value === "FERIADO_MANUAL") return "Feriado"
        return "Normal"
      }

      return [
        { header: "Código", render: (r: ConsultaRow) => r.id_custom || r.id },
        { header: "Paciente", render: (r: ConsultaRow) => r.paciente_nome || "-" },
        { header: "Médico", render: (r: ConsultaRow) => r.medico_nome || "—" },
        { header: "Tipo", render: (r: ConsultaRow) => r.tipo || "-" },
        { header: "Estado", render: (r: ConsultaRow) => r.estado || "-" },
        { header: "Horário", render: (r: ConsultaRow) => labelHorario(r.tipo_horario) },
        { header: "Agendada", render: (r: ConsultaRow) => fmtDate(r.agendada_para) },
        { header: "Preço", render: (r: ConsultaRow) => <MoneyValue value={r.preco} />, className: "text-right" },
        {
          header: "Fatura",
          render: (r: ConsultaRow) => r.fatura_codigo || "—",
        },
        {
          header: "Ações",
          render: (r: ConsultaRow) => (
            <div className="flex flex-wrap gap-2">
              {canWrite && r.estado === "MARCADA" ? (
                <button
                  type="button"
                  onClick={() => remarcarConsulta(r)}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Remarcar
                </button>
              ) : null}

              {canWrite && r.estado === "MARCADA" ? (
                <button
                  type="button"
                  onClick={() => concluirConsulta(r.id)}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Concluir
                </button>
              ) : null}

              {canWrite && r.estado !== "CANCELADA" && r.estado !== "CONCLUIDA" ? (
                <button
                  type="button"
                  onClick={() => cancelarConsulta(r.id)}
                  className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Cancelar
                </button>
              ) : null}

            {r.fatura_id ? (
              <button
                type="button"
                onClick={() => abrirPdfFatura(Number(r.fatura_id))}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                PDF Fatura
              </button>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
        ),
      },
      ]
    },
    [canWrite, cancelarConsulta, concluirConsulta, remarcarConsulta]
  )

  const tipoHorarioLabel = useMemo(() => {
    const tipo = precoPreview?.tipo_horario
    if (!tipo) return "Normal"
    if (tipo === "FIM_SEMANA") return "Fim de semana"
    if (tipo === "FORA_EXPEDIENTE") return "Fora de expediente"
    if (tipo === "FERIADO_MANUAL") return "Feriado"
    return "Normal"
  }, [precoPreview?.tipo_horario])

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
        const res = await apiFetch<PrecoPreview>(`/consultas/consulta/preco/?${params.toString()}`)
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
          title="Consultas"
          subtitle="Marcação, registo e faturamento de consultas médicas."
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {canWrite ? (
          <Card title="Nova consulta" subtitle="Crie a consulta e, se necessário, emita a fatura.">
            <form onSubmit={criarConsulta} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Paciente</label>
                <select
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Médico (opcional)</label>
                <select
                  value={medicoId}
                  onChange={(e) => setMedicoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                  <option value="">Sem médico</option>
                  {medicos.map((m) => {
                    const detalhe = m.cargo_nome || m.profissao
                    const label = [m.nome || `Médico ${m.id}`, detalhe].filter(Boolean).join(" · ")
                    return (
                      <option key={m.id} value={m.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Especialidade</label>
                <select
                  value={especialidadeId}
                  onChange={(e) => setEspecialidadeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  required
                >
                  <option value="">Selecione</option>
                  {especialidades
                    .filter((x) => x.ativo !== false)
                    .map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.nome || `Especialidade ${esp.id}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">
                  Preço {precoPreview?.moeda ? `(${precoPreview.moeda})` : "(MZN)"}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    value={precoPreview?.preco_final || ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                    placeholder={especialidadeId ? "Calculando..." : "Selecione uma especialidade"}
                  />

                  <div className="flex flex-col items-start">
                    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-gray-700">
                      {tipoHorarioLabel}
                    </span>
                    {precoPreview?.multiplicador_preco ? (
                      <span className="text-[11px] text-gray-500">x{precoPreview.multiplicador_preco}</span>
                    ) : null}
                    {precoPreview?.feriado_manual ? (
                      <span className="text-[11px] text-amber-700">Feriado marcado</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Agendada para (opcional)</label>
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
                  <label htmlFor="feriado-manual" className="text-xs font-semibold text-gray-700">Feriado</label>
                  <span className="text-[11px] text-gray-500">Marca 2x o valor quando não for fim de semana/fora de expediente.</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  disabled={salvando}
                  className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Criar consulta"}
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Card title="Modo leitura" subtitle="Contabilidade pode ver, mas não alterar.">
            <div className="text-sm text-gray-600">
              Este módulo está disponível para auditoria e estatística. Para criar/editar consultas, use uma conta com permissão clínica.
            </div>
          </Card>
        )}

        <Card title="Lista de consultas" subtitle="Consultas do tenant atual.">
          {loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : (
            <DataTable<ConsultaRow>
              columns={columns as any}
              data={consultas}
              emptyMessage="Nenhuma consulta encontrada."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
