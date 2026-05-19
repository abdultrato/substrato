"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type UserRow = {
  id: number
  username?: string
  name?: string
  groups?: string[]
  total_activities?: number
  last_activity_at?: string | null
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function normalizeUserRow(raw: any): UserRow {
  return {
    id: Number(raw?.id ?? 0),
    username: raw?.username,
    name: raw?.name ?? raw?.nome,
    groups: raw?.groups ?? raw?.grupos ?? [],
    total_activities: raw?.total_activities ?? raw?.total_atividades,
    last_activity_at: raw?.last_activity_at ?? raw?.ultima_atividade_em ?? null,
  }
}

export default function AuditoriaUsuariosPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<UserRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/audit/users/")
        const items = res && res.results ? res.results : res
        if (!mounted) return
        setRows(Array.isArray(items) ? items.map(normalizeUserRow) : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar utilizadores."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((u) => {
      const blob = `${u.name || ""} ${u.username || ""} ${(u.groups || []).join(" ")}`.toLowerCase()
      return blob.includes(term)
    })
  }, [q, rows])

  const columns = useMemo(
    () => [
      {
        header: "Utilizador",
        render: (u: UserRow) => (
          <div>
            <div className="font-medium text-gray-900">
              {u.name || u.username || "-"}
            </div>
            <div className="text-xs text-gray-500">{u.username || ""}</div>
          </div>
        ),
      },
      {
        header: "Grupos",
        render: (u: UserRow) => (
          <span className="text-sm text-gray-700">
            {(u.groups || []).join(", ") || "—"}
          </span>
        ),
      },
      {
        header: "Atividades",
        render: (u: UserRow) => u.total_activities ?? 0,
        className: "text-right",
      },
      {
        header: "Última atividade",
        render: (u: UserRow) => fmtDate(u.last_activity_at),
      },
      {
        header: "Ação",
        render: (u: UserRow) => (
          <Link
            href={`/audit/users/${u.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Ver histórico
          </Link>
        ),
      },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Histórico de atividades"
          subtitle="Utilizadores e ações recentes."
          actions={
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar utilizador/grupo..."
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
            />
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<UserRow>
            columns={columns as any}
            data={filtered}
            emptyMessage="Nenhum utilizador encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}


