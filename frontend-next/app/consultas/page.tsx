"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Paciente = { id: number; nome: string }
type Medico = { id: number; nome?: string; username?: string }

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

function money(v: any): string {
  if (v === null || v === undefined || v === "") return "-"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  const [pacienteId, setPacienteId] = useState("")
  const [medicoId, setMedicoId] = useState("")
  const [tipo, setTipo] = useState("Consulta Geral")
  const [preco, setPreco] = useState("0.00")
  const [agendadaPara, setAgendadaPara] = useState("")
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    const [cons, pacs, meds] = await Promise.all([
      apiFetch<any>("/consultas/"),
      apiFetch<any>("/pacientes/"),
      apiFetch<any>("/consultas/medicos/"),
    ])

    const list = (v: any) => (v && v.results ? v.results : v) || []

    setConsultas(Array.isArray(list(cons)) ? list(cons) : [])
    setPacientes(Array.isArray(list(pacs)) ? list(pacs) : [])
    setMedicos(Array.isArray(list(meds)) ? list(meds) : [])
  }

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
  }, [])

  async function criarConsulta(e: any) {
    e.preventDefault()
    if (!canWrite) return

    if (!pacienteId) {
      alert("Selecione um paciente.")
      return
    }
    if (!tipo.trim()) {
      alert("Informe o tipo da consulta.")
      return
    }

    setSalvando(true)
    try {
      const payload: any = {
        paciente: Number(pacienteId),
        tipo: tipo.trim(),
        preco,
      }

      if (medicoId) payload.medico = Number(medicoId)

      if (agendadaPara) {
        const d = new Date(agendadaPara)
        payload.agendada_para = Number.isNaN(d.getTime()) ? agendadaPara : d.toISOString()
      }

      await apiFetch("/consultas/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      setPacienteId("")
      setMedicoId("")
      setTipo("Consulta Geral")
      setPreco("0.00")
      setAgendadaPara("")

      await carregar()
    } catch (e: any) {
      alert(e?.message || "Falha ao criar consulta.")
    } finally {
      setSalvando(false)
    }
  }

  async function criarFatura(consultaId: number) {
    if (!canWrite) return
    try {
      await apiFetch(`/consultas/${consultaId}/criar_fatura/`, {
        method: "POST",
        body: JSON.stringify({ emitir: true }),
      })
      await carregar()
    } catch (e: any) {
      alert(e?.message || "Falha ao criar fatura.")
    }
  }

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: ConsultaRow) => r.id_custom || r.id },
      { header: "Paciente", render: (r: ConsultaRow) => r.paciente_nome || "-" },
      { header: "Médico", render: (r: ConsultaRow) => r.medico_nome || "—" },
      { header: "Tipo", render: (r: ConsultaRow) => r.tipo || "-" },
      { header: "Estado", render: (r: ConsultaRow) => r.estado || "-" },
      { header: "Agendada", render: (r: ConsultaRow) => fmtDate(r.agendada_para) },
      { header: "Preço", render: (r: ConsultaRow) => `${money(r.preco)} MZN`, className: "text-right" },
      {
        header: "Fatura",
        render: (r: ConsultaRow) => r.fatura_codigo || "—",
      },
      {
        header: "Ações",
        render: (r: ConsultaRow) => (
          <div className="flex flex-wrap gap-2">
            {r.fatura_id ? (
              <button
                type="button"
                onClick={() => abrirPdfFatura(Number(r.fatura_id))}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                PDF Fatura
              </button>
            ) : canWrite ? (
              <button
                type="button"
                onClick={() => criarFatura(r.id)}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Criar fatura
              </button>
            ) : (
              <span className="text-xs text-gray-500">—</span>
            )}
          </div>
        ),
      },
    ],
    [canWrite]
  )

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
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome || m.username || `Médico ${m.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Tipo</label>
                <input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  placeholder="Ex.: Consulta Geral"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-600">Preço (MZN)</label>
                <input
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  inputMode="decimal"
                  placeholder="0.00"
                />
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

