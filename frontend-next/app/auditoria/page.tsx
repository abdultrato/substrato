"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type UsuarioRow = {
  id: number
  username?: string
  nome?: string
  grupos?: string[]
  total_atividades?: number
  ultima_atividade_em?: string | null
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function AuditoriaUsuariosPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<UsuarioRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/auditoria/usuarios/")
        const items = res && res.results ? res.results : res
        if (!mounted) return
        setRows(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar usuários.")
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
      const blob = `${u.nome || ""} ${u.username || ""} ${(u.grupos || []).join(" ")}`.toLowerCase()
      return blob.includes(term)
    })
  }, [q, rows])

  const columns = useMemo(
    () => [
      {
        header: "Utilizador",
        render: (u: UsuarioRow) => (
          <div>
            <div className="font-medium text-gray-900">
              {u.nome || u.username || "-"}
            </div>
            <div className="text-xs text-gray-500">{u.username || ""}</div>
          </div>
        ),
      },
      {
        header: "Grupos",
        render: (u: UsuarioRow) => (
          <span className="text-sm text-gray-700">
            {(u.grupos || []).join(", ") || "—"}
          </span>
        ),
      },
      {
        header: "Actividades",
        render: (u: UsuarioRow) => u.total_atividades ?? 0,
        className: "text-right",
      },
      {
        header: "Última Actividade",
        render: (u: UsuarioRow) => fmtDate(u.ultima_atividade_em),
      },
      {
        header: "Ação",
        render: (u: UsuarioRow) => (
          <Link
            href={`/auditoria/usuarios/${u.id}`}
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
          title="Histórico de Actividades"
          subtitle="Apenas Administrador: lista de usuários e suas actividades."
          actions={
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar usuário/grupo..."
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
          <DataTable<UsuarioRow>
            columns={columns as any}
            data={filtered}
            emptyMessage="Nenhum usuário encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}

