"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function fmtMoney(value: any): string {
  if (value === null || value === undefined || value === "") return "-"
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" })
}

const INVOICE_BADGE: Record<string, string> = {
  RASC: "border-slate-200 bg-slate-50 text-slate-700",
  EMIT: "border-sky-200 bg-sky-50 text-sky-700",
  PAGA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANC: "border-rose-200 bg-rose-50 text-rose-700",
}

/** Atendimento ativo (não cancelado) sem fatura vinculada = risco de receita não faturada. */
function isUnbilled(r: Row): boolean {
  return !r.invoice && r.status !== "CANC"
}

export default function ContabilidadeRecepcaoAuditPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkins, setCheckins] = useState<Row[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const cRes = await apiFetch<any>("/reception/checkin/?ordering=-arrived_at", {
          clientCache: safeRefreshToken === 0,
        })

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setCheckins(Array.isArray(list(cRes)) ? list(cRes).slice(0, 200) : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar dados da recepção."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  const metrics = useMemo(() => {
    const total = checkins.length
    const comFatura = checkins.filter((r) => !!r.invoice).length
    const semFatura = checkins.filter(isUnbilled).length
    const pagas = checkins.filter((r) => r.invoice_status === "PAGA").length
    return { total, comFatura, semFatura, pagas }
  }, [checkins])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: Row) => r.invoice_code || r.id_custom || r.id || "-" },
      {
        header: "Paciente",
        render: (r: Row) => (
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">{r.patient_name || r.paciente || "-"}</div>
            {r.patient_code ? (
              <div className="text-[11px] text-muted-foreground">{r.patient_code}</div>
            ) : null}
          </div>
        ),
      },
      { header: "Estado", render: (r: Row) => r.status_display || r.estado || "-" },
      { header: "Requisição", render: (r: Row) => r.request_code || "—" },
      {
        header: "Fatura",
        render: (r: Row) => {
          if (!r.invoice) {
            return isUnbilled(r) ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                <AlertTriangle size={12} />
                Sem fatura
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          const badge = INVOICE_BADGE[r.invoice_status] || INVOICE_BADGE.RASC
          return (
            <div className="space-y-0.5">
              <div className="font-medium text-foreground">{r.invoice_code || r.invoice}</div>
              <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${badge}`}>
                {r.invoice_status_display || r.invoice_status}
              </span>
            </div>
          )
        },
      },
      {
        header: "Valor",
        className: "text-right tabular-nums",
        render: (r: Row) => fmtMoney(r.invoice_total),
      },
      {
        header: "Doente paga",
        className: "text-right tabular-nums",
        render: (r: Row) => fmtMoney(r.invoice_patient_amount),
      },
      { header: "Atendente", render: (r: Row) => r.attendant_name || "—" },
      { header: "Chegada", render: (r: Row) => fmtDate(r.arrived_at || r.criado_em) },
    ],
    []
  )

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-4">
        <PageHeader
          title="Recepção (auditoria financeira)"
          subtitle="Somente leitura: check-ins ligados à requisição, fatura e cobrança."
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Check-ins" value={loading ? "..." : metrics.total} accentClass="border-l-slate-500" />
          <MetricCard label="Com fatura" value={loading ? "..." : metrics.comFatura} accentClass="border-l-sky-500" />
          <MetricCard
            label="Sem fatura"
            value={loading ? "..." : metrics.semFatura}
            hint="Atendimentos ativos sem cobrança"
            accentClass="border-l-amber-500"
          />
          <MetricCard label="Faturas pagas" value={loading ? "..." : metrics.pagas} accentClass="border-l-emerald-500" />
        </div>

        <Card
          title="Check-ins e cobrança"
          subtitle="Cada atendimento ligado à sua fatura e estado de pagamento."
        >
          {loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : (
            <DataTable<Row>
              columns={columns as any}
              data={checkins}
              searchKeys={["invoice_code", "patient_name", "patient_code", "request_code", "status_display"]}
              emptyMessage="Nenhum check-in encontrado."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
