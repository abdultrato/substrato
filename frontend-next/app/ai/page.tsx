"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  BrainCircuit,
  ClipboardCheck,
  ExternalLink,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AiActionPanel, { type AiSuggestedAction } from "@/components/ai/AiActionPanel"
import AiEvidencePanel, { type AiSource } from "@/components/ai/AiEvidencePanel"
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
  loading,
}: {
  tools: AiToolDefinition[]
  sessions: AiSessionSummary[]
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
  const [confirmingActionId, setConfirmingActionId] = useState<number | null>(null)
  const [actionResults, setActionResults] = useState<Record<number, AiSuggestedAction>>({})
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const quickQuestions = useMemo(
    () => [
      t("Quem sou eu neste sistema?", "Who am I in this system?"),
      t("Que dados posso investigar?", "What data can I investigate?"),
      t("Quantos pacientes existem?", "How many patients exist?"),
      t("Mostre erros do sistema.", "Show system errors."),
      t("Quais alertas activos existem agora?", "What active alerts exist now?"),
    ],
    [t]
  )

  useEffect(() => {
    let mounted = true
    async function loadContext() {
      setToolsLoading(true)
      const [toolsResult, sessionsResult] = await Promise.allSettled([
        apiFetch<{ tools: AiToolDefinition[] }>(`/ai/assistant/tools/?language=${language}`, { clientCache: false }),
        apiFetch<AiSessionSummary[]>("/ai/assistant/sessions/", { clientCache: false }),
      ])

      if (!mounted) return
      if (toolsResult.status === "fulfilled") setTools(toolsResult.value?.tools || [])
      if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value || [])
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
        },
      ])
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

  const aside = <AiContextAside tools={tools} sessions={sessions} loading={toolsLoading} />

  return (
    <AppLayout rightAside={aside} rightAsideWidth="22rem">
      <div className="space-y-5">
        <PageHeader
          title={t("IA Operacional", "Operational AI")}
          subtitle={t(
            "Copiloto auditável para contexto pessoal, investigação segura de dados e fluxos operacionais.",
            "Auditable copilot for personal context, secure data investigation and operational workflows."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
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
                {t("Modo leitura com auditoria", "Read-only mode with audit")}
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                {t("Identifica-o pelo login e só consulta o que o seu perfil permite.", "It identifies you by login and only queries what your profile allows.")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                {t(
                  "Pergunte quem está autenticado, que dados pode investigar ou peça contagens/listagens específicas. Se o RBAC bloquear o recurso, a resposta será uma recusa explícita.",
                  "Ask who is authenticated, what data can be investigated or request specific counts/lists. If RBAC blocks the resource, the answer is an explicit refusal."
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
                  {t("Primeira ferramenta", "First tool")}
                </div>
                <div className="mt-1 text-sm font-semibold">{t("Contexto + RBAC", "Context + RBAC")}</div>
              </div>
            </div>
          </div>
        </div>

        <Card title={t("Conversa operacional", "Operational conversation")}>
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
                          "A IA pergunta o que deve ser investigado, consulta dados autorizados e recusa recursos fora do seu perfil.",
                          "The AI asks what should be investigated, queries authorized data and refuses resources outside your profile."
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quickQuestions.map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => setComposer(question)}
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
              <TextAreaInput
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                rows={3}
                placeholder={t(
                  "Ex.: Quem sou eu e que dados posso investigar?",
                  "Example: Who am I and what data can I investigate?"
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
                    "Ctrl+Enter envia. A resposta deve citar fontes internas quando usa dados do sistema.",
                    "Ctrl+Enter sends. The answer should cite internal sources when it uses system data."
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
