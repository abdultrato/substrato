"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { ArrowLeft, Bell, CheckCircle2, FileText, Receipt } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import MoneyValue from "@/components/ui/MoneyValue"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

type FaturaRow = Record<string, any>
type FaturaItem = {
  id: number
  descricao?: string
  tipo_item?: string
  quantidade?: string | number
  preco_unitario?: string | number
  aplica_iva?: boolean
  iva_percentual?: string | number
  iva_valor?: string | number
  total_sem_iva?: string | number
  total_com_iva?: string | number
}

const ITEM_TYPE_ORDER = ["EXM", "EXA", "AJU", "PRC", "MAT", "FAR"] as const

const ITEM_TYPE_LABELS: Record<string, string> = {
  EXM: "Exames médicos",
  EXA: "Exames",
  AJU: "Consultas e ajustes",
  PRC: "Procedimentos",
  MAT: "Materiais",
  FAR: "Medicação",
}

const INVOICE_STATUS: Record<string, { label: string; badge: string; accent: string }> = {
  RASC: { label: "Rascunho", badge: "border-slate-200 bg-slate-50 text-slate-600", accent: "bg-amber-500" },
  EMIT: { label: "Emitida", badge: "border-sky-200 bg-sky-50 text-sky-700", accent: "bg-sky-500" },
  PAGA: { label: "Paga", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", accent: "bg-emerald-500" },
  CANC: { label: "Cancelada", badge: "border-rose-200 bg-rose-50 text-rose-700", accent: "bg-rose-500" },
}

const ORIGIN_LABELS: Record<string, string> = {
  MIX: "Misto",
  CLI: "Clínica",
  CON: "Consulta",
  FAR: "Farmácia",
  ENF: "Enfermagem",
  CIR: "Cirurgia",
}

function EstadoBadge({ estado }: { estado?: string }) {
  const meta = INVOICE_STATUS[String(estado || "").toUpperCase()]
  if (!meta) return <span className="text-xs text-muted-foreground">{estado || "-"}</span>
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
}

function MetaValue({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <div className={muted ? "text-muted-foreground" : "font-medium text-foreground"}>{children}</div>
}

function PlaceholderPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-dashed border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
      {label}
    </span>
  )
}

function renderMoneyOrPlaceholder(value: unknown, missingLabel = "Sem valor") {
  if (value === null || value === undefined || value === "") {
    return <PlaceholderPill label={missingLabel} />
  }
  return <MoneyValue value={value as number | string} />
}

function renderTextOrPlaceholder(value: unknown, missingLabel = "Não informado") {
  if (value === null || value === undefined || value === "") {
    return <PlaceholderPill label={missingLabel} />
  }
  return String(value)
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const id = routeParamToString((params as any)?.id)
  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [notificacaoId, setNotificacaoId] = useState<number | null>(null)
  const [temPagamentoPendente, setTemPagamentoPendente] = useState(false)
  const [fatura, setFatura] = useState<FaturaRow | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])

  const carregar = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setErro(null)

      const [faturaRes, itensRes, pagamentosRes] = await Promise.all([
        apiFetch<FaturaRow>(`/invoices/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/billing/invoiceitem/?fatura=${id}`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<any>(`/payments/payment/?fatura=${id}&status=PEN`, { clientCache: safeRefreshToken === 0 }),
      ])

      const itensLista = itensRes?.results ?? itensRes
      const pagamentosLista = pagamentosRes?.results ?? pagamentosRes

      setFatura(faturaRes)
      setItens(Array.isArray(itensLista) ? itensLista : [])
      setTemPagamentoPendente(Array.isArray(pagamentosLista) ? pagamentosLista.length > 0 : false)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? "Fatura não encontrada." : (e?.message || "Falha ao carregar a fatura."))
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    carregar()
  }, [carregar])

  const groupedItens = useMemo(() => {
    const normalize = (item: FaturaItem) => (item.tipo_item ?? "").toString().toUpperCase()
    const groups: { key: string; label: string; items: FaturaItem[] }[] = []

    ITEM_TYPE_ORDER.forEach((type) => {
      const itensDoTipo = itens.filter((item) => normalize(item) === type)
      if (itensDoTipo.length) {
        groups.push({ key: type, label: ITEM_TYPE_LABELS[type] || type, items: itensDoTipo })
      }
    })

    const restantes = itens.filter((item) => !ITEM_TYPE_ORDER.includes(normalize(item) as typeof ITEM_TYPE_ORDER[number]))
    if (restantes.length) {
      groups.push({ key: "OUTROS", label: "Outros itens", items: restantes })
    }

    return groups
  }, [itens])

  const ivaPercentual = useMemo(() => {
    if (!fatura) return "0.00"
    const subtotal = Number(fatura.subtotal ?? 0)
    const iva = Number(fatura.iva_valor ?? 0)
    if (!subtotal) return "0.00"
    const percentual = (iva / subtotal) * 100
    return Number.isFinite(percentual) ? percentual.toFixed(2) : "0.00"
  }, [fatura])

  const origemLabel = useMemo(() => {
    const origin = String(fatura?.origem || fatura?.origin || "").toUpperCase().trim()
    if (!origin) return null
    return ORIGIN_LABELS[origin] || origin
  }, [fatura])

  const downloadPdf = useCallback(async () => {
    if (!id) return
    try {
      setAcaoId(Number(id))
      const blob = await apiFetch<Blob>(`/invoices/${id}/pdf/`, { method: "GET", responseType: "blob" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fatura_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF."))
    } finally {
      setAcaoId(null)
    }
  }, [id])

  const confirmPayment = useCallback(async () => {
    if (!id || !podeAlterar) return
    try {
      setErro(null)
      setFeedback(null)
      setAcaoId(Number(id))
      await apiFetch(`/invoices/${id}/confirm-payment/`, { method: "POST" })
      setFeedback("Pagamento confirmado.")
      await carregar()
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao confirmar pagamento."))
    } finally {
      setAcaoId(null)
    }
  }, [carregar, id, podeAlterar])

  const sendInvoiceNotification = useCallback(async () => {
    if (!id) return
    try {
      setErro(null)
      setFeedback(null)
      setNotificacaoId(Number(id))
      await apiFetch(`/invoices/${id}/send-notification/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setFeedback("Notificação de fatura processada para email e WhatsApp disponíveis.")
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao enviar notificação da fatura."))
    } finally {
      setNotificacaoId(null)
    }
  }, [id])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
        <div className="text-sm text-muted-foreground">Carregando fatura...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/invoices/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/20"
          >
            <ArrowLeft size={15} /> Voltar às faturas
          </Link>
          <div className="flex flex-wrap gap-2">
            {fatura?.estado === "RASC" ? (
              <Link
                href={`/invoices/draft/${fatura.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Receipt size={15} /> Abrir rascunho
              </Link>
            ) : null}
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
              disabled={acaoId === Number(id)}
            >
              <FileText size={15} />
              <PdfActionLabel loading={acaoId === Number(id)} loadingLabel="PDF...">PDF</PdfActionLabel>
            </button>
            {fatura?.estado === "PAGA" ? (
              <button
                type="button"
                onClick={sendInvoiceNotification}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                disabled={notificacaoId === Number(id)}
              >
                <Bell size={15} />
                {notificacaoId === Number(id) ? "Notificando..." : "Notificar"}
              </button>
            ) : null}
            {temPagamentoPendente && fatura?.estado !== "PAGA" && podeAlterar ? (
              <ConfirmDialog
                title="Confirmar pagamento"
                message="Confirme apenas se o pagamento desta fatura já foi validado."
                confirmText="Confirmar"
                onConfirm={confirmPayment}
                disabled={acaoId === Number(id)}
              >
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  disabled={acaoId === Number(id)}
                >
                  <CheckCircle2 size={15} /> Confirmar pagamento
                </button>
              </ConfirmDialog>
            ) : null}
          </div>
        </div>

        {erro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
        ) : null}
        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div>
        ) : null}

        {fatura ? (
          <>
            <Card
              glass
              title={`Detalhes da fatura ${fatura.id_custom || fatura.id}`}
              subtitle="Revisão e confirmação de pagamento"
              actions={<EstadoBadge estado={fatura.estado} />}
            >
              <div className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Paciente</div>
                  <MetaValue muted={!fatura.paciente}>{renderTextOrPlaceholder(fatura.paciente, "Sem paciente")}</MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Origem</div>
                  <MetaValue muted={!origemLabel}>{renderTextOrPlaceholder(origemLabel, "Sem origem")}</MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Subtotal (sem IVA)</div>
                  <MetaValue muted={fatura.subtotal === null || fatura.subtotal === undefined || fatura.subtotal === ""}>
                    {renderMoneyOrPlaceholder(fatura.subtotal, "Não calculado")}
                  </MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">IVA (%)</div>
                  <MetaValue>{ivaPercentual}%</MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Valor do IVA</div>
                  <MetaValue muted={fatura.iva_valor === null || fatura.iva_valor === undefined || fatura.iva_valor === ""}>
                    {renderMoneyOrPlaceholder(fatura.iva_valor, "Não calculado")}
                  </MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Total a pagar</div>
                  <MetaValue muted={(fatura.total_a_pagar ?? fatura.total) === null || (fatura.total_a_pagar ?? fatura.total) === undefined || (fatura.total_a_pagar ?? fatura.total) === ""}>
                    {renderMoneyOrPlaceholder(fatura.total_a_pagar ?? fatura.total, "Não calculado")}
                  </MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Valor paciente</div>
                  <MetaValue muted={fatura.valor_paciente === null || fatura.valor_paciente === undefined || fatura.valor_paciente === ""}>
                    {renderMoneyOrPlaceholder(fatura.valor_paciente, "Não calculado")}
                  </MetaValue>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Valor seguro</div>
                  <MetaValue muted={fatura.valor_seguro === null || fatura.valor_seguro === undefined || fatura.valor_seguro === ""}>
                    {renderMoneyOrPlaceholder(fatura.valor_seguro, "Sem cobertura")}
                  </MetaValue>
                </div>
              </div>
            </Card>

            <Card glass title="Itens da fatura" subtitle="Itens, IVA e totais por linha.">
              {groupedItens.length ? (
                <div className="space-y-6">
                  {groupedItens.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</div>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground">
                            <tr>
                              <th className="px-2 py-1">Descrição</th>
                              <th className="px-2 py-1 text-right">Qtd</th>
                              <th className="px-2 py-1 text-right">Preço</th>
                              <th className="px-2 py-1 text-right">Subtotal</th>
                              <th className="px-2 py-1 text-right">IVA (%)</th>
                              <th className="px-2 py-1 text-right">Valor IVA</th>
                              <th className="px-2 py-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-foreground">
                            {group.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-2 py-1 font-semibold">{item.descricao || `Item ${item.id}`}</td>
                                <td className="px-2 py-1 text-right">{item.quantidade ?? "-"}</td>
                                <td className="px-2 py-1 text-right">
                                  {item.preco_unitario === null || item.preco_unitario === undefined || item.preco_unitario === "" ? <PlaceholderPill label="N/C" /> : <MoneyValue value={item.preco_unitario} />}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {item.total_sem_iva === null || item.total_sem_iva === undefined || item.total_sem_iva === "" ? <PlaceholderPill label="N/C" /> : <MoneyValue value={item.total_sem_iva} />}
                                </td>
                                <td className="px-2 py-1 text-right">{item.iva_percentual ?? "-"}%</td>
                                <td className="px-2 py-1 text-right">
                                  {item.iva_valor === null || item.iva_valor === undefined || item.iva_valor === "" ? <PlaceholderPill label="N/C" /> : <MoneyValue value={item.iva_valor} />}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {item.total_com_iva === null || item.total_com_iva === undefined || item.total_com_iva === "" ? <PlaceholderPill label="N/C" /> : <MoneyValue value={item.total_com_iva} />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-sm text-muted-foreground">Nenhum item adicionado nesta fatura.</div>
              )}
            </Card>

            {!temPagamentoPendente ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Nenhum pagamento pendente encontrado para esta fatura.
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
