"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
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
  TerminalSquare,
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

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = composer.trim()
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
    applyPrompt(question)
  }

  function applyPrompt(question: string) {
    setComposer(question)
    window.requestAnimationFrame(() => composerRef.current?.focus())
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
          <div className="mb-4 grid gap-3 lg:grid-cols-5">
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
                        onClick={() => applyPrompt(prompt)}
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
                            onClick={() => applyPrompt(question)}
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
                              onClick={() => applyPrompt(option)}
                              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-background"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

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
