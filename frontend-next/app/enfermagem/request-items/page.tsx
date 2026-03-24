"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>
type ExameRow = Record<string, any>

export default function EnfermagemItensRequisicaoPage() {
  const [requisicao, setRequisicao] = useState<string>("")
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Row[]>([])
  const [exames, setExames] = useState<ExameRow[]>([])
  const [examesMedicos, setExamesMedicos] = useState<ExameRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [itemsRes, examesRes, examesMedicosRes] = await Promise.all([
          apiFetch<any>(
            requisicao
              ? `/clinico/requisicaoitem/?requisicao=${encodeURIComponent(requisicao)}`
              : "/clinico/requisicaoitem/"
          ),
          apiFetch<any>("/exames/"),
          apiFetch<any>("/exames-medicos/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []
        const items = list(itemsRes)
        const exs = list(examesRes)
        const exsMed = list(examesMedicosRes)

        if (!mounted) return
        setData(Array.isArray(items) ? items.slice(0, 200) : [])
        setExames(Array.isArray(exs) ? exs : [])
        setExamesMedicos(Array.isArray(exsMed) ? exsMed : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar itens.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [requisicao])

  const exameById = useMemo(() => {
    const map = new Map<number, string>()
    exames.forEach((e) => {
      if (typeof e.id === "number") map.set(e.id, e.nome || e.id_custom || String(e.id))
    })
    return map
  }, [exames])

  const exameMedById = useMemo(() => {
    const map = new Map<number, string>()
    examesMedicos.forEach((e) => {
      if (typeof e.id === "number") map.set(e.id, e.nome || e.id_custom || String(e.id))
    })
    return map
  }, [examesMedicos])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: Row) => r.id_custom || r.id || "-" },
      { header: "Requisição", render: (r: Row) => r.requisicao || "-" },
      {
        header: "Exame",
        render: (r: Row) => {
          if (r.exame) return exameById.get(r.exame) || r.exame || "-"
          if (r.exame_medico) return exameMedById.get(r.exame_medico) || r.exame_medico || "-"
          return "-"
        },
      },
    ],
    [exameById, exameMedById]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Itens de requisição"
          subtitle="Lista de exames vinculados às requisições."
          actions={
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">Requisição (ID)</label>
              <input
                value={requisicao}
                onChange={(e) => setRequisicao(e.target.value)}
                placeholder="ex: 123"
                className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              />
            </div>
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
          <DataTable<Row> columns={columns as any} data={data} emptyMessage="Nenhum item encontrado." />
        )}
      </div>
    </AppLayout>
  )
}
