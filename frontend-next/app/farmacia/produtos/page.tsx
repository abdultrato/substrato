"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ProdutoRow = Record<string, any>

export default function FarmaciaProdutosPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProdutoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/farmacia/produto/")
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar produtos.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (p: ProdutoRow) => p.id_custom || p.id || "-" },
      { header: "Nome", render: (p: ProdutoRow) => p.nome || p.descricao || "-" },
      { header: "Tipo", render: (p: ProdutoRow) => p.tipo || p.categoria || "-" },
      { header: "Ativo", render: (p: ProdutoRow) => (p.ativo === false ? "Não" : "Sim") },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          subtitle="Catálogo de itens de farmácia/almoxarifado."
          actions={
            <Link
              href="/admin/farmacia/produto/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Abrir no admin
            </Link>
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
          <DataTable<ProdutoRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum produto encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}

