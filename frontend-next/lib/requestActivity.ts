type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OTHER"

interface TaskDescriptor {
  label: string
  detail: string
}

export interface RequestActivityStartEvent {
  phase: "start"
  id: string
  method: string
  url: string
  title: string
  detail: string
  startedAt: number
}

export interface RequestActivityFinishEvent {
  phase: "finish"
  id: string
  endedAt: number
  durationMs: number
}

export type RequestActivityEvent =
  | RequestActivityStartEvent
  | RequestActivityFinishEvent

type Subscriber = (event: RequestActivityEvent) => void

let subscribers: Subscriber[] = []
const activeAbortHandlers = new Map<string, () => void>()

function normalizeMethod(method?: string): HttpMethod {
  const value = (method || "GET").toUpperCase()
  if (value === "GET") return "GET"
  if (value === "POST") return "POST"
  if (value === "PUT") return "PUT"
  if (value === "PATCH") return "PATCH"
  if (value === "DELETE") return "DELETE"
  return "OTHER"
}

function normalizePath(url: string): string {
  const safe = (url || "/").split("?")[0]
  return safe.startsWith("/") ? safe : `/${safe}`
}

function inferFallbackLabel(path: string): string {
  const tokens = path
    .split("/")
    .filter(Boolean)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => token !== "api" && token !== "v1")

  const candidate = tokens[tokens.length - 1] || "dados"
  return candidate.replace(/[-_]+/g, " ")
}

function resolveTask(path: string): TaskDescriptor {
  const rules: Array<{ match: RegExp; task: TaskDescriptor }> = [
    {
      match: /\/auth\//,
      task: {
        label: "sessão de acesso",
        detail: "Estamos a validar credenciais e permissões da sessão.",
      },
    },
    {
      match: /\/clinical\/patient\//,
      task: {
        label: "dados de pacientes",
        detail: "Estamos a consolidar histórico clínico e dados administrativos.",
      },
    },
    {
      match: /\/clinical\/labrequest\//,
      task: {
        label: "requisições clínicas",
        detail: "Estamos a validar pedidos, prioridades e estado da requisição.",
      },
    },
    {
      match: /\/clinical\/resultitem\//,
      task: {
        label: "resultados laboratoriais",
        detail: "Estamos a sincronizar resultados e validações clínicas.",
      },
    },
    {
      match: /\/clinical\/medicalresult(file)?\//,
      task: {
        label: "resultados médicos",
        detail: "Estamos a processar laudos e anexos com validação clínica.",
      },
    },
    {
      match: /\/clinical\/medicalexam\//,
      task: {
        label: "exames médicos",
        detail: "Estamos a organizar catálogo e parâmetros dos exames médicos.",
      },
    },
    {
      match: /\/consultations\/consultation\//,
      task: {
        label: "consultas",
        detail: "Estamos a organizar agenda, estado e registos da consulta.",
      },
    },
    {
      match: /\/billing\/invoiceitem\//,
      task: {
        label: "itens de fatura",
        detail: "Estamos a recalcular itens, subtotais e integridade da fatura.",
      },
    },
    {
      match: /\/billing\/invoice\/|\/invoices\//,
      task: {
        label: "faturas",
        detail: "Estamos a consolidar totais, estado e ligações de cobrança.",
      },
    },
    {
      match: /\/payments\/payment\//,
      task: {
        label: "pagamentos",
        detail: "Estamos a confirmar estados e consistência financeira.",
      },
    },
    {
      match: /\/payments\/receipt\//,
      task: {
        label: "recibos",
        detail: "Estamos a preparar comprovativos com os dados mais recentes.",
      },
    },
    {
      match: /\/payments\/transaction\//,
      task: {
        label: "transações",
        detail: "Estamos a rastrear movimentos e confirmação de transações.",
      },
    },
    {
      match: /\/payments\/reconciliation\//,
      task: {
        label: "reconciliações financeiras",
        detail: "Estamos a cruzar lançamentos para manter o balanço consistente.",
      },
    },
    {
      match: /\/pharmacy\/material_requisition\//,
      task: {
        label: "requisições de materiais",
        detail: "Estamos a validar disponibilidade e estado de avio de materiais.",
      },
    },
    {
      match: /\/pharmacy\/lot\//,
      task: {
        label: "lotes da farmácia",
        detail: "Estamos a sincronizar validade, stock e disponibilidade dos lotes.",
      },
    },
    {
      match: /\/pharmacy\/product\//,
      task: {
        label: "produtos da farmácia",
        detail: "Estamos a carregar catálogo, preços e estado de stock.",
      },
    },
    {
      match: /\/pharmacy\/inventory_movement\//,
      task: {
        label: "movimentos de stock",
        detail: "Estamos a atualizar entradas, saídas e saldo de stock.",
      },
    },
    {
      match: /\/notifications\//,
      task: {
        label: "notificações",
        detail: "Estamos a preparar notificações e respetivos logs de envio.",
      },
    },
    {
      match: /\/monitoring\//,
      task: {
        label: "monitoramento do sistema",
        detail: "Estamos a compilar sinais de saúde e eventos de erro.",
      },
    },
    {
      match: /\/audit\//,
      task: {
        label: "auditoria",
        detail: "Estamos a consultar trilhos de atividade e conformidade.",
      },
    },
  ]

  const found = rules.find((rule) => rule.match.test(path))
  if (found) return found.task

  return {
    label: inferFallbackLabel(path),
    detail: "Estamos a tratar o pedido e a validar a consistência dos dados.",
  }
}

function actionVerb(method: HttpMethod): string {
  if (method === "GET") return "A carregar"
  if (method === "POST") return "A processar"
  if (method === "PUT" || method === "PATCH") return "A atualizar"
  if (method === "DELETE") return "A remover"
  return "A processar"
}

function buildTitle(path: string, method: HttpMethod): string {
  const task = resolveTask(path)
  return `${actionVerb(method)} ${task.label}`
}

function buildDetail(path: string): string {
  return resolveTask(path).detail
}

function emit(event: RequestActivityEvent) {
  for (const subscriber of subscribers) {
    subscriber(event)
  }
}

export function subscribeRequestActivity(subscriber: Subscriber) {
  subscribers.push(subscriber)
  return () => {
    subscribers = subscribers.filter((item) => item !== subscriber)
  }
}

export function beginRequestActivity(url: string, method?: string): RequestActivityStartEvent {
  const normalizedMethod = normalizeMethod(method)
  const path = normalizePath(url)
  const startedAt = Date.now()
  const id = `${startedAt}-${Math.random().toString(36).slice(2, 9)}`

  const event: RequestActivityStartEvent = {
    phase: "start",
    id,
    method: normalizedMethod,
    url: path,
    title: buildTitle(path, normalizedMethod),
    detail: buildDetail(path),
    startedAt,
  }
  emit(event)
  return event
}

export function finishRequestActivity(startEvent: RequestActivityStartEvent) {
  activeAbortHandlers.delete(startEvent.id)
  const endedAt = Date.now()
  emit({
    phase: "finish",
    id: startEvent.id,
    endedAt,
    durationMs: Math.max(0, endedAt - startEvent.startedAt),
  })
}

export function registerRequestAbortHandler(id: string, abort: () => void) {
  activeAbortHandlers.set(id, abort)
  return () => activeAbortHandlers.delete(id)
}

export function abortActiveRequests() {
  const handlers = Array.from(activeAbortHandlers.values())
  activeAbortHandlers.clear()
  handlers.forEach((abort) => abort())
  return handlers.length
}
