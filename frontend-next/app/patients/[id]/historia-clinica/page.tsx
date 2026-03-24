"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import MoneyValue from "@/components/ui/MoneyValue"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

type HistoriaClinicaPayload = {
  paciente?: any
  referencia?: any
  cardex?: any[]
  consultas?: any[]
  requisicoes?: any[]
  procedimentos_enfermagem?: any[]
  internamentos_enfermaria?: any[]
  vendas_farmacia?: any[]
  faturas?: any[]
  recibos?: any[]
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function truncate(value: any, max = 80): string {
  const v = String(value ?? "").trim()
  if (!v) return "-"
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(0, max - 3))}...`
}

function money(v: any): string {
  if (v === null || v === undefined || v === "") return "-"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function HistoriaClinicaPage() {
  const routeParams = useParams()
  const id = routeParamToString((routeParams as any)?.id)
  const { loading } = useAuthGuard()
  const [payload, setPayload] = useState<HistoriaClinicaPayload | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setCarregando(true)
        setErro(null)
        const res = await apiFetch<HistoriaClinicaPayload>(
          `/pacientes/${id}/historia_clinica/?limit=200`
        )
        if (!mounted) return
        setPayload(res || null)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar história clínica.")
      } finally {
        if (mounted) setCarregando(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])

  const paciente = payload?.paciente || {}
  const cardex = (payload?.cardex || []) as any[]
  const requisicoes = (payload?.requisicoes || []) as any[]
  const consultas = (payload?.consultas || []) as any[]
  const procedimentos = (payload?.procedimentos_enfermagem || []) as any[]
  const internamentos = (payload?.internamentos_enfermaria || []) as any[]
  const vendas = (payload?.vendas_farmacia || []) as any[]
  const faturas = (payload?.faturas || []) as any[]
  const recibos = (payload?.recibos || []) as any[]

  const cardexCols = useMemo(
    () => [
      { header: "Início", render: (r: any) => fmtDate(r.inicio_atendimento) },
      { header: "Fim", render: (r: any) => fmtDate(r.fim_atendimento) },
      { header: "Médico", render: (r: any) => r.medico_nome || "-" },
      { header: "Estado", render: (r: any) => r.estado || "-" },
      {
        header: "Detalhes",
        render: (r: any) => (
          <details className="text-xs text-[var(--gray-700)]">
            <summary className="cursor-pointer underline underline-offset-2 hover:text-[var(--hover-accent)]">
              Ver
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-semibold text-[var(--text)]">Sintomas:</span>{" "}
                {r.sintomas || "-"}
              </div>
              <div>
                <span className="font-semibold text-[var(--text)]">Diagnóstico:</span>{" "}
                {r.diagnostico || "-"}
              </div>
              <div>
                <span className="font-semibold text-[var(--text)]">Prescrição (texto):</span>{" "}
                {r.prescricao || "-"}
              </div>
              <div>
                <span className="font-semibold text-[var(--text)]">Itens de prescrição:</span>
                {Array.isArray(r.itens_prescricao) && r.itens_prescricao.length ? (
                  <ul className="mt-1 list-disc pl-5">
                    {r.itens_prescricao.map((it: any) => (
                      <li key={it.id}>
                        {it.medicacao_nome || it.medicacao}{" "}
                        {it.dosagem_valor ? `${it.dosagem_valor}${it.dosagem_unidade || ""}` : ""}{" "}
                        {it.numero_doses ? `(${it.numero_doses} dose(s))` : ""}{" "}
                        {it.intervalo_horas ? `a cada ${it.intervalo_horas}h` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1">-</div>
                )}
              </div>
            </div>
          </details>
        ),
      },
    ],
    []
  )

  const requisicoesCols = useMemo(
    () => [
      {
        header: "Código",
        render: (r: any) => (
          <Link
            href={`/requisicoes/${r.id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {r.id_custom || r.id || "-"}
          </Link>
        ),
      },
      { header: "Setor", render: (r: any) => (r.tipo === "MED" ? "Exames médicos" : "Laboratório") },
      { header: "Estado", render: (r: any) => r.estado || "-" },
      {
        header: "Exames",
        render: (r: any) =>
          Array.isArray(r.itens) && r.itens.length
            ? r.itens
                .map((it: any) => it.exame_nome || it.exame_medico_nome)
                .filter(Boolean)
                .join(", ")
            : "-",
      },
      { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) },
    ],
    []
  )

  const consultasCols = useMemo(
    () => [
      { header: "Código", render: (r: any) => r.id_custom || r.id || "-" },
      { header: "Tipo", render: (r: any) => r.tipo || "-" },
      { header: "Médico", render: (r: any) => r.medico_nome || "-" },
      { header: "Agendada para", render: (r: any) => fmtDate(r.agendada_para) },
      { header: "Estado", render: (r: any) => r.estado || "-" },
      { header: "Preço", render: (r: any) => <MoneyValue value={r.preco} /> },
    ],
    []
  )

  const procedimentosCols = useMemo(
    () => [
      { header: "Código", render: (r: any) => r.id_custom || r.id || "-" },
      { header: "Data", render: (r: any) => fmtDate(r.data_realizacao) },
      { header: "Profissional", render: (r: any) => r.profissional || "-" },
      { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
      { header: "Obs.", render: (r: any) => truncate(r.observacoes, 60) },
    ],
    []
  )

  const internamentosCols = useMemo(
    () => [
      { header: "Enfermaria", render: (r: any) => r.enfermaria_nome || "-" },
      { header: "Cama", render: (r: any) => r.cama_numero || "-" },
      { header: "Internamento", render: (r: any) => fmtDate(r.data_internamento) },
      { header: "Prev. alta", render: (r: any) => fmtDate(r.data_prevista_alta) },
      { header: "Próx. medicação", render: (r: any) => fmtDate(r.proxima_medicacao_em) },
      { header: "Descrição", render: (r: any) => truncate(r.proxima_medicacao_descricao, 40) },
      { header: "Ativo", render: (r: any) => (r.ativo ? "Sim" : "Não") },
    ],
    []
  )

  const faturasCols = useMemo(
    () => [
      { header: "Código", render: (r: any) => r.id_custom || r.id || "-" },
      { header: "Origem", render: (r: any) => r.origem || "-" },
      { header: "Estado", render: (r: any) => r.estado || "-" },
      { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
      { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) },
    ],
    []
  )

  const vendasCols = useMemo(
    () => [
      { header: "Número", render: (r: any) => r.numero || r.id_custom || r.id || "-" },
      { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
      { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) },
    ],
    []
  )

  const recibosCols = useMemo(
    () => [
      { header: "Número", render: (r: any) => r.numero || r.id || "-" },
      { header: "Fatura", render: (r: any) => r.fatura_codigo || r.fatura || "-" },
      { header: "Valor", render: (r: any) => <MoneyValue value={r.valor} /> },
      { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) },
    ],
    []
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="space-y-6">
        <PageHeader
          title="História clínica"
          subtitle={`${paciente?.nome || "Paciente"} · ${paciente?.id_custom || id}`}
          actions={
            <Link
              href={`/pacientes/${id}`}
              className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
            >
              Voltar ao paciente
            </Link>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {carregando ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Cardex" value={cardex.length} />
              <MetricCard label="Requisições" value={requisicoes.length} />
              <MetricCard label="Consultas" value={consultas.length} />
              <MetricCard label="Procedimentos" value={procedimentos.length} />
              <MetricCard label="Faturas" value={faturas.length} />
              <MetricCard label="Vendas (Farmácia)" value={vendas.length} />
            </div>

            <Card title="Paciente" subtitle="Dados base (vinculado por número de documento quando disponível).">
              <div className="grid gap-2 text-sm text-[var(--gray-700)] md:grid-cols-2">
                <div>
                  <span className="font-semibold text-[var(--text)]">Nome:</span> {paciente.nome || "-"}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Documento:</span>{" "}
                  {paciente.tipo_documento || "-"} {paciente.numero_id || "-"}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Gênero:</span> {paciente.genero || "-"}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Contacto:</span> {paciente.contacto || "-"}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Empresa:</span> {paciente.empresa_origem_nome || "-"}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Criado em:</span> {fmtDate(paciente.criado_em)}
                </div>
              </div>
            </Card>

            <Card title="Cardex (Prontuário)" subtitle="Registros médicos e prescrições estruturadas.">
              <DataTable columns={cardexCols as any} data={cardex} emptyMessage="Sem cardex." />
            </Card>

            <Card title="Requisições (Exames)" subtitle="Exames laboratoriais e médicos solicitados.">
              <DataTable columns={requisicoesCols as any} data={requisicoes} emptyMessage="Sem requisições." />
            </Card>

            <Card title="Consultas" subtitle="Consultas marcadas/concluídas.">
              <DataTable columns={consultasCols as any} data={consultas} emptyMessage="Sem consultas." />
            </Card>

            <Card title="Enfermagem" subtitle="Procedimentos e internamentos (enfermaria).">
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    Procedimentos
                  </div>
                  <DataTable columns={procedimentosCols as any} data={procedimentos} emptyMessage="Sem procedimentos." />
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    Internamentos
                  </div>
                  <DataTable columns={internamentosCols as any} data={internamentos} emptyMessage="Sem internamentos." />
                </div>
              </div>
            </Card>

            <Card title="Farmácia" subtitle="Vendas associadas ao paciente.">
              <DataTable columns={vendasCols as any} data={vendas} emptyMessage="Sem vendas." />
            </Card>

            <Card title="Financeiro" subtitle="Faturas e recibos associados ao paciente.">
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    Faturas
                  </div>
                  <DataTable columns={faturasCols as any} data={faturas} emptyMessage="Sem faturas." />
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    Recibos
                  </div>
                  <DataTable columns={recibosCols as any} data={recibos} emptyMessage="Sem recibos." />
                </div>
              </div>
            </Card>

            <details className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                Payload completo (debug)
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--gray-100)] p-4 text-xs text-[var(--text)]">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </AppLayout>
  )
}
