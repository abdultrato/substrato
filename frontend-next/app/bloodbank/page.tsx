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
  Search,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
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
type TileStyle = { icon: LucideIcon; accentClass: string; iconClass: string }

const GLASS_CARD =
  "relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

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

  const tiles: Record<string, TileStyle> = {
    donation: {
      icon: Droplet,
      accentClass: "border-l-rose-500",
      iconClass: "bg-rose-500/15 text-rose-600 group-hover:bg-rose-500/20 group-hover:text-rose-700 dark:text-rose-300",
    },
    unit: {
      icon: Layers,
      accentClass: "border-l-red-500",
      iconClass: "bg-red-500/15 text-red-600 group-hover:bg-red-500/20 group-hover:text-red-700 dark:text-red-300",
    },
    transfusion: {
      icon: HeartPulse,
      accentClass: "border-l-pink-500",
      iconClass: "bg-pink-500/15 text-pink-600 group-hover:bg-pink-500/20 group-hover:text-pink-700 dark:text-pink-300",
    },
    storage: {
      icon: Package,
      accentClass: "border-l-cyan-500",
      iconClass: "bg-cyan-500/15 text-cyan-600 group-hover:bg-cyan-500/20 group-hover:text-cyan-700 dark:text-cyan-300",
    },
    stock_movement: {
      icon: ArrowLeftRight,
      accentClass: "border-l-amber-500",
      iconClass: "bg-amber-500/15 text-amber-600 group-hover:bg-amber-500/20 group-hover:text-amber-700 dark:text-amber-300",
    },
    storage_maintenance: {
      icon: Settings,
      accentClass: "border-l-violet-500",
      iconClass: "bg-violet-500/15 text-violet-600 group-hover:bg-violet-500/20 group-hover:text-violet-700 dark:text-violet-300",
    },
  }

  const eventCreateLinks = [
    {
      key: "stock_movement",
      label: "Criar movimento de sangue",
      href: "/bloodbank/blood-stock-movements/new",
      description: "Entrada, saída, transferência, reserva, liberação, descarte e ajustes.",
    },
    {
      key: "transfusion",
      label: "Criar transfusão",
      href: "/bloodbank/blood-transfusions/new",
      description: "Solicitação e execução de transfusão com validações clínicas.",
    },
    {
      key: "storage_maintenance",
      label: "Criar manutenção",
      href: "/bloodbank/blood-storage-maintenances/new",
      description: "Plano preventivo/corretivo e registo de execução técnica.",
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
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute left-12 top-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-10 right-20 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-red-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/20">
              <Droplet size={22} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Hemoterapia / Gestão operacional</div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Banco de Sangue</h1>
              <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
                Acompanhe doadores, unidades, transfusões, armazenamento e eventos críticos do ciclo hemoterápico.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg border border-white/20 bg-white/20 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                {group?.resources?.length || 0} áreas operacionais
              </div>
              {canViewAdmin ? (
                <Link
                  href="/admin/bloodbank/"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/35 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/[0.05]"
                >
                  <Shield size={16} />
                  Abrir na administração
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {group?.resources?.length ? (
            group.resources.map((resource) => (
              <ActionTile
                key={resource.key}
                title={resource.label}
                href={resourceRoutes[resource.key] || "/bloodbank"}
                icon={tiles[resource.key]?.icon || Droplet}
                accentClass={tiles[resource.key]?.accentClass}
                iconClass={tiles[resource.key]?.iconClass}
              />
            ))
          ) : (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 shadow-sm backdrop-blur-sm">
              Catálogo do módulo não encontrado. Contacte o administrador do sistema.
            </div>
          )}
        </div>

        <section className={`${GLASS_CARD} space-y-2 p-3`}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-10 left-12 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="relative flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Droplet size={16} className="text-rose-500" />
              Doadores de sangue
            </h2>
            <div className="relative w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-lg border border-white/30 bg-white/45 py-1.5 pl-7 pr-6 text-xs text-foreground shadow-sm backdrop-blur-sm placeholder:text-muted-foreground transition-all focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 dark:border-white/10 dark:bg-white/[0.08]"
              />
            </div>
          </div>

          {listErro ? (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/85 px-3 py-2 text-sm text-amber-800 shadow-sm backdrop-blur-sm">
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

        <div className={`${GLASS_CARD} p-3`}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-8 top-0 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute right-10 bottom-0 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          </div>
          <h2 className="relative text-sm font-semibold text-slate-900">Criação de Eventos</h2>
          <p className="relative mt-1 text-xs text-slate-600">
            Use os atalhos abaixo para criar eventos operacionais do banco de sangue no frontend.
          </p>

          <div className="relative mt-2 grid gap-2 md:grid-cols-3">
            {eventCreateLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block rounded-xl border border-white/20 bg-white/35 p-2.5 text-slate-800 shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/55 dark:border-white/10 dark:bg-white/[0.05]"
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
