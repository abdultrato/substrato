"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { pharmacyService } from "@/lib/api/typed-client"
import { type MovimentoEstoque, type Lote, type Produto } from "@/lib/validators/schemas"

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function FarmaciaMovimentosPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MovimentoEstoque[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [lotes, setLotes] = useState<Map<number, Lote>>(new Map())
  const [produtos, setProdutos] = useState<Map<number, Produto>>(new Map())

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const [movRes, lotesRes, prodRes] = await Promise.all([
          pharmacyService.listMovimentos(),
          pharmacyService.listLotes(),
          pharmacyService.listProdutos(),
        ])

        const items = movRes.data || []
        const lotesMap = new Map<number, Lote>()
        lotesRes.data?.forEach(l => {
          if (l.id !== undefined && l.id !== null) lotesMap.set(l.id, l)
        })
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
        setLotes(lotesMap)
        setProdutos(produtoMap)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar movimentos."))
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
        render: (m: MovimentoEstoque) => (
          <Link
            href={`/recursos/farmacia/movimentoestoque/${m.id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {m.id_custom || m.id || "-"}
          </Link>
        ),
      },
      { header: "Lote", render: (m: MovimentoEstoque) => m.lote ?? "-" },
      {
        header: "Produto",
        render: (m: MovimentoEstoque) => {
          const lote = m.lote ? lotes.get(m.lote) : null
          const produto = lote?.produto ? produtos.get(lote.produto) : null
          return produto?.nome || lote?.produto || "-"
        },
      },
      { header: "Tipo", render: (m: MovimentoEstoque) => m.tipo || "-" },
      { header: "Origem", render: (m: MovimentoEstoque) => m.origem ?? "-" },
      { header: "Quantidade", render: (m: MovimentoEstoque) => m.quantidade ?? "-" },
      { header: "Data", render: (m: MovimentoEstoque) => fmtDate(m.criado_em) },
    ],
    [lotes, produtos]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Movimentos de estoque"
          subtitle="Auditoria de entradas/saídas/ajustes."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/recursos/farmacia/movimentoestoque/novo"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Novo
              </Link>
              <Link
                href="/recursos/farmacia/movimentoestoque"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento
              </Link>
              {podeVerAdmin ? (
                <Link
                  href="/admin/pharmacy/inventorymovement/"
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
            <DataTable<MovimentoEstoque>
              columns={columns as any}
              data={data}
              emptyMessage="Nenhum movimento encontrado."
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}



