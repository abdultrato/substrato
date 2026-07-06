"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeftRight,
  CalendarDays,
  Droplet,
  HeartPulse,
  Layers,
  Loader2,
  Package,
  Search,
  Settings,
  Shield,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import useDebounce from "@/hooks/useDebounce"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type DonorRow = Record<string, unknown>
type DonationRow = Record<string, unknown>

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

const TILES = [
  { key: "storage",            label: "Armazenamentos", Icon: Package,      href: "/bloodbank/blood-storages/",             accent: "from-cyan-500 to-sky-600",      bar: "bg-cyan-500",    icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"    },
  { key: "donation",           label: "Doações",         Icon: Droplet,      href: "/bloodbank/blood-donations/",            accent: "from-rose-500 to-pink-600",     bar: "bg-rose-500",    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300"    },
  { key: "storage_maintenance",label: "Manutenções",     Icon: Settings,     href: "/bloodbank/blood-storage-maintenances/", accent: "from-violet-500 to-purple-600", bar: "bg-violet-500",  icon: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  { key: "stock_movement",     label: "Movimentos",      Icon: ArrowLeftRight,href: "/bloodbank/blood-stock-movements/",     accent: "from-amber-500 to-orange-600",  bar: "bg-amber-500",   icon: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  { key: "transfusion",        label: "Transfusões",     Icon: HeartPulse,   href: "/bloodbank/blood-transfusions/",         accent: "from-pink-500 to-rose-600",     bar: "bg-pink-500",    icon: "bg-pink-500/15 text-pink-600 dark:text-pink-300"    },
  { key: "unit",               label: "Unidades",        Icon: Layers,       href: "/bloodbank/blood-units/",                accent: "from-red-500 to-rose-600",      bar: "bg-red-500",     icon: "bg-red-500/15 text-red-600 dark:text-red-300"       },
]

const DONOR_ACCENTS = [
  { bar: "from-rose-500 via-fuchsia-500 to-pink-500",    chip: "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-900/20 dark:text-rose-300",     halo: "bg-rose-500/10"    },
  { bar: "from-cyan-500 via-sky-500 to-blue-500",        chip: "border-cyan-200/70 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-900/20 dark:text-cyan-300",     halo: "bg-cyan-500/10"    },
  { bar: "from-amber-500 via-orange-500 to-rose-500",    chip: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-900/20 dark:text-amber-300", halo: "bg-amber-500/10" },
  { bar: "from-emerald-500 via-teal-500 to-cyan-500",    chip: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-900/20 dark:text-emerald-300", halo: "bg-emerald-500/10" },
  { bar: "from-violet-500 via-purple-500 to-fuchsia-500",chip: "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-900/20 dark:text-violet-300", halo: "bg-violet-500/10" },
  { bar: "from-indigo-500 via-blue-500 to-sky-500",      chip: "border-indigo-200/70 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-900/20 dark:text-indigo-300", halo: "bg-indigo-500/10" },
]

function bloodTypeLabel(v: unknown) {
  const s = String(v || "").trim()
  return !s || s === "UNK" ? "—" : s
}

function fmtDate(v?: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
}

function toDateVal(v?: string | null) {
  if (!v) return ""
  const d = new Date(v)
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

function ageLabel(v?: string | null) {
  if (!v) return "—"
  const b = new Date(v)
  if (isNaN(b.getTime())) return "—"
  const t = new Date()
  let age = t.getFullYear() - b.getFullYear()
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--
  return `${age} anos`
}

export default function BloodBankPage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const canAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [search, setSearch]                       = useState("")
  const [bloodTypeFilter, setBloodTypeFilter]     = useState("")
  const [dateFilter, setDateFilter]               = useState("")
  const [donors, setDonors]                       = useState<DonorRow[]>([])
  const [donationMap, setDonationMap]             = useState<Record<string, DonationRow | null>>({})
  const [listLoading, setListLoading]             = useState(true)
  const [listError, setListError]                 = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 250)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        setListLoading(true); setListError(null)
        const [patientsRes, donationsRes] = await Promise.all([
          apiFetch<{ results?: DonorRow[] }>("/clinical/patient/?is_blood_donor=true&page_size=200&ordering=name", { clientCache: safeRefreshToken === 0 }),
          apiFetch<{ results?: DonationRow[] }>("/blood-donations/?page_size=400&ordering=-collected_at", { clientCache: safeRefreshToken === 0 }),
        ])
        if (!mounted) return
        const donorItems = Array.isArray(patientsRes?.results) ? patientsRes.results : []
        const donationItems = Array.isArray(donationsRes?.results) ? donationsRes.results : []
        const map: Record<string, DonationRow | null> = {}
        for (const d of donationItems) {
          const did = String((d as Record<string, unknown>)?.donor_id ?? (d as Record<string, unknown>)?.donor ?? "")
          if (did && !map[did]) map[did] = d
        }
        setDonors(donorItems); setDonationMap(map)
      } catch (e: unknown) {
        if (!mounted) return
        setListError((e as { message?: string })?.message || "Falha ao carregar doadores.")
      } finally {
        if (mounted) setListLoading(false)
      }
    }
    loadData()
    return () => { mounted = false }
  }, [safeRefreshToken])

  const filteredDonors = useMemo(() => donors.filter((donor) => {
    const d = donor as Record<string, unknown>
    const latestDonation = donationMap[String(d.id)] as Record<string, unknown> | null
    const text = [d.custom_id, d.id, d.name, d.contact, d.email, d.document_number].filter(Boolean).join(" ").toLowerCase()
    const searchOk = !debouncedSearch.trim() || text.includes(debouncedSearch.trim().toLowerCase())
    const btOk = !bloodTypeFilter || String(d.blood_type || "") === bloodTypeFilter
    const dateOk = !dateFilter || toDateVal(String(latestDonation?.collected_at ?? latestDonation?.created_at ?? "")) === dateFilter
    return searchOk && btOk && dateOk
  }), [bloodTypeFilter, debouncedSearch, donationMap, donors, dateFilter])

  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute bottom-0 right-1/3 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-red-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/20">
              <Droplet size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Hemoterapia / Gestão operacional</div>
              <h1 className="text-base font-bold leading-tight text-foreground">Banco de Sangue</h1>
            </div>
            {canAdmin && (
              <Link href="/admin/bloodbank/"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <Shield size={13} /> Administração
              </Link>
            )}
          </div>

          {/* Filtros no cabeçalho */}
          <div className="border-t border-white/20 px-4 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por nome, código, contacto ou documento…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 dark:border-white/10 dark:bg-white/5" />
              </div>
              <select value={bloodTypeFilter} onChange={(e) => setBloodTypeFilter(e.target.value)}
                className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-4 text-xs text-foreground outline-none transition focus:border-rose-400">
                <option value="">Todos os grupos</option>
                {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-foreground outline-none" />
              </label>
            </div>
          </div>
        </div>

        {/* ── Tiles (uma linha, nowrap) ────────────────────────── */}
        <div className="grid grid-cols-6 gap-2">
          {TILES.map(({ key, label, Icon, href, bar, icon }) => (
            <Link key={key} href={href}
              className="group relative flex h-[68px] items-center gap-2.5 overflow-hidden rounded-xl border border-white/20 bg-white/25 px-3 shadow-sm backdrop-blur-sm transition hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${icon}`}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 text-xs font-semibold leading-tight text-foreground">{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Doadores ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 to-pink-600" />
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 pl-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-semibold text-foreground">Doadores de sangue</h2>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                {filteredDonors.length}
              </span>
            </div>
          </div>

          <div className="p-2">
            {listError && (
              <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {listError}
              </div>
            )}

            {listLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
                Nenhum doador encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDonors.map((donorRaw, index) => {
                  const donor = donorRaw as Record<string, unknown>
                  const latestDonation = donationMap[String(donor.id)] as Record<string, unknown> | null
                  const acc = DONOR_ACCENTS[index % DONOR_ACCENTS.length]
                  return (
                    <Link key={String(donor.id)} href={`/bloodbank/donors/${donor.id}`}
                      className="group relative block overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                      <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${acc.bar}`} />
                      <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl ${acc.halo}`} />

                      <div className="relative space-y-1.5 px-3 py-2.5 pl-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-muted-foreground">{String(donor.custom_id || `#${donor.id}`)}</p>
                            <p className="truncate text-[12px] font-semibold leading-tight text-foreground">{String(donor.name || "—")}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${acc.chip}`}>
                            {bloodTypeLabel(donor.blood_type)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                          <span className="truncate">{String(donor.contact || donor.email || "—")}</span>
                          <span className="ml-2 shrink-0">{ageLabel(donor.birth_date as string)}</span>
                        </div>

                        <div className="text-[10px] text-muted-foreground">
                          <span className="text-foreground/60">Última doação: </span>
                          <span className="font-medium text-foreground">
                            {fmtDate(String(latestDonation?.collected_at ?? latestDonation?.created_at ?? ""))}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
