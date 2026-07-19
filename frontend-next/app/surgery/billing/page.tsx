"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Loader2,
  Plus,
  Receipt,
  Search,
  Scissors,
  Tags,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, apiFetchList } from "@/lib/api"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type BillingItem = {
  id: number
  surgery?: number | string | null
  patient_name?: string
  status?: string
  billable?: boolean
  line_total?: string | number
  total_with_vat?: string | number
}

type SurgeryRow = {
  id: number
  patient?: number | string | null
  patient_name?: string
  custom_id?: string
}

type PatientGroup = {
  patientId: string
  patientName: string
  items: BillingItem[]
  surgeries: Set<string>
  invoiced: number
  pending: number
  total: number
  pendingTotal: number
  invoicedTotal: number
}

const ENDPOINT = "/surgery/faturacao/"
const ROUTE_BASE = "/surgery/billing"
const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "h-7 rounded-md border border-border bg-card/70 px-2 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtMoney(value: unknown): string {
  return `${num(value).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}

function groupText(group: PatientGroup): string {
  return [group.patientName, group.patientId, ...Array.from(group.surgeries)].join(" ").toLowerCase()
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-card/35 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[12px] font-semibold text-foreground">{value}</div>
    </div>
  )
}

function PatientCard({ group }: { group: PatientGroup }) {
  return (
    <Link href={`${ROUTE_BASE}/patient/${encodeURIComponent(group.patientId)}`} className="group block min-w-0">
      <article className={`${GLASS} relative min-w-0 overflow-hidden transition hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700/40`}>
        <span className="absolute left-0 top-0 h-full w-1 bg-violet-400 opacity-70 transition group-hover:opacity-100" />
        <div className="space-y-1.5 px-2 py-1.5 pl-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  {group.items.length} eventos
                </span>
                <span className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                  {group.pending} não faturados
                </span>
                <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {group.invoiced} faturados
                </span>
              </div>
              <h2 className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-foreground">
                {group.patientName}
              </h2>
            </div>
            <ChevronRight size={13} className="mt-1 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground md:grid-cols-4">
            <span className="truncate"><User size={10} className="mr-1 inline-block" />Paciente #{group.patientId}</span>
            <span className="truncate"><Scissors size={10} className="mr-1 inline-block" />{group.surgeries.size} cirurgia(s)</span>
            <span className="truncate"><Receipt size={10} className="mr-1 inline-block" />Faturado {fmtMoney(group.invoicedTotal)}</span>
            <span className="truncate"><CircleDollarSign size={10} className="mr-1 inline-block" />Pendente {fmtMoney(group.pendingTotal)}</span>
          </div>

          <div className="flex items-center gap-1 border-t border-border/50 pt-1">
            <span className="text-[10px] text-muted-foreground">Total do paciente</span>
            <span className="ml-auto text-[12px] font-bold text-foreground">{fmtMoney(group.total)}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function SurgeryBillingListPage() {
  const [items, setItems] = useState<BillingItem[]>([])
  const [surgeries, setSurgeries] = useState<Record<string, SurgeryRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState("ALL")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items: nextItems } = await apiFetchList<BillingItem>(ENDPOINT, { pageSize: 500 })
      const surgeryIds = Array.from(new Set(nextItems.map((item) => String(item.surgery || "")).filter(Boolean)))
      const surgeryPairs = await Promise.all(
        surgeryIds.map(async (surgeryId) => {
          const row = await apiFetch<SurgeryRow>(`/surgery/surgery/${surgeryId}/`).catch(() => null)
          return [surgeryId, row] as const
        })
      )
      setItems(nextItems)
      setSurgeries(Object.fromEntries(surgeryPairs.filter(([, row]) => Boolean(row))) as Record<string, SurgeryRow>)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar faturação cirúrgica.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 30000)
    return () => window.clearInterval(timer)
  }, [load])

  const groups = useMemo(() => {
    const map = new Map<string, PatientGroup>()
    for (const item of items) {
      const surgery = surgeries[String(item.surgery || "")]
      const patientId = String(surgery?.patient || item.patient_name || "sem-paciente")
      const patientName = surgery?.patient_name || item.patient_name || "Paciente não identificado"
      const current = map.get(patientId) || {
        patientId,
        patientName,
        items: [],
        surgeries: new Set<string>(),
        invoiced: 0,
        pending: 0,
        total: 0,
        pendingTotal: 0,
        invoicedTotal: 0,
      }
      const value = num(item.total_with_vat || item.line_total)
      const isInvoiced = item.status === "INVOICED"
      current.items.push(item)
      if (surgery?.custom_id) current.surgeries.add(surgery.custom_id)
      else if (item.surgery) current.surgeries.add(`#${item.surgery}`)
      current.total += value
      if (isInvoiced) {
        current.invoiced += 1
        current.invoicedTotal += value
      } else if (item.billable !== false) {
        current.pending += 1
        current.pendingTotal += value
      }
      map.set(patientId, current)
    }
    return Array.from(map.values()).sort((a, b) => b.pendingTotal - a.pendingTotal || a.patientName.localeCompare(b.patientName))
  }, [items, surgeries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((group) => {
      if (scope === "PENDING" && group.pending === 0) return false
      if (scope === "INVOICED" && group.invoiced === 0) return false
      if (q && !groupText(group).includes(q)) return false
      return true
    })
  }, [groups, scope, search])

  const metrics = useMemo(() => ({
    patients: groups.length,
    events: items.length,
    pending: groups.reduce((sum, group) => sum + group.pending, 0),
    invoiced: groups.reduce((sum, group) => sum + group.invoiced, 0),
    pendingTotal: groups.reduce((sum, group) => sum + group.pendingTotal, 0),
  }), [groups, items.length])

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">
        <section className={`relative z-30 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-1 px-2 py-1.5 pl-3">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Faturação por paciente</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <h1 className="font-display text-[14px] font-semibold leading-tight text-foreground">
                    Pacientes com eventos cirúrgicos
                  </h1>
                  <span className="rounded-full border border-violet-300/70 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                    {filtered.length} de {groups.length} pacientes
                  </span>
                  <span className="rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                    {fmtMoney(metrics.pendingTotal)} por faturar
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Link href="/surgery" className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href={`${ROUTE_BASE}/new`} className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <Plus size={11} /> Novo evento
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
              <Metric label="Pacientes" value={String(metrics.patients)} icon={<User size={11} />} />
              <Metric label="Eventos" value={String(metrics.events)} icon={<Tags size={11} />} />
              <Metric label="Não faturados" value={String(metrics.pending)} icon={<CircleDollarSign size={11} />} />
              <Metric label="Faturados" value={String(metrics.invoiced)} icon={<Receipt size={11} />} />
              <Metric label="Pendente" value={fmtMoney(metrics.pendingTotal)} icon={<Banknote size={11} />} />
            </div>

            <div className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_180px]">
              <label className="relative min-w-0">
                <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar paciente, número ou cirurgia..."
                  className={`${INPUT} w-full pl-7`}
                />
              </label>
              <select value={scope} onChange={(event) => setScope(event.target.value)} className={`${INPUT} w-full`}>
                <option value="ALL">Todos pacientes</option>
                <option value="PENDING">Com não faturados</option>
                <option value="INVOICED">Com faturados</option>
              </select>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={13} className="mr-1 inline-block" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Carregando pacientes...
          </div>
        ) : filtered.length ? (
          <section className="grid grid-cols-1 gap-1 xl:grid-cols-2">
            {filtered.map((group) => <PatientCard key={group.patientId} group={group} />)}
          </section>
        ) : (
          <section className={`${GLASS} px-3 py-6 text-center text-[12px] text-muted-foreground`}>
            <Filter size={16} className="mx-auto mb-1" />
            Nenhum paciente encontrado para os filtros atuais.
          </section>
        )}
      </div>
    </AppLayout>
  )
}
