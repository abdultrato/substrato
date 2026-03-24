"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type AtividadeRow = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function AuditoriaUsuarioDetalhePage() {
  const params = useParams() as any
  const userId = String(params?.id || "")

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)
  const [atividades, setAtividades] = useState<AtividadeRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [u, acts] = await Promise.all([
          apiFetch<any>(`/auditoria/usuarios/${encodeURIComponent(userId)}/`),
          apiFetch<any>(`/auditoria/atividade/?usuario=${encodeURIComponent(userId)}`),
        ])

        const items = acts && (acts as any).results ? (acts as any).results : acts

        if (!mounted) return
        setUsuario(u || null)
        setAtividades(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar histórico.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (userId) load()
    return () => {
      mounted = false
    }
  }, [userId])

  const columns = useMemo(
    () => [
      { header: "Quando", render: (r: AtividadeRow) => fmtDate(r.criado_em) },
      { header: "Método", render: (r: AtividadeRow) => r.metodo || "-" },
      {
        header: "Rota",
        render: (r: AtividadeRow) => (
          <div className="max-w-[520px] truncate" title={r.path_completo || r.caminho || ""}>
            {r.path_completo || r.caminho || "-"}
          </div>
        ),
      },
      { header: "Status", render: (r: AtividadeRow) => r.status_code ?? "-" },
      {
        header: "Tempo (ms)",
        render: (r: AtividadeRow) => (r.duracao_ms ?? "—"),
        className: "text-right",
      },
      {
        header: "Recurso",
        render: (r: AtividadeRow) => (
          <span className="text-xs text-gray-600">
            {(r.view_basename || "-") + (r.view_action ? `:${r.view_action}` : "")}
          </span>
        ),
      },
    ],
    []
  )

  const nome = usuario?.nome || usuario?.username || userId

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title={`Actividades: ${nome}`}
          subtitle="Registos em ordem cronológica (mais recentes primeiro)."
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

