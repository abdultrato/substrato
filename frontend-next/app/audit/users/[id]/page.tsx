"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type AtividadeRow = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

const METHOD_LABELS: Record<string, string> = {
  GET: "Consulta",
  POST: "Criação",
  PUT: "Atualização",
  PATCH: "Atualização",
  DELETE: "Remoção",
}

function friendlyMethod(raw: any): string {
  const v = String(raw ?? "").trim().toUpperCase()
  return METHOD_LABELS[v] || v || "-"
}

function friendlyStatus(code: any): string {
  const n = Number(code)
  if (!n) return "—"
  if (n >= 200 && n < 300) return `Sucesso (${n})`
  if (n === 304) return `Sem alteração (${n})`
  if (n >= 300 && n < 400) return `Redirecionamento (${n})`
  if (n === 401) return `Sessão expirada (${n})`
  if (n === 403) return `Sem permissão (${n})`
  if (n === 404) return `Não encontrado (${n})`
  if (n >= 400 && n < 500) return `Erro do pedido (${n})`
  if (n >= 500) return `Erro do servidor (${n})`
  return String(n)
}

function friendlyResource(base: any, action: any): string {
  const b = String(base ?? "").trim()
  const a = String(action ?? "").trim()
  if (!b && !a) return "-"
  const labelBase = b
    ? b
        .split(/[-_]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    : "—"
  const labelAction = a
    ? ({ list: "lista", create: "criar", retrieve: "ver", update: "editar", partial_update: "editar", destroy: "remover" } as Record<string, string>)[a] || a
    : ""
  return labelAction ? `${labelBase} · ${labelAction}` : labelBase
}

function normalizeActivityRow(raw: any): AtividadeRow {
  return {
    id: Number(raw?.id ?? 0),
    created_at: raw?.created_at ?? raw?.criado_em ?? raw?.createdAt ?? null,
    method: raw?.method ?? raw?.metodo ?? null,
    full_path: raw?.full_path ?? raw?.path_completo ?? raw?.fullPath ?? null,
    path: raw?.path ?? raw?.caminho ?? null,
    status_code: raw?.status_code ?? raw?.codigo_status ?? raw?.statusCode ?? null,
    duration_ms: raw?.duration_ms ?? raw?.duracao_ms ?? null,
    view_basename: raw?.view_basename ?? raw?.viewBaseName ?? null,
    view_action: raw?.view_action ?? raw?.viewAction ?? null,
    message: raw?.message ?? raw?.mensagem ?? null,
    metadata: raw?.metadata ?? raw?.metadados ?? null,
  }
}

export default function AuditoriaUsuarioDetalhePage() {
  const params = useParams() as any
  const userId = String(params?.id || "")
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [utilizador, setUtilizador] = useState<any>(null)
  const [atividades, setAtividades] = useState<AtividadeRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [u, acts] = await Promise.all([
          apiFetch<any>(`/audit/usuarios/${encodeURIComponent(userId)}/`, { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>(`/audit/atividade/?user=${encodeURIComponent(userId)}`, { clientCache: safeRefreshToken === 0 }),
        ])

        const items = acts && (acts as any).results ? (acts as any).results : acts

        if (!mounted) return
        setUtilizador(u || null)
        setAtividades(Array.isArray(items) ? items.map(normalizeActivityRow) : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar histórico."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (userId) load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, userId])

  const columns = useMemo(
    () => [
      { header: "Quando", render: (r: AtividadeRow) => fmtDate(r.created_at) },
      { header: "Ação", render: (r: AtividadeRow) => friendlyMethod(r.method) },
      {
        header: "Página",
        render: (r: AtividadeRow) => (
          <div className="max-w-[520px] truncate" title={r.full_path || r.path || ""}>
            {r.full_path || r.path || "-"}
          </div>
        ),
      },
      { header: "Resultado", render: (r: AtividadeRow) => friendlyStatus(r.status_code) },
      {
        header: "Tempo",
        render: (r: AtividadeRow) => (r.duration_ms != null ? `${r.duration_ms} ms` : "—"),
        className: "text-right",
      },
      {
        header: "Recurso",
        render: (r: AtividadeRow) => (
          <span className="text-xs text-muted-foreground">
            {friendlyResource(r.view_basename, r.view_action)}
          </span>
        ),
      },
    ],
    []
  )

  const nome = utilizador?.nome || utilizador?.username || userId

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title={`Atividade de ${nome}`}
          subtitle="Histórico recente de pedidos."
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<AtividadeRow>
            columns={columns as any}
            data={atividades}
            emptyMessage="Sem actividades registradas para este utilizador."
          />
        )}
      </div>
    </AppLayout>
  )
}


