"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  Droplet,
  Shield,
  Package,
  Settings,
  ArrowLeftRight,
  Layers,
  HeartPulse,
  type LucideIcon,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
import PageHeader from "@/components/ui/PageHeader"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import useDebounce from "@/hooks/useDebounce"
import { useAuth } from "@/hooks/useAuth"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { findModuleGroup } from "@/lib/modules"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type DonorRow = Record<string, any>

function bloodTypeLabel(value: any): string {
  const v = String(value || "").trim()
  return !v || v === "UNK" ? "—" : v
}

export default function BloodBankPage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { modules } = useModulesCatalog()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const group = findModuleGroup("bloodbank", modules)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [donors, setDonors] = useState<DonorRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listErro, setListErro] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    let mounted = true
    async function loadDonors() {
      try {
        setListLoading(true)
        setListErro(null)
        const res = await apiFetchList<DonorRow>("/clinical/patient/", {
          page,
          pageSize,
          query: {
            is_blood_donor: true,
            ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
          },
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        const items = Array.isArray(res?.items) ? res.items : []
        const total = res?.meta?.total ?? items.length
        const computedTotalPages =
          res?.meta?.totalPages ?? (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        setDonors(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setListErro(e?.message || "Falha ao carregar doadores de sangue.")
      } finally {
        if (mounted) setListLoading(false)
      }
    }
    loadDonors()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, page, safeRefreshToken])

  const donorColumns = useMemo(
    () => [
      { header: "ID", render: (r: DonorRow) => r.custom_id || r.id || "-" },
      {
        header: "Nome",
        render: (r: DonorRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="font-medium text-[var(--primary-700)] underline-offset-2 hover:underline"
          >
            {r.name || "-"}
          </Link>
        ),
      },
      { header: "Tipo sanguíneo", render: (r: DonorRow) => bloodTypeLabel(r.blood_type) },
      { header: "Contacto", render: (r: DonorRow) => r.contact || "—" },
      {
        header: "",
        render: (r: DonorRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir ficha
          </Link>
        ),
      },
    ],
    []
  )

  if (loading) return null

  const tiles: Record<string, { icon: LucideIcon }> = {
    donation: { icon: Droplet },
    unit: { icon: Layers },
    transfusion: { icon: HeartPulse },
    storage: { icon: Package },
    stock_movement: { icon: ArrowLeftRight },
    storage_maintenance: { icon: Settings },
  }

  const eventCreateLinks = [
    {
      key: "stock_movement",
      label: "Criar movimento de sangue",
      href: "/bloodbank/blood-stock-movements/new",
      description: "Entrada, saida, transferencia, reserva, liberacao, descarte e ajustes.",
    },
    {
      key: "transfusion",
      label: "Criar transfusão",
      href: "/bloodbank/blood-transfusions/new",
      description: "Solicitacao e execucao de transfusao com validacoes clinicas.",
    },
    {
      key: "storage_maintenance",
      label: "Criar manutenção",
      href: "/bloodbank/blood-storage-maintenances/new",
      description: "Plano preventivo/corretivo e registo de execucao tecnica.",
    },
  ]

  const resourceRoutes: Record<string, string> = {
    donation: "/bloodbank/blood-donations",
    unit: "/bloodbank/blood-units",
    transfusion: "/bloodbank/blood-transfusions",
    storage: "/bloodbank/blood-storages",
    stock_movement: "/bloodbank/blood-stock-movements",
    storage_maintenance: "/bloodbank/blood-storage-maintenances",
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title="Banco de Sangue"
          actions={
            canViewAdmin ? (
              <Link
                href="/admin/bloodbank/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Shield size={16} />
                Abrir na administração
              </Link>
            ) : null
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {group?.resources?.length ? (
            group.resources.map((resource) => (
              <ActionTile
                key={resource.key}
                title={resource.label}
                href={resourceRoutes[resource.key] || "/bloodbank"}
                icon={tiles[resource.key]?.icon || Droplet}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Catálogo do módulo não encontrado. Contacte o administrador do sistema.
            </div>
          )}
        </div>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Droplet size={16} className="text-rose-500" />
              Doadores de sangue
            </h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou ID"
              className="w-64 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </div>

          {listErro ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {listErro}
            </div>
          ) : null}

          {listLoading ? (
            <div className="py-6 text-center text-sm text-slate-500">Carregando...</div>
          ) : (
            <>
              <DataTable<DonorRow>
                columns={donorColumns as any}
                data={donors}
                emptyMessage="Nenhum doador de sangue registado."
                searchable={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Total: {totalItems} · Página {page} de {totalPages}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Criacao de Eventos</h2>
          <p className="mt-1 text-xs text-slate-600">
            Use os atalhos abaixo para criar eventos operacionais do banco de sangue no frontend.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {eventCreateLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:font-semibold"
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs text-slate-600">{item.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
