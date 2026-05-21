"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Lightbulb,
  Lock,
  PackageSearch,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Table2,
  TerminalSquare,
  TrendingUp,
  UserPlus,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AiActionPanel, { type AiSuggestedAction } from "@/components/ai/AiActionPanel"
import AiEvidencePanel, { type AiSource } from "@/components/ai/AiEvidencePanel"
import AiInvestigationPanel, { type AiInvestigation } from "@/components/ai/AiInvestigationPanel"
import AiToolTrace, { type AiToolCall } from "@/components/ai/AiToolTrace"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import TextAreaInput from "@/components/ui/TextAreaInput"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"

type AiChatResponse = {
  session_id: number
  message_id: number
  answer: string
  language: "pt" | "en"
  provider?: string
  sources?: AiSource[]
  tool_calls?: AiToolCall[]
  suggested_actions?: AiSuggestedAction[]
  investigation?: AiInvestigation | null
  conversation?: AiConversationState
  schema?: AiResponseSchema
}

type AiMetric = {
  label?: string
  label_pt?: string
  label_en?: string
  value?: string | number | boolean | null
}

type AiAnalyticsGroup = {
  field?: string
  label?: string
  rows?: Array<{ value?: string | number | null; count?: number }>
}

type AiAnalyticsSchema = {
  query_kind?: string
  title?: string
  resource_label?: string
  range?: { start_date?: string; end_date?: string } | null
  period_bucket?: string
  total_count?: number
  comparison?: {
    previous_start_date?: string
    previous_end_date?: string
    previous_count?: number
    current_count?: number
    absolute_delta?: number
    percent_delta?: number | null
  } | null
  groups?: AiAnalyticsGroup[]
  period_rows?: Array<{ period?: string; day?: string; count?: number }>
  numeric_summaries?: Array<{
    field?: string
    label?: string
    total?: string | number | null
    average?: string | number | null
    minimum?: string | number | null
    maximum?: string | number | null
  }>
  sample_rows?: Array<Record<string, string | number | boolean | null>>
  insights?: Array<{
    label?: string
    label_pt?: string
    label_en?: string
    severity?: "info" | "success" | "warning" | "danger"
  }>
  next_questions?: Array<{
    label?: string
    label_pt?: string
    label_en?: string
  }>
}

type AiKnowledgeBaseSchema = {
  status?: "answered" | "needs_confirmation" | string
  question?: string
  answer?: string
  category?: string
  score?: number
  prompt?: string
  suggestions?: Array<{
    entry_id?: string
    question?: string
    category?: string
    score?: number
  }>
  follow_ups?: string[]
}

type AiResponseSchema = {
  cards?: Array<{
    tool_name?: string
    title?: string
    metrics?: AiMetric[]
    duration_ms?: number
  }>
  analytics?: AiAnalyticsSchema | null
  knowledge_base?: AiKnowledgeBaseSchema | null
}

type AiConversationState = {
  status: "answered" | "needs_clarification" | string
  intent?: string
  confidence_score?: number
  question?: string
  options?: string[]
}

type AiToolDefinition = {
  name: string
  description: string
  mode: string
  required_groups: string[]
  available: boolean
}

type AiSessionSummary = {
  id: number
  title: string
  language: "pt" | "en"
  active_module?: string
  last_message_at?: string
  message_count?: number
}

type ConversationMessage = {
  id: string
  role: "user" | "assistant" | "error"
  content: string
  sources?: AiSource[]
  toolCalls?: AiToolCall[]
  suggestedActions?: AiSuggestedAction[]
  investigation?: AiInvestigation | null
  conversation?: AiConversationState
  schema?: AiResponseSchema
}

function formatToolName(value: string) {
  return value.replace(/_/g, " ")
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  return String(value)
}

function AiStructuredResultPanel({ schema, onAsk }: { schema?: AiResponseSchema; onAsk?: (question: string) => void }) {
  const { t, language } = useLanguage()
  const cards = schema?.cards || []
  const analytics = schema?.analytics || null
  if (!cards.length && !analytics) return null

  const comparison = analytics?.comparison || null
  const primaryGroup = analytics?.groups?.[0]
  const periodRows = analytics?.period_rows || []
  const numericRows = analytics?.numeric_summaries || []
  const sampleRows = analytics?.sample_rows || []
  const insights = analytics?.insights || []
  const nextQuestions = analytics?.next_questions || []

  return (
    <div className="mt-3 space-y-3">
      {cards.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {cards.slice(0, 4).map((card, index) => (
            <div key={`${card.tool_name || "card"}-${index}`} className="rounded-2xl border border-border bg-muted/25 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BarChart3 size={15} />
                  <span className="line-clamp-1">{card.title || card.tool_name}</span>
                </div>
                {typeof card.duration_ms === "number" ? (
                  <Badge variant="info">{card.duration_ms} ms</Badge>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(card.metrics || []).slice(0, 6).map((metric, metricIndex) => (
                  <div key={`${card.tool_name || "metric"}-${metricIndex}`} className="rounded-xl bg-card p-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {language === "en" ? metric.label_en || metric.label : metric.label_pt || metric.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{formatValue(metric.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {analytics ? (
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp size={15} />
                {analytics.title || t("Análise estruturada", "Structured analysis")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {analytics.resource_label || "—"}
                {analytics.range?.start_date && analytics.range?.end_date
                  ? ` · ${analytics.range.start_date} → ${analytics.range.end_date}`
                  : ""}
              </div>
            </div>
            {analytics.period_bucket ? <Badge variant="info">{analytics.period_bucket}</Badge> : null}
          </div>

          {insights.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {insights.slice(0, 4).map((insight, index) => {
                const text = language === "en" ? insight.label_en || insight.label : insight.label_pt || insight.label
                const variant = insight.severity === "success" ? "success" : insight.severity === "warning" ? "warning" : "info"
                return (
                  <div key={`${text || "insight"}-${index}`} className="rounded-xl border border-border bg-muted/25 p-3 text-sm">
                    <Badge variant={variant}>{t("Leitura", "Reading")}</Badge>
                    <div className="mt-2 text-foreground">{text}</div>
                  </div>
                )
              })}
            </div>
          ) : null}

          {comparison ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/25 p-3 text-sm">
              <div className="font-semibold text-foreground">{t("Comparação automática", "Automatic comparison")}</div>
              <div className="mt-1 text-muted-foreground">
                {t("Período anterior", "Previous period")}: {comparison.previous_start_date || "—"} → {comparison.previous_end_date || "—"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="default">{t("Atual", "Current")}: {formatValue(comparison.current_count)}</Badge>
                <Badge variant="default">{t("Anterior", "Previous")}: {formatValue(comparison.previous_count)}</Badge>
                <Badge variant={(comparison.absolute_delta || 0) >= 0 ? "success" : "warning"}>
                  {t("Variação", "Change")}: {comparison.absolute_delta && comparison.absolute_delta > 0 ? "+" : ""}{formatValue(comparison.absolute_delta)}
                  {comparison.percent_delta !== null && comparison.percent_delta !== undefined ? ` · ${comparison.percent_delta > 0 ? "+" : ""}${comparison.percent_delta}%` : ""}
                </Badge>
              </div>
            </div>
          ) : null}

          {numericRows.length ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Table2 size={14} />
                {t("Indicadores numéricos", "Numeric indicators")}
              </div>
              <div className="divide-y divide-border">
                {numericRows.slice(0, 5).map((row) => (
                  <div key={row.field || row.label} className="grid grid-cols-2 gap-2 px-3 py-2 text-xs md:grid-cols-5">
                    <div className="font-semibold text-foreground">{row.label || row.field}</div>
                    <div>{t("Total", "Total")}: {formatValue(row.total)}</div>
                    <div>{t("Média", "Average")}: {formatValue(row.average)}</div>
                    <div>{t("Mín.", "Min")}: {formatValue(row.minimum)}</div>
                    <div>{t("Máx.", "Max")}: {formatValue(row.maximum)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {primaryGroup?.rows?.length ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Distribuição principal", "Main breakdown")}: {primaryGroup.label || primaryGroup.field}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {primaryGroup.rows.slice(0, 8).map((row) => (
                  <Badge key={`${row.value}-${row.count}`} variant="default">
                    {formatValue(row.value)} · {formatValue(row.count)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {periodRows.length ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Tendência", "Trend")}
              </div>
              <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {periodRows.slice(0, 9).map((row, index) => (
                  <div key={`${row.period || row.day}-${index}`} className="flex items-center justify-between rounded-lg bg-card px-2 py-1 text-xs">
                    <span>{row.period || row.day || "—"}</span>
                    <span className="font-semibold">{formatValue(row.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sampleRows.length ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Amostras seguras", "Safe samples")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sampleRows.map((row, index) => {
                  const value = row.custom_id || row.student_code || row.teacher_code || row.code || row.number || row.serial_number || row.name || row.title || row.id
                  return <Badge key={`${value}-${index}`} variant="info">{formatValue(value)}</Badge>
                })}
              </div>
            </div>
          ) : null}

          {nextQuestions.length ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Continuar investigação", "Continue investigation")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {nextQuestions.map((question, index) => {
                  const text = language === "en" ? question.label_en || question.label : question.label_pt || question.label
                  return (
                    <button
                      key={`${text || "question"}-${index}`}
                      type="button"
                      onClick={() => text && onAsk?.(text)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                    >
                      {text}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AiKnowledgeBasePanel({ schema, onAsk }: { schema?: AiResponseSchema; onAsk?: (question: string) => void }) {
  const { t } = useLanguage()
  const knowledge = schema?.knowledge_base
  if (!knowledge) return null

  const suggestions = knowledge.suggestions || []
  const followUps = knowledge.follow_ups || []
  const isSuggestion = knowledge.status === "needs_confirmation"

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lightbulb size={15} />
          {isSuggestion ? t("Sugestão de pergunta", "Question suggestion") : t("Resposta prevista", "Predicted answer")}
        </div>
        {knowledge.category ? <Badge variant="info">{knowledge.category}</Badge> : null}
      </div>

      {isSuggestion ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {knowledge.prompt || t("Quis dizer uma destas perguntas?", "Did you mean one of these questions?")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.entry_id || suggestion.question}-${suggestion.score}`}
                type="button"
                onClick={() => {
                  if (suggestion.question) onAsk?.(suggestion.question)
                }}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                {suggestion.question}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {knowledge.question ? (
            <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {knowledge.question}
            </div>
          ) : null}
          {followUps.length ? (
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Perguntas seguintes", "Follow-up questions")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {followUps.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => onAsk?.(question)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function AiContextAside({
  tools,
  sessions,
  investigations,
  loading,
}: {
  tools: AiToolDefinition[]
  sessions: AiSessionSummary[]
  investigations: AiInvestigation[]
  loading: boolean
}) {
  const { t, isPortuguese } = useLanguage()

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck size={16} />
          {t("Escopo de segurança", "Security scope")}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t(
            "A IA usa o tenant e as permissões do utilizador autenticado. Escrita fica bloqueada até confirmação explícita e nova validação no backend.",
            "The AI uses the authenticated user's tenant and permissions. Writes stay blocked until explicit confirmation and backend revalidation."
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("Ferramentas", "Tools")}
          </span>
          <Badge variant="info">{loading ? t("A carregar", "Loading") : tools.length}</Badge>
        </div>
        <div className="space-y-2">
          {tools.length ? tools.map((tool) => (
            <div key={tool.name} className="rounded-xl border border-border bg-card/80 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">{formatToolName(tool.name)}</span>
                <Badge variant={tool.available ? "success" : "warning"}>
                  {tool.available ? t("Disponível", "Available") : t("Sem acesso", "No access")}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground">
              {t("Nenhuma ferramenta carregada.", "No tools loaded.")}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/70 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Investigações recentes", "Recent investigations")}
        </div>
        <div className="space-y-2">
          {investigations.length ? investigations.slice(0, 6).map((investigation) => (
            <Link
              key={investigation.id || investigation.custom_id}
              href={`/ai/investigations/${investigation.id}`}
              className="block rounded-xl bg-card/80 p-2 transition hover:bg-muted"
            >
              <div className="line-clamp-1 text-xs font-semibold text-foreground">
                {investigation.title || t("Investigação da IA", "AI investigation")}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{investigation.intent || "—"}</span>
                <Badge variant={investigation.status === "blocked" ? "warning" : "success"}>
                  {investigation.confidence_score ?? 0}%
                </Badge>
              </div>
            </Link>
          )) : (
            <p className="text-xs text-muted-foreground">
              {t("As investigações estruturadas aparecerão aqui.", "Structured investigations will appear here.")}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/70 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Sessões recentes", "Recent sessions")}
        </div>
        <div className="space-y-2">
          {sessions.length ? sessions.map((session) => (
            <div key={session.id} className="rounded-xl bg-card/80 p-2">
              <div className="line-clamp-1 text-xs font-semibold text-foreground">
                {session.title || t("Sessão da IA", "AI session")}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatDate(session.last_message_at)}</span>
                <span>{session.message_count ?? 0} {isPortuguese ? "msgs" : "msgs"}</span>
              </div>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground">
              {t("A primeira conversa aparecerá aqui.", "The first conversation will appear here.")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AiOperationalPage() {
  const { t, language } = useLanguage()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [composer, setComposer] = useState("")
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [toolsLoading, setToolsLoading] = useState(true)
  const [tools, setTools] = useState<AiToolDefinition[]>([])
  const [sessions, setSessions] = useState<AiSessionSummary[]>([])
  const [investigations, setInvestigations] = useState<AiInvestigation[]>([])
  const [confirmingActionId, setConfirmingActionId] = useState<number | null>(null)
  const [actionResults, setActionResults] = useState<Record<number, AiSuggestedAction>>({})
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const promptGroups = useMemo(
    () => [
      {
        title: t("Contar e comparar", "Count and compare"),
        description: t("Use datas naturais ou intervalos.", "Use natural dates or ranges."),
        icon: CalendarDays,
        prompts: [
          t("Quantos pacientes deram entrada hoje?", "How many patients were admitted today?"),
          t("Quantos estudantes foram criados este mês?", "How many students were created this month?"),
          t("Quantos equipamentos foram criados nos últimos 7 dias?", "How many equipment records were created in the last 7 days?"),
        ],
      },
      {
        title: t("Pesquisar registos", "Search records"),
        description: t("Código, nome, referência ou parte do texto.", "Code, name, reference or partial text."),
        icon: Search,
        prompts: [
          t("Mostre equipamento código EQ-SQL-001", "Show equipment code EQ-SQL-001"),
          t("Liste pacientes com nome Paciente", "List patients named Patient"),
          t("Mostre erros do sistema dos últimos 7 dias", "Show system errors from the last 7 days"),
        ],
      },
      {
        title: t("Stock histórico", "Historical stock"),
        description: t("A IA reconstrói o saldo até à data.", "The AI reconstructs balance up to the date."),
        icon: PackageSearch,
        prompts: [
          t("Qual era o stock de medicação Paracetamol ontem?", "What was the Paracetamol medication stock yesterday?"),
          t("Qual era o estoque de medicação K no dia 2026-05-11?", "What was the medication K stock on 2026-05-11?"),
        ],
      },
      {
        title: t("Criar por conversa", "Create by conversation"),
        description: t("A escrita fica pendente até confirmação.", "Writes stay pending until confirmation."),
        icon: UserPlus,
        prompts: [
          t("Crie um paciente chamado Paciente Teste.", "Create a patient called Test Patient."),
          t("Crie equipamento nome Centrífuga X número de série EQ-001.", "Create equipment named Centrifuge X serial number EQ-001."),
        ],
      },
      {
        title: t("Perguntas previstas", "Predicted questions"),
        description: t("Ajuda, correcção de escrita e atalhos.", "Help, typo correction and shortcuts."),
        icon: Lightbulb,
        prompts: [
          t("Que perguntas posso fazer?", "What can I ask?"),
          t("A IA entende erros de ortografia?", "Does the AI understand typos?"),
          t("Como funciona o CRUD por IA?", "How does AI CRUD work?"),
        ],
      },
      {
        title: t("Relatórios e prioridades", "Reports and priorities"),
        description: t("Para Command Center e visão executiva.", "For Command Center and executive view."),
        icon: FileText,
        prompts: [
          t("Gere relatório operacional dos últimos 30 dias.", "Generate an operational report for the last 30 days."),
          t("Quais alertas activos existem agora?", "What active alerts exist now?"),
          t("Quem sou eu neste sistema?", "Who am I in this system?"),
        ],
      },
    ],
    [t]
  )

  const draftHint = useMemo(() => {
    const normalized = composer.trim().toLowerCase()
    if (!normalized) return null
    if (/(crie|criar|inserir|adicione|alterar|remover|create|update|delete)/.test(normalized)) {
      return t("Fluxo detectado: alteração com confirmação obrigatória.", "Detected flow: change with mandatory confirmation.")
    }
    if (/(relat[oó]rio|report|pdf|csv|export)/.test(normalized)) {
      return t("Fluxo detectado: relatório operacional.", "Detected flow: operational report.")
    }
    if (/(stock|estoque|saldo)/.test(normalized)) {
      return t("Fluxo detectado: stock histórico ou actual.", "Detected flow: historical or current stock.")
    }
    if (/(quantos|quantas|listar|mostre|buscar|pesquisar|show|list|search)/.test(normalized)) {
      return t("Fluxo detectado: pesquisa segura de dados.", "Detected flow: secure data search.")
    }
    return t("Inclua módulo, período, código ou acção para melhorar a precisão.", "Include module, period, code or action to improve precision.")
  }, [composer, t])

  useEffect(() => {
    if (typeof window === "undefined") return
    const question = new URLSearchParams(window.location.search).get("question")
    if (question) setComposer(question)
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadContext() {
      setToolsLoading(true)
      const [toolsResult, sessionsResult, investigationsResult] = await Promise.allSettled([
        apiFetch<{ tools: AiToolDefinition[] }>(`/ai/assistant/tools/?language=${language}`, { clientCache: false }),
        apiFetch<AiSessionSummary[]>("/ai/assistant/sessions/", { clientCache: false }),
        apiFetch<AiInvestigation[]>("/ai/assistant/investigations/", { clientCache: false }),
      ])

      if (!mounted) return
      if (toolsResult.status === "fulfilled") setTools(toolsResult.value?.tools || [])
      if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value || [])
      if (investigationsResult.status === "fulfilled") setInvestigations(investigationsResult.value || [])
      setToolsLoading(false)
    }

    void loadContext()
    return () => {
      mounted = false
    }
  }, [language])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  async function sendMessage(rawText: string) {
    const text = rawText.trim()
    if (!text || loading) return

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    }
    setMessages((current) => [...current, userMessage])
    setComposer("")
    setLoading(true)

    try {
      const response = await apiFetch<AiChatResponse>("/ai/assistant/chat/", {
        method: "POST",
        clientCache: false,
        timeoutMs: 45_000,
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          language,
          active_module: "ai",
          context: {
            current_path: typeof window !== "undefined" ? window.location.pathname : "/ai",
            filters: {},
          },
        }),
      })

      setSessionId(response.session_id)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${response.message_id}`,
          role: "assistant",
          content: response.answer,
          sources: response.sources || [],
          toolCalls: response.tool_calls || [],
          suggestedActions: response.suggested_actions || [],
          investigation: response.investigation || null,
          conversation: response.conversation,
          schema: response.schema,
        },
      ])
      if (response.investigation) {
        setInvestigations((current) => [
          response.investigation as AiInvestigation,
          ...current.filter((item) => item.id !== response.investigation?.id),
        ].slice(0, 20))
      }
      setSessions((current) => {
        const withoutCurrent = current.filter((item) => item.id !== response.session_id)
        return [
          {
            id: response.session_id,
            title: text,
            language,
            active_module: "ai",
            last_message_at: new Date().toISOString(),
            message_count: 2,
          },
          ...withoutCurrent,
        ].slice(0, 8)
      })
    } catch (error: any) {
      const detail = error?.message || t("Falha ao consultar a IA Operacional.", "Failed to query the Operational AI.")
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "error",
          content: detail,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    await sendMessage(composer)
  }

  async function handleConfirmAction(action: AiSuggestedAction) {
    if (confirmingActionId) return
    setConfirmingActionId(action.id)
    try {
      const result = await apiFetch<AiSuggestedAction>(`/ai/assistant/actions/${action.id}/confirm/`, {
        method: "POST",
        clientCache: false,
        timeoutMs: 45_000,
        body: JSON.stringify({ confirmation_text: action.confirmation_summary || action.action_type }),
      })
      setActionResults((current) => ({ ...current, [action.id]: result }))
      setMessages((current) =>
        current.map((message) => ({
          ...message,
          suggestedActions: message.suggestedActions?.map((item) =>
            item.id === action.id ? { ...item, ...result } : item
          ),
        }))
      )
    } catch (error: any) {
      const detail = error?.message || t("Falha ao confirmar a acção da IA.", "Failed to confirm the AI action.")
      setMessages((current) => [
        ...current,
        {
          id: `error-action-${Date.now()}`,
          role: "error",
          content: detail,
        },
      ])
    } finally {
      setConfirmingActionId(null)
    }
  }

  function handleAskRecommended(question: string) {
    void sendMessage(question)
  }

  const aside = (
    <AiContextAside
      tools={tools}
      sessions={sessions}
      investigations={investigations}
      loading={toolsLoading}
    />
  )

  return (
    <AppLayout rightAside={aside} rightAsideWidth="22rem">
      <div className="space-y-5">
        <PageHeader
          title={t("IA Operacional", "Operational AI")}
          subtitle={t(
            "Copiloto auditável para contexto pessoal, investigação segura de dados e CRUD conversacional com confirmação.",
            "Auditable copilot for personal context, secure data investigation and confirmable conversational CRUD."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ai/investigations"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <Lightbulb size={15} />
                {t("Investigações", "Investigations")}
              </Link>
              <Link
                href="/ai/tasks"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ClipboardCheck size={15} />
                {t("Tarefas da IA", "AI Tasks")}
              </Link>
              <Link
                href="/monitoring/command-center"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ExternalLink size={15} />
                {t("Abrir Command Center", "Open Command Center")}
              </Link>
            </div>
          }
        />

        <div className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(22,101,52,0.18),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.86))] p-4 text-white shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                <BrainCircuit size={15} />
                {t("Modo operacional com confirmação", "Operational mode with confirmation")}
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                {t("Identifica-o pelo login e só consulta ou altera o que o seu perfil permite.", "It identifies you by login and only queries or changes what your profile allows.")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                {t(
                  "Pergunte quem está autenticado, que dados pode investigar ou peça para criar/alterar registos. Escrita só acontece depois de confirmação e nova validação no backend.",
                  "Ask who is authenticated, what data can be investigated or request record creation/updates. Writes only happen after confirmation and backend revalidation."
                )}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <Lock size={14} />
                  Tenant
                </div>
                <div className="mt-1 text-sm font-semibold">{t("Escopo actual", "Current scope")}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <TerminalSquare size={14} />
                  Gateway
                </div>
                <div className="mt-1 text-sm font-semibold">local</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <Sparkles size={14} />
                  {t("Fluxo seguro", "Secure flow")}
                </div>
                <div className="mt-1 text-sm font-semibold">{t("CRUD + RBAC", "CRUD + RBAC")}</div>
              </div>
            </div>
          </div>
        </div>

        <Card title={t("Conversa operacional", "Operational conversation")}>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {promptGroups.map((group) => {
              const Icon = group.icon
              return (
                <div key={group.title} className="rounded-2xl border border-border bg-background/70 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="rounded-xl bg-primary/10 p-1.5 text-primary">
                      <Icon size={16} />
                    </span>
                    {group.title}
                  </div>
                  <p className="mt-1 min-h-[2rem] text-xs leading-relaxed text-muted-foreground">{group.description}</p>
                  <div className="mt-3 space-y-1.5">
                    {group.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="block w-full rounded-xl border border-border bg-card px-2.5 py-2 text-left text-xs font-medium text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex min-h-[30rem] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {!messages.length ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                      <Bot size={22} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {t("Comece por uma pergunta operacional.", "Start with an operational question.")}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(
                          "A IA pergunta o que falta, prepara acções confirmáveis e recusa recursos fora do seu perfil.",
                          "The AI asks for missing data, prepares confirmable actions and refuses resources outside your profile."
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {promptGroups.flatMap((group) => group.prompts).slice(0, 7).map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => void sendMessage(question)}
                            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {messages.map((message) => {
                const isUser = message.role === "user"
                const isError = message.role === "error"
                return (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-3 ${
                      isUser
                        ? "ml-auto max-w-[82%] border-primary/20 bg-primary text-primary-foreground"
                        : isError
                          ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                          : "mr-auto max-w-[92%] border-border bg-background"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                      {isUser ? t("Utilizador", "User") : isError ? t("Erro", "Error") : t("IA Operacional", "Operational AI")}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

                    {message.conversation?.status === "needs_clarification" && message.conversation.options?.length ? (
                      <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Lightbulb size={14} />
                          {t("Responder com uma opção", "Reply with an option")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.conversation.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => void sendMessage(option)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-background"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <AiStructuredResultPanel schema={message.schema} onAsk={handleAskRecommended} />
                    <AiKnowledgeBasePanel schema={message.schema} onAsk={handleAskRecommended} />

                    <AiInvestigationPanel
                      investigation={message.investigation || null}
                      onAsk={handleAskRecommended}
                    />
                    <AiToolTrace calls={message.toolCalls || []} />
                    <AiEvidencePanel sources={message.sources || []} />
                    <AiActionPanel
                      actions={message.suggestedActions || []}
                      confirmingId={confirmingActionId}
                      results={actionResults}
                      onConfirm={handleConfirmAction}
                    />
                  </div>
                )
              })}

              {loading ? (
                <div className="mr-auto max-w-[92%] rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    {t("A consultar fontes internas e gravar auditoria...", "Querying internal sources and recording audit...")}
                  </div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="mt-4 border-t border-border pt-3">
              {draftHint ? (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <Badge variant="info">{t("Leitura da IA", "AI read")}</Badge>
                  <span>{draftHint}</span>
                </div>
              ) : null}
              <TextAreaInput
                ref={composerRef}
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                rows={3}
                placeholder={t(
                  "Ex.: Crie um paciente chamado Paciente Teste, contacto +258 84 000 0000",
                  "Example: Create a patient called Test Patient, phone +258 84 000 0000"
                )}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    void handleSubmit()
                  }
                }}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Ctrl+Enter envia. Acções de escrita ficam pendentes até confirmar no botão gerado pela IA.",
                    "Ctrl+Enter sends. Write actions remain pending until confirmed with the AI-generated button."
                  )}
                </p>
                <Button type="submit" loading={loading} disabled={!composer.trim()}>
                  <Send size={15} />
                  {t("Enviar", "Send")}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
