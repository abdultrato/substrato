"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { ApiListMeta, apiFetchList } from "@/lib/api"
import {
  canCreateMaterialRequisition,
  isMaterialRequisitionPharmacyUser,
} from "@/lib/material-requisition-rbac"
import { GROUPS } from "@/lib/rbac"

type MaterialRequisition = {
  id: number
  custom_id?: string
  created_at?: string
  status?: string
  sector?: string
  requested_by_department?: string
  created_by_name?: string
}

type ListResponse = { items: MaterialRequisition[]; meta: ApiListMeta; raw: any }

function formatDt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

function statusLabel(s?: string) {
  switch (s) {
    case "PEN":
      return "Pendente"
    case "PAR":
      return "Parcial"
    case "FUL":
      return "Aviada"
    case "HLD":
      return "Arquivada"
    default:
      return s || "—"
  }
}

function sectorLabel(s?: string) {
  switch (s) {
    case "LAB":
      return "Laboratório"
    case "ENF":
      return "Enfermagem"
    case "REC":
      return "Recepção"
    case "MED":
      return "Medicina"
    case "MOC":
      return "Medicina Ocupacional"
    case "OUT":
      return "Outros setores"
    default:
      return s || "—"
  }
}

export default function RequisicoesMateriaisPage() {
  useAuthGuard()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const isPharmacy = isMaterialRequisitionPharmacyUser(user)
  const canCreate = canCreateMaterialRequisition(user)
  const requiredGroups = useMemo(
    () => [
      GROUPS.ADMIN,
      GROUPS.FARMACIA,
      GROUPS.LABORATORIO,
      GROUPS.ENFERMAGEM,
      GROUPS.RECEPCAO,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.CONTABILIDADE,
      GROUPS.MANUTENCAO,
      GROUPS.RECURSOS_HUMANOS,
    ],
    []
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ListResponse | null>(null)
  const [onlyPending, setOnlyPending] = useState(true)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
        const url = `/pharmacy/material_requisition/${params.toString() ? `?${params.toString()}` : ""}`
        const res = await apiFetchList<MaterialRequisition>(url, {
          page,
          pageSize,
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        setData(res)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar requisições.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, page, pageSize, safeRefreshToken])

  const items = useMemo(() => {
    const itemsRaw = data?.items ?? []
    if (!isPharmacy) return itemsRaw
    if (!onlyPending) return itemsRaw
    return itemsRaw.filter((x) => x.status === "PEN" || x.status === "PAR")
  }, [data?.items, isPharmacy, onlyPending])

  const totalItems = data?.meta.total ?? items.length
  const totalPages =
    data?.meta.totalPages ??
    (totalItems && pageSize ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1)

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title="Requisições de materiais"
          subtitle={isPharmacy ? "Solicitações criadas pelos outros setores para avio na farmácia." : "Requisições do seu setor ao almoxarifado/farmácia."}
          actions={
            canCreate ? (
              <Link
                href="/pharmacy/material-requests/new"
                className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
              >
                Criar requisição de materiais
              </Link>
            ) : null
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <Card title="Filtros" subtitle="Ajuste o que pretende ver.">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <span>Pesquisar</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, solicitante, setor, estado"
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1"
              />
            </label>

            {isPharmacy ? (
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                />
                Mostrar só pendentes/parciais
              </label>
            ) : null}

            <label className="inline-flex items-center gap-2">
              <span>Por página</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </Card>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          {loading ? (
            <div className="text-sm text-[var(--gray-500)]">Carregando…</div>
          ) : items.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[var(--gray-600)]">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Data/hora</th>
                    <th className="py-2 pr-3">Solicitante</th>
                    <th className="py-2 pr-3">Setor</th>
                    <th className="py-2 pr-3">Departamento</th>
                    <th className="py-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text)]">
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3">
                        <Link
                          href={`/pharmacy/material-requests/${r.id}`}
                          className="text-[var(--primary-700)] underline"
                        >
                          {r.custom_id || r.id}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{formatDt(r.created_at)}</td>
                      <td className="py-2 pr-3">{r.created_by_name || "—"}</td>
                      <td className="py-2 pr-3">{sectorLabel(r.sector)}</td>
                      <td className="py-2 pr-3">{r.requested_by_department || "—"}</td>
                      <td className="py-2 pr-3">{statusLabel(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-[var(--gray-600)]">Sem requisições.</div>
          )}

          <div className="mt-3 text-xs text-[var(--gray-500)]">Total: {totalItems}</div>
          <div className="mt-2">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
