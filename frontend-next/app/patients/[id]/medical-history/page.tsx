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
import type { LucideIcon } from "lucide-react"

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

const HISTORY_LIMIT = 60
const HISTORY_TIMEOUT_MS = 12000

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

function yesNo(value: any): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  return value ? "Sim" : "Não"
}

function joinText(parts: Array<any>): string | undefined {
  const filtered = parts.map((item) => String(item ?? "").trim()).filter(Boolean)
  return filtered.length ? filtered.join(", ") : undefined
}

function genderLabel(value: any): string | undefined {
  const raw = String(value ?? "").trim()
  if (!raw) return undefined
  const normalized = raw.toLowerCase()
  if (normalized === "f" || normalized === "femenino" || normalized === "feminino") return "Feminino"
  if (normalized === "m" || normalized === "masculino") return "Masculino"
  return raw
}

function SectionCard({
  icon: Icon,
  title,
  accentClass,
  iconClass,
  children,
}: {
  icon: React.ElementType
  title: string
  accentClass: string
  iconClass: string
  children: React.ReactNode
}) {
  return (
    <section className="relative mb-2 break-inside-avoid overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-2 left-2 w-1 rounded-full ${accentClass}`} />
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 pl-5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 shadow-sm backdrop-blur-sm dark:border-white/10 ${iconClass}`}>
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-2.5 pl-5">{children}</div>
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

const CARD_STYLES: Record<string, { icon: LucideIcon; accentClass: string; iconClass: string }> = {
  "Identificação": {
    icon: User,
    accentClass: "bg-gradient-to-b from-sky-400 via-cyan-400 to-blue-500",
    iconClass: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
  },
  "Contacto e morada": {
    icon: Wallet,
    accentClass: "bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500",
    iconClass: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  "Acompanhante": {
    icon: User,
    accentClass: "bg-gradient-to-b from-fuchsia-400 via-pink-400 to-rose-500",
    iconClass: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
  },
  "Dados clínicos": {
    icon: Activity,
    accentClass: "bg-gradient-to-b from-violet-400 via-purple-400 to-indigo-500",
    iconClass: "bg-violet-500/15 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
  },
  "Auditoria": {
    icon: Receipt,
    accentClass: "bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500",
    iconClass: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  },
  Cardex: {
    icon: ClipboardList,
    accentClass: "bg-gradient-to-b from-blue-400 via-indigo-400 to-blue-600",
    iconClass: "bg-blue-500/15 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  },
  Requisições: {
    icon: FlaskConical,
    accentClass: "bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500",
    iconClass: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
  },
  Consultas: {
    icon: Stethoscope,
    accentClass: "bg-gradient-to-b from-emerald-400 via-lime-400 to-green-500",
    iconClass: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  Procedimentos: {
    icon: Activity,
    accentClass: "bg-gradient-to-b from-orange-300 via-amber-400 to-orange-500",
    iconClass: "bg-orange-500/15 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
  },
  Internamentos: {
    icon: BedDouble,
    accentClass: "bg-gradient-to-b from-rose-300 via-pink-400 to-rose-500",
    iconClass: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
  },
  "Farmácia": {
    icon: Pill,
    accentClass: "bg-gradient-to-b from-lime-300 via-green-400 to-emerald-500",
    iconClass: "bg-lime-500/15 text-lime-700 dark:bg-lime-400/10 dark:text-lime-300",
  },
  Faturas: {
    icon: FileText,
    accentClass: "bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500",
    iconClass: "bg-slate-500/15 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
  },
  Pagamentos: {
    icon: CreditCard,
    accentClass: "bg-gradient-to-b from-teal-300 via-cyan-400 to-sky-500",
    iconClass: "bg-teal-500/15 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300",
  },
  Recibos: {
    icon: Receipt,
    accentClass: "bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500",
    iconClass: "bg-yellow-500/15 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-300",
  },
}

function themedCardProps(title: string) {
  const entry = Object.entries(CARD_STYLES).find(([key]) => title.startsWith(key))?.[1]
  return entry ?? {
    icon: User,
    accentClass: "bg-gradient-to-b from-sky-400 via-blue-400 to-indigo-500",
    iconClass: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300",
  }
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
          `/patients/${id}/clinical-history/?limit=${HISTORY_LIMIT}`,
          {
            clientCache: safeRefreshToken === 0,
            timeoutMs: HISTORY_TIMEOUT_MS,
            retryOnTimeout: 0,
          }
        )
        if (!mounted) return
        setPayload(res || null)
      } catch (e: any) {
        if (!mounted) return
        setErro(
          isNotFoundLikeError(e)
            ? "História clínica indisponível para este paciente no momento."
            : (e?.message || "Falha ao carregar história clínica.")
        )
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
  const patientName = paciente.nome || paciente.name
  const patientDocument = joinText([
    paciente.tipo_documento || paciente.document_type,
    paciente.numero_id || paciente.document_number,
  ])
  const patientAddress = joinText([
    paciente.endereco_rua || paciente.address_street,
    paciente.endereco_numero || paciente.address_number,
    paciente.endereco_bairro || paciente.address_neighborhood,
    paciente.endereco_cidade || paciente.address_city,
    paciente.endereco_provincia || paciente.address_province,
    paciente.endereco_codigo_postal || paciente.address_postal_code,
    paciente.endereco_pais || paciente.address_country,
  ]) || paciente.morada || paciente.address
  const patientCompanion = joinText([
    paciente.nome_acompanhante || paciente.companion_name,
    paciente.parentesco_acompanhante || paciente.companion_relationship,
  ])

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
        ) : !payload ? (
          <div className="rounded-xl border border-white/20 bg-white/25 px-4 py-5 text-sm text-muted-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            Nenhum histórico clínico pôde ser carregado para este paciente.
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

            <div className="columns-1 gap-2 sm:columns-2 xl:columns-3">
              <SectionCard title="Identificação" {...themedCardProps("Identificação")}>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Nome" value={patientName} />
                  <InfoRow label="Código" value={paciente.id_custom || paciente.custom_id} />
                  <InfoRow label="Documento" value={patientDocument} />
                  <InfoRow label="Género" value={genderLabel(paciente.genero || paciente.gender)} />
                  <InfoRow label="Idade" value={paciente.age_display} />
                  <InfoRow label="Data nasc." value={fmtDate(paciente.data_nascimento || paciente.birth_date)} />
                  <InfoRow label="Raça / origem" value={paciente.raca_origem || paciente.race_origin} />
                </div>
              </SectionCard>

              <SectionCard title="Contacto e morada" {...themedCardProps("Contacto e morada")}>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Contacto" value={paciente.contacto || paciente.contact} />
                  <InfoRow label="E-mail" value={paciente.email} />
                  <InfoRow label="Morada" value={patientAddress} />
                  <InfoRow label="Complemento" value={paciente.endereco_complemento || paciente.address_complement} />
                  <InfoRow label="Proveniência" value={paciente.proveniencia || paciente.provenance} />
                  <InfoRow label="Empresa" value={paciente.empresa_origem_nome || paciente.origin_company_name} />
                </div>
              </SectionCard>

              <SectionCard title="Acompanhante" {...themedCardProps("Acompanhante")}>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Acompanhante" value={patientCompanion} />
                  <InfoRow label="Contacto acomp." value={paciente.telefone_acompanhante || paciente.contacto_acompanhante || paciente.companion_contact} />
                  <InfoRow label="E-mail acomp." value={paciente.email_acompanhante || paciente.companion_email} />
                </div>
              </SectionCard>

              <SectionCard title="Dados clínicos" {...themedCardProps("Dados clínicos")}>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Tipo sanguíneo" value={paciente.blood_type} />
                  <InfoRow label="Gestante" value={yesNo(paciente.gestante ?? paciente.pregnant)} />
                  <InfoRow label="Idade gestacional" value={(paciente.idade_gestacional || paciente.gestational_age_weeks) ? `${paciente.idade_gestacional || paciente.gestational_age_weeks} semana(s)` : undefined} />
                  <InfoRow label="Doador de órgãos" value={yesNo(paciente.is_organ_donor)} />
                  <InfoRow label="Repositor inapto" value={yesNo(paciente.is_replacement_donor_inapt)} />
                  <InfoRow label="Motivo da inaptidão" value={paciente.replacement_donor_inapt_reason} />
                  <InfoRow label="Inapto em" value={fmtDate(paciente.replacement_donor_inapt_at)} />
                </div>
              </SectionCard>

              <SectionCard title="Auditoria" {...themedCardProps("Auditoria")}>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Criado em" value={fmtDate(paciente.criado_em || paciente.created_at)} />
                  <InfoRow label="Atualizado em" value={fmtDate(paciente.updated_at)} />
                </div>
              </SectionCard>

              {cardex.length > 0 ? (
                <SectionCard title={`Cardex (${cardex.length})`} {...themedCardProps("Cardex")}>
                  <DataTable bare columns={cardexCols as any} data={cardex} emptyMessage="" />
                </SectionCard>
              ) : null}

              {requisicoes.length > 0 ? (
                <SectionCard title={`Requisições (${requisicoes.length})`} {...themedCardProps("Requisições")}>
                  <DataTable bare columns={requisicoesCols as any} data={requisicoes} emptyMessage="" />
                </SectionCard>
              ) : null}

              {consultas.length > 0 ? (
                <SectionCard title={`Consultas (${consultas.length})`} {...themedCardProps("Consultas")}>
                  <DataTable bare columns={consultasCols as any} data={consultas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {procedimentos.length > 0 ? (
                <SectionCard title={`Procedimentos (${procedimentos.length})`} {...themedCardProps("Procedimentos")}>
                  <DataTable bare columns={procedimentosCols as any} data={procedimentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {internamentos.length > 0 ? (
                <SectionCard title={`Internamentos (${internamentos.length})`} {...themedCardProps("Internamentos")}>
                  <DataTable bare columns={internamentosCols as any} data={internamentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {vendas.length > 0 ? (
                <SectionCard title={`Farmácia (${vendas.length})`} {...themedCardProps("Farmácia")}>
                  <DataTable bare columns={vendasCols as any} data={vendas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {faturas.length > 0 ? (
                <SectionCard title={`Faturas (${faturas.length})`} {...themedCardProps("Faturas")}>
                  <DataTable bare columns={faturasCols as any} data={faturas} emptyMessage="" />
                </SectionCard>
              ) : null}

              {pagamentos.length > 0 ? (
                <SectionCard title={`Pagamentos (${pagamentos.length})`} {...themedCardProps("Pagamentos")}>
                  <DataTable bare columns={pagamentosCols as any} data={pagamentos} emptyMessage="" />
                </SectionCard>
              ) : null}

              {recibos.length > 0 ? (
                <SectionCard title={`Recibos (${recibos.length})`} {...themedCardProps("Recibos")}>
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
