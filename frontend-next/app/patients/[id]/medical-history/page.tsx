"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import {
  Activity,
  ArrowLeft,
  BedDouble,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  Stethoscope,
  User,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

type ClinicalHistoryPayload = {
  patient?: any
  referencia?: any
  cardex?: any[]
  requisicoes?: any[]
  consultations?: any[]
  procedures_enfermagem?: any[]
  internamentos_ward?: any[]
  vendas_farmacia?: any[]
  faturas?: any[]
  pagamentos?: any[]
  recibos?: any[]
}

function fmtDate(value: any): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("pt-PT")
}

function truncate(value: any, max = 80): string {
  const v = String(value ?? "").trim()
  if (!v || v === "-") return ""
  if (v.length <= max) return v
  return `${v.slice(0, Math.max(0, max - 3))}...`
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "-" || value === "—") return null
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function MedicalHistoryPage() {
  const routeParams = useParams()
  const id = routeParamToString((routeParams as any)?.id)
  const { loading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [payload, setPayload] = useState<ClinicalHistoryPayload | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [exportandoPdf, setExportandoPdf] = useState<null | "medical" | "invoices" | "payments">(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setCarregando(true)
        setErro(null)
        const res = await apiFetch<ClinicalHistoryPayload>(
          `/patients/${id}/clinical-history/?limit=200`,
          { clientCache: safeRefreshToken === 0 }
        )
        if (!mounted) return
        setPayload(res || null)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar história clínica."))
      } finally {
        if (mounted) setCarregando(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, safeRefreshToken])

  async function downloadHistoryPdf(
    type: "medical" | "invoices" | "payments",
    endpoint: string,
    filenamePrefix: string
  ) {
    if (!id) return
    try {
      setExportandoPdf(type)
      const blob = await apiFetch<Blob>(endpoint, { responseType: "blob" })
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = `${filenamePrefix}_${paciente?.id_custom || id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao exportar PDF do histórico."))
    } finally {
      setExportandoPdf(null)
    }
  }

  const paciente = (payload as any)?.patient || (payload as any)?.paciente || {}
  const cardex = ((payload as any)?.cardex || []) as any[]
  const requisicoes = ((payload as any)?.requisicoes || []) as any[]
  const consultas = (((payload as any)?.consultations || (payload as any)?.consultas) || []) as any[]
  const procedimentos = (((payload as any)?.procedures_enfermagem || (payload as any)?.procedimentos_enfermagem) || []) as any[]
  const internamentos = (((payload as any)?.internamentos_ward || (payload as any)?.internamentos_enfermaria) || []) as any[]
  const vendas = ((payload as any)?.vendas_farmacia || []) as any[]
  const faturas = ((payload as any)?.faturas || []) as any[]
  const pagamentos = ((payload as any)?.pagamentos || []) as any[]
  const recibos = ((payload as any)?.recibos || []) as any[]

  const cardexCols = useMemo(() => [
    { header: "Início", render: (r: any) => fmtDate(r.inicio_atendimento) || "—" },
    { header: "Fim", render: (r: any) => fmtDate(r.fim_atendimento) || "—" },
    { header: "Médico", render: (r: any) => r.medico_nome || "—" },
    { header: "Estado", render: (r: any) => r.estado || "—" },
    {
      header: "Detalhes",
      render: (r: any) => (
        <details className="text-xs text-[var(--gray-700)]">
          <summary className="cursor-pointer hover:text-[var(--hover-accent)] hover:underline underline-offset-2">Ver</summary>
          <div className="mt-2 space-y-2">
            {r.sintomas ? <div><span className="font-semibold text-[var(--text)]">Sintomas:</span> {r.sintomas}</div> : null}
            {r.diagnostico ? <div><span className="font-semibold text-[var(--text)]">Diagnóstico:</span> {r.diagnostico}</div> : null}
            {r.prescricao ? <div><span className="font-semibold text-[var(--text)]">Prescrição:</span> {r.prescricao}</div> : null}
            {Array.isArray(r.itens_prescricao) && r.itens_prescricao.length ? (
              <div>
                <span className="font-semibold text-[var(--text)]">Itens:</span>
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
              </div>
            ) : null}
          </div>
        </details>
      ),
    },
  ], [])

  const requisicoesCols = useMemo(() => [
    {
      header: "Código",
      render: (r: any) => (
        <Link href={`/requests/${r.id}`} className="font-medium text-[var(--text)] underline-offset-2 hover:underline">
          {r.id_custom || r.id || "—"}
        </Link>
      ),
    },
    { header: "Setor", render: (r: any) => (r.tipo === "MED" ? "Exames médicos" : "Laboratório") },
    { header: "Estado", render: (r: any) => r.estado || "—" },
    {
      header: "Exames",
      render: (r: any) =>
        Array.isArray(r.itens) && r.itens.length
          ? r.itens.map((it: any) => it.exame_nome || it.exame_medico_nome).filter(Boolean).join(", ")
          : "—",
    },
    { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) || "—" },
  ], [])

  const consultasCols = useMemo(() => [
    { header: "Código", render: (r: any) => r.id_custom || r.id || "—" },
    { header: "Tipo", render: (r: any) => r.tipo || "—" },
    { header: "Médico", render: (r: any) => r.medico_nome || "—" },
    { header: "Agendada para", render: (r: any) => fmtDate(r.agendada_para) || "—" },
    { header: "Estado", render: (r: any) => r.estado || "—" },
    { header: "Preço", render: (r: any) => <MoneyValue value={r.preco} /> },
  ], [])

  const procedimentosCols = useMemo(() => [
    { header: "Código", render: (r: any) => r.id_custom || r.id || "—" },
    { header: "Data", render: (r: any) => fmtDate(r.data_realizacao) || "—" },
    { header: "Profissional", render: (r: any) => r.profissional || "—" },
    { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
    { header: "Obs.", render: (r: any) => truncate(r.observacoes, 60) || "—" },
  ], [])

  const internamentosCols = useMemo(() => [
    { header: "Enfermaria", render: (r: any) => r.enfermaria_nome || "—" },
    { header: "Cama", render: (r: any) => r.cama_numero || "—" },
    { header: "Internamento", render: (r: any) => fmtDate(r.data_internamento) || "—" },
    { header: "Prev. alta", render: (r: any) => fmtDate(r.data_prevista_alta) || "—" },
    { header: "Ativo", render: (r: any) => (r.ativo ? "Sim" : "Não") },
  ], [])

  const faturasCols = useMemo(() => [
    { header: "Código", render: (r: any) => r.id_custom || r.id || "—" },
    { header: "Origem", render: (r: any) => r.origem || "—" },
    { header: "Estado", render: (r: any) => r.estado || "—" },
    { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
    { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) || "—" },
  ], [])

  const vendasCols = useMemo(() => [
    { header: "Número", render: (r: any) => r.numero || r.id_custom || r.id || "—" },
    { header: "Total", render: (r: any) => <MoneyValue value={r.total} /> },
    { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) || "—" },
  ], [])

  const recibosCols = useMemo(() => [
    { header: "Número", render: (r: any) => r.numero || r.id || "—" },
    { header: "Fatura", render: (r: any) => r.fatura_codigo || r.fatura || "—" },
    { header: "Valor", render: (r: any) => <MoneyValue value={r.valor} /> },
    { header: "Criado em", render: (r: any) => fmtDate(r.criado_em) || "—" },
  ], [])

  const pagamentosCols = useMemo(() => [
    { header: "Método", render: (r: any) => r.method || r.metodo || "—" },
    { header: "Valor", render: (r: any) => <MoneyValue value={r.value ?? r.valor} /> },
    { header: "Estado", render: (r: any) => r.status || r.estado || "—" },
    { header: "Pago em", render: (r: any) => fmtDate(r.paid_at || r.pago_em) || "—" },
  ], [])

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="space-y-4">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">História clínica</h1>
              <p className="text-[11px] text-muted-foreground">
                {paciente?.nome || "Paciente"} · {paciente?.id_custom || id}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadHistoryPdf("invoices", `/patients/${id}/invoice-history/pdf/?limit=200`, "invoice_history")}
                disabled={exportandoPdf !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted disabled:opacity-60"
              >
                <PdfActionLabel loading={exportandoPdf === "invoices"} loadingLabel="Gerando...">
                  PDF faturas
                </PdfActionLabel>
              </button>
              <button
                type="button"
                onClick={() => downloadHistoryPdf("payments", `/patients/${id}/payment-history/pdf/?limit=200`, "payment_history")}
                disabled={exportandoPdf !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted disabled:opacity-60"
              >
                <PdfActionLabel loading={exportandoPdf === "payments"} loadingLabel="Gerando...">
                  PDF pagamentos
                </PdfActionLabel>
              </button>
              <button
                type="button"
                onClick={() => downloadHistoryPdf("medical", `/patients/${id}/clinical-history/pdf/?limit=200`, "clinical_history")}
                disabled={exportandoPdf !== null}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted disabled:opacity-60"
              >
                <PdfActionLabel loading={exportandoPdf === "medical"} loadingLabel="Gerando...">
                  PDF clínico
                </PdfActionLabel>
              </button>
              <Link
                href={`/patients/${id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
              >
                <ArrowLeft size={14} />
                Voltar
              </Link>
            </div>
          </div>
        </div>

        {erro ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {erro}
          </div>
        ) : null}

        {carregando ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
            ))}
          </div>
        ) : (
          <>
            {/* Métricas — só as não-zero */}
            {[
              { label: "Cardex", value: cardex.length },
              { label: "Requisições", value: requisicoes.length },
              { label: "Consultas", value: consultas.length },
              { label: "Procedimentos", value: procedimentos.length },
              { label: "Internamentos", value: internamentos.length },
              { label: "Faturas", value: faturas.length },
              { label: "Pagamentos", value: pagamentos.length },
              { label: "Recibos", value: recibos.length },
              { label: "Vendas (Farmácia)", value: vendas.length },
            ].filter(m => m.value > 0).length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                {[
                  { label: "Cardex", value: cardex.length },
                  { label: "Requisições", value: requisicoes.length },
                  { label: "Consultas", value: consultas.length },
                  { label: "Procedimentos", value: procedimentos.length },
                  { label: "Internamentos", value: internamentos.length },
                  { label: "Faturas", value: faturas.length },
                  { label: "Pagamentos", value: pagamentos.length },
                  { label: "Recibos", value: recibos.length },
                  { label: "Vendas (Farmácia)", value: vendas.length },
                ].filter(m => m.value > 0).map(m => (
                  <MetricCard key={m.label} label={m.label} value={m.value} />
                ))}
              </div>
            ) : null}

            <div className="grid items-start gap-3 lg:grid-cols-2">
              {/* Paciente */}
              <SectionCard icon={User} title="Paciente">
                <div className="divide-y divide-border/40">
                  <InfoRow label="Nome" value={paciente.nome} />
                  <InfoRow label="Documento" value={[paciente.tipo_documento, paciente.numero_id].filter(Boolean).join(" ") || undefined} />
                  <InfoRow label="Género" value={paciente.genero} />
                  <InfoRow label="Idade" value={paciente.age_display} />
                  <InfoRow label="Contacto" value={paciente.contacto} />
                  <InfoRow label="Empresa" value={paciente.empresa_origem_nome} />
                  <InfoRow label="Criado em" value={fmtDate(paciente.criado_em)} />
                </div>
              </SectionCard>

              {cardex.length > 0 ? (
                <SectionCard icon={ClipboardList} title={`Cardex (${cardex.length})`}>
                  <DataTable bare columns={cardexCols as any} data={cardex} emptyMessage="" />
                </SectionCard>
              ) : null}

              {requisicoes.length > 0 ? (
                <SectionCard icon={FlaskConical} title={`Requisições (${requisicoes.length})`}>
                  <DataTable bare columns={requisicoesCols as any} data={requisicoes} emptyMessage="" />
                </SectionCard>
              ) : null}

              {consultas.length > 0 ? (
                <SectionCard icon={Stethoscope} title={`Consultas (${consultas.length})`}>
                  <DataTable bare columns={consultasCols as any} data={consultas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {procedimentos.length > 0 ? (
                <SectionCard icon={Activity} title={`Procedimentos (${procedimentos.length})`}>
                  <DataTable bare columns={procedimentosCols as any} data={procedimentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {internamentos.length > 0 ? (
                <SectionCard icon={BedDouble} title={`Internamentos (${internamentos.length})`}>
                  <DataTable bare columns={internamentosCols as any} data={internamentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {vendas.length > 0 ? (
                <SectionCard icon={Pill} title={`Farmácia (${vendas.length})`}>
                  <DataTable bare columns={vendasCols as any} data={vendas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {faturas.length > 0 ? (
                <SectionCard icon={FileText} title={`Faturas (${faturas.length})`}>
                  <DataTable bare columns={faturasCols as any} data={faturas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {pagamentos.length > 0 ? (
                <SectionCard icon={CreditCard} title={`Pagamentos (${pagamentos.length})`}>
                  <DataTable bare columns={pagamentosCols as any} data={pagamentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {recibos.length > 0 ? (
                <SectionCard icon={Receipt} title={`Recibos (${recibos.length})`}>
                  <DataTable bare columns={recibosCols as any} data={recibos} emptyMessage="" />
                </SectionCard>
              ) : null}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
