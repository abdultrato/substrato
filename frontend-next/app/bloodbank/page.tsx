"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeftRight,
  CalendarDays,
  Droplet,
  HeartPulse,
  Layers,
  Package,
  Search,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import useDebounce from "@/hooks/useDebounce"
import { useAuth } from "@/hooks/useAuth"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { findModuleGroup } from "@/lib/modules"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type DonorRow = Record<string, any>
type DonationRow = Record<string, any>
type TileStyle = { icon: LucideIcon; accentClass: string; iconClass: string; href: string }

const GLASS_CARD =
  "relative overflow-hidden rounded-xl border border-white/20 bg-white/28 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]"

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

function bloodTypeLabel(value: any): string {
  const v = String(value || "").trim()
  return !v || v === "UNK" ? "—" : v
}

function fmtDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
}

function toDateInputValue(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function ageLabel(value?: string | null): string {
  if (!value) return "—"
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return "—"
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return `${age} anos`
}

function donorAccent(index: number): { bar: string; chip: string; halo: string } {
  const tones = [
    {
      bar: "from-rose-500 via-fuchsia-500 to-pink-500",
      chip: "border-rose-200/70 bg-rose-500/15 text-rose-700 dark:border-rose-400/20 dark:text-rose-300",
      halo: "bg-rose-500/10",
    },
    {
      bar: "from-cyan-500 via-sky-500 to-blue-500",
      chip: "border-cyan-200/70 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-300",
      halo: "bg-cyan-500/10",
    },
    {
      bar: "from-amber-500 via-orange-500 to-rose-500",
      chip: "border-amber-200/70 bg-amber-500/15 text-amber-700 dark:border-amber-400/20 dark:text-amber-300",
      halo: "bg-amber-500/10",
    },
    {
      bar: "from-emerald-500 via-teal-500 to-cyan-500",
      chip: "border-emerald-200/70 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300",
      halo: "bg-emerald-500/10",
    },
  ]
  return tones[index % tones.length]
}

export default function BloodBankPage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { modules } = useModulesCatalog()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const group = findModuleGroup("bloodbank", modules)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [search, setSearch] = useState("")
  const [bloodTypeFilter, setBloodTypeFilter] = useState("")
  const [lastDonationDateFilter, setLastDonationDateFilter] = useState("")
  const [donors, setDonors] = useState<DonorRow[]>([])
  const [donationMap, setDonationMap] = useState<Record<string, DonationRow | null>>({})
  const [listLoading, setListLoading] = useState(true)
  const [listErro, setListErro] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        setListLoading(true)
        setListErro(null)

        const [patientsRes, donationsRes] = await Promise.all([
          apiFetch<{ results?: DonorRow[]; count?: number }>("/clinical/patient/?is_blood_donor=true&page_size=200&ordering=name", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<{ results?: DonationRow[] }>("/blood-donations/?page_size=400&ordering=-collected_at", {
            clientCache: safeRefreshToken === 0,
          }),
        ])

        if (!mounted) return

        const donorItems = Array.isArray(patientsRes?.results) ? patientsRes.results : []
        const donationItems = Array.isArray(donationsRes?.results) ? donationsRes.results : []
        const latestDonationByDonor: Record<string, DonationRow | null> = {}

        for (const donation of donationItems) {
          const donorId =
            donation?.donor_id ??
            donation?.donor?.id ??
            donation?.donor_pk ??
            donation?.donor
          if (!donorId) continue
          const key = String(donorId)
          if (!latestDonationByDonor[key]) latestDonationByDonor[key] = donation
        }

        setDonors(donorItems)
        setDonationMap(latestDonationByDonor)
      } catch (e: any) {
        if (!mounted) return
        setListErro(e?.message || "Falha ao carregar doadores de sangue.")
      } finally {
        if (mounted) setListLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const latestDonation = donationMap[String(donor.id)]
      const donorText = [
        donor.custom_id,
        donor.id,
        donor.name,
        donor.contact,
        donor.email,
        donor.document_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const searchOk = !debouncedSearch.trim() || donorText.includes(debouncedSearch.trim().toLowerCase())
      const bloodTypeOk = !bloodTypeFilter || String(donor.blood_type || "") === bloodTypeFilter
      const latestDateOk =
        !lastDonationDateFilter ||
        toDateInputValue(latestDonation?.collected_at || latestDonation?.created_at || null) === lastDonationDateFilter

      return searchOk && bloodTypeOk && latestDateOk
    })
  }, [bloodTypeFilter, debouncedSearch, donationMap, donors, lastDonationDateFilter])

  const tiles: Record<string, TileStyle> = {
    storage: {
      icon: Package,
      accentClass: "border-l-cyan-500",
      iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
      href: "/bloodbank/blood-storages/",
    },
    donation: {
      icon: Droplet,
      accentClass: "border-l-rose-500",
      iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
      href: "/bloodbank/blood-donations/",
    },
    storage_maintenance: {
      icon: Settings,
      accentClass: "border-l-violet-500",
      iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
      href: "/bloodbank/blood-storage-maintenances/",
    },
    stock_movement: {
      icon: ArrowLeftRight,
      accentClass: "border-l-amber-500",
      iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      href: "/bloodbank/blood-stock-movements/",
    },
    transfusion: {
      icon: HeartPulse,
      accentClass: "border-l-pink-500",
      iconClass: "bg-pink-500/15 text-pink-600 dark:text-pink-300",
      href: "/bloodbank/blood-transfusions/",
    },
    unit: {
      icon: Layers,
      accentClass: "border-l-red-500",
      iconClass: "bg-red-500/15 text-red-600 dark:text-red-300",
      href: "/bloodbank/blood-units/",
    },
  }

  const tileEntries = [
    { key: "storage", label: "Armazenamentos" },
    { key: "donation", label: "Doações" },
    { key: "storage_maintenance", label: "Manutenções" },
    { key: "stock_movement", label: "Movimentos" },
    { key: "transfusion", label: "Transfusões" },
    { key: "unit", label: "Unidades" },
  ]

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto flex w-[98vw] max-w-[98vw] flex-col gap-3 overflow-x-hidden px-2 pb-3">
        <section className={GLASS_CARD}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute left-12 top-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-10 right-20 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-red-500 to-cyan-600" />

          <div className="relative flex flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/20">
                <Droplet size={22} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">Hemoterapia / Gestão operacional</div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Banco de Sangue</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg border border-white/20 bg-white/20 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                  {group?.resources?.length || tileEntries.length} áreas operacionais
                </div>
                {canViewAdmin ? (
                  <Link
                    href="/admin/bloodbank/"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/35 px-3 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/[0.05]"
                  >
                    <Shield size={16} />
                    Abrir na administração
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar doador por nome, código, contacto ou documento..."
                  className="h-10 w-full rounded-xl border border-white/30 bg-white/50 py-2 pl-9 pr-3 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 dark:border-white/10 dark:bg-white/[0.08]"
                />
              </div>
              <select
                value={bloodTypeFilter}
                onChange={(e) => setBloodTypeFilter(e.target.value)}
                className="h-10 min-w-[150px] rounded-xl border border-white/30 bg-white/50 px-3 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-white/[0.08]"
              >
                <option value="">Todos os grupos</option>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <label className="flex h-10 min-w-[190px] items-center gap-2 rounded-xl border border-white/30 bg-white/50 px-3 text-sm text-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.08]">
                <CalendarDays size={14} className="text-muted-foreground" />
                <input
                  type="date"
                  value={lastDonationDateFilter}
                  onChange={(e) => setLastDonationDateFilter(e.target.value)}
                  className="w-full bg-transparent outline-none"
                />
              </label>
            </div>
          </div>
        </section>

        <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tileEntries.map((item) => {
            const tile = tiles[item.key]
            const Icon = tile.icon
            return (
              <Link
                key={item.key}
                href={tile.href}
                className={`group flex h-[74px] min-w-[154px] flex-1 flex-nowrap items-center gap-2 overflow-hidden rounded-xl border-t border-r border-b border-white/20 ${tile.accentClass} border-l-4 bg-white/25 px-3 py-2 shadow-sm backdrop-blur-sm transition hover:bg-white/40 dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 dark:bg-white/[0.05]`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile.iconClass}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 text-sm font-semibold text-foreground whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <section className={`${GLASS_CARD} p-3`}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-6 top-8 h-20 w-20 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute right-4 top-6 h-16 w-16 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />
          </div>
          <div className="relative mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Doadores de sangue</h2>
              <p className="text-[11px] text-muted-foreground">{filteredDonors.length} registos visíveis</p>
            </div>
          </div>

          {listErro ? (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/85 px-3 py-2 text-sm text-amber-800 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              {listErro}
            </div>
          ) : null}

          {listLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">Carregando...</div>
          ) : filteredDonors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/18 px-4 py-10 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
              Nenhum doador encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="columns-1 gap-2 sm:columns-2 xl:columns-3 2xl:columns-4 [column-fill:_balance]">
              {filteredDonors.map((donor, index) => {
                const latestDonation = donationMap[String(donor.id)]
                const accent = donorAccent(index)
                return (
                  <Link
                    key={donor.id}
                    href={`/bloodbank/donors/${donor.id}`}
                    className="group relative mb-2 block break-inside-avoid overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-white/35 hover:bg-white/38 hover:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent.bar}`} />
                    <div className={`pointer-events-none absolute -right-6 top-0 h-20 w-20 rounded-full blur-2xl ${accent.halo}`} />

                    <div className="relative flex flex-col gap-3 px-4 py-3 pl-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                            {donor.custom_id || `#${donor.id}`}
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-foreground">{donor.name || "—"}</h3>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${accent.chip}`}>
                          {bloodTypeLabel(donor.blood_type)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div className="rounded-lg border border-white/20 bg-white/22 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Contacto</div>
                          <div className="mt-0.5 truncate text-sm font-medium text-foreground">{donor.contact || donor.email || "—"}</div>
                        </div>
                        <div className="rounded-lg border border-white/20 bg-white/22 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Idade</div>
                          <div className="mt-0.5 text-sm font-medium text-foreground">{ageLabel(donor.birth_date)}</div>
                        </div>
                        <div className="rounded-lg border border-white/20 bg-white/22 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Última doação</div>
                          <div className="mt-0.5 text-sm font-medium text-foreground">
                            {fmtDate(latestDonation?.collected_at || latestDonation?.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
