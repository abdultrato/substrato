"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { pharmacyService } from "@/lib/api/typed-client"
import { type Lote, type Produto } from "@/lib/validators/schemas"

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

export default function FarmaciaLotesPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Lote[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [produtos, setProdutos] = useState<Map<number, Produto>>(new Map())

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const [res, prodRes] = await Promise.all([
          pharmacyService.listLotes(),
          pharmacyService.listProdutos(),
        ])

        const items = res.data || []
        const produtoMap = new Map<number, Produto>()
        prodRes.data?.forEach(p => {
          if (p.id !== undefined && p.id !== null) produtoMap.set(p.id, p)
        })
        const total = items.length
        const computedTotalPages = Math.max(1, Math.ceil(total / pageSize))
        const offset = (page - 1) * pageSize
        const pageItems = items.slice(offset, offset + pageSize)
        if (!mounted) return
        setData(pageItems)
        setTotalItems(total)
        setTotalPages(computedTotalPages)
        setProdutos(produtoMap)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar lotes.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [page, pageSize])

  const columns = useMemo(
    () => [
      {
        header: "Código",
        render: (l: Lote) => (
          <Link
            href={`/recursos/farmacia/lote/${l.id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {l.id_custom || l.id || "-"}
          </Link>
        ),
      },
      {
        header: "Produto",
        render: (l: Lote) => {
          const p = l.produto ? produtos.get(l.produto) : null
          return p?.nome || l.produto || "-"
        },
      },
      { header: "Nº Lote", render: (l: Lote) => l.numero_lote || "-" },
      { header: "Validade", render: (l: Lote) => fmtDate(l.validade) },
      { header: "Quantidade inicial", render: (l: Lote) => l.quantidade_inicial ?? "-" },
    ],
    [produtos]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Lotes"
          subtitle="Rastreio de estoque por lote e validade."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/recursos/farmacia/lote/novo"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Novo
              </Link>
              <Link
                href="/recursos/farmacia/lote"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento
              </Link>
              {podeVerAdmin ? (
                <Link
                  href="/admin/farmacia/lote/"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Total: {totalItems}</div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1)
                setPageSize(Number(e.target.value))
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            <DataTable<Lote>
              columns={columns as any}
              data={data}
              emptyMessage="Nenhum lote encontrado."
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
