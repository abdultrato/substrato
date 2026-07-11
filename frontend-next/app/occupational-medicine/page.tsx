"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FilePlus2, FlaskConical, HeartPulse, Pill, ScrollText, Search, Stethoscope, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import useDebounce from "@/hooks/useDebounce"
import { apiFetch, apiFetchList, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

const OCCUPATIONAL_PROVENANCE = "Medicina Ocupacional"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function HeaderStat({
  label, value, icon: Icon, chipClass,
}: { label: string; value: React.ReactNode; icon: React.ElementType; chipClass: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/30 bg-white/40 px-2 py-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${chipClass}`}>
        <Icon size={11} strokeWidth={2} />
      </span>
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="whitespace-nowrap text-sm font-bold leading-none text-foreground tabular-nums">{value}</span>
    </div>
  );
}

type PatientRow = Record<string, any>

export default function MedicinaOcupacionalPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [requisicoes, setRequisicoes] = useState<number>(0)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listErro, setListErro] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const reqs = await apiFetch<any>("/clinical/labrequest/", { clientCache: safeRefreshToken === 0 })
        if (!mounted) return
        setRequisicoes(extractTotalCount(reqs))
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace de medicina ocupacional."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  useEffect(() => {
    let mounted = true
    async function loadPatients() {
      try {
        setListLoading(true)
        setListErro(null)
        const res = await apiFetchList<PatientRow>("/clinical/patient/", {
          page,
          pageSize,
          query: {
            proveniencia: OCCUPATIONAL_PROVENANCE,
            ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
          },
          clientCache: safeRefreshToken === 0,
        })
        if (!mounted) return
        const items = Array.isArray(res?.items) ? res.items : []
        const total = res?.meta?.total ?? items.length
        const computedTotalPages =
          res?.meta?.totalPages ?? (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        setPatients(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setListErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar pacientes ocupacionais."))
      } finally {
        if (mounted) setListLoading(false)
      }
    }
    loadPatients()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, page, safeRefreshToken])

  const columns = useMemo(
    () => [
      { header: "ID", render: (r: PatientRow) => r.custom_id || r.id || "-" },
      {
        header: "Nome",
        render: (r: PatientRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="font-medium text-[var(--primary-700)] underline-offset-2 hover:underline"
          >
            {r.name || "-"}
          </Link>
        ),
      },
      { header: "Empresa", render: (r: PatientRow) => r.origin_company_name || "—" },
      { header: "Contacto", render: (r: PatientRow) => r.contact || "—" },
      { header: "Nascimento", render: (r: PatientRow) => r.birth_date || "—" },
      {
        header: "",
        render: (r: PatientRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
          >
            Abrir ficha
          </Link>
        ),
      },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="space-y-1.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <Stethoscope size={14} />
              </span>
              <h1 className="truncate text-sm font-bold leading-tight text-foreground">Medicina Ocupacional</h1>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <HeaderStat label="Pacientes" value={listLoading ? "..." : totalItems} icon={Users} chipClass="bg-violet-500/15 text-violet-600 dark:text-violet-400" />
              <HeaderStat label="Requisições" value={loading ? "..." : requisicoes} icon={FlaskConical} chipClass="bg-sky-500/15 text-sky-600 dark:text-sky-400" />
              <HeaderStat label="Procedimentos" value="—" icon={HeartPulse} chipClass="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
              <HeaderStat label="Medicação" value="—" icon={Pill} chipClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
            </div>

            {podeVerAdmin ? (
              <Link
                href="/admin/clinical/patient/?proveniencia__exact=Medicina+Ocupacional"
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                Abrir na Administração
              </Link>
            ) : null}
          </div>
        </section>

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <section className={`space-y-1.5 ${GLASS} p-2.5`}>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h2 className="text-xs font-semibold text-[var(--text)]">Pacientes de Medicina Ocupacional</h2>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="h-8 w-36 rounded-lg border border-border bg-background/60 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-52 focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
          </div>

          {listErro ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {listErro}
            </div>
          ) : null}

          {listLoading ? (
            <div className="py-6 text-center text-sm text-[var(--gray-500)]">Carregando...</div>
          ) : (
            <>
              <DataTable<PatientRow>
                columns={columns as any}
                data={patients}
                emptyMessage="Nenhum paciente de Medicina Ocupacional encontrado."
                searchable={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--gray-600)]">
                  Total: {totalItems} · Página {page} de {totalPages}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Criar requisição laboratorial"
            description="Solicitar análises laboratoriais."
            href="/requests/new"
            icon={FilePlus2}
          />
          <ActionTile
            title="Prontuário (Cardex)"
            description="Ver/registar cardex e prescrição."
            href="/medical-records"
            icon={ScrollText}
          />
          <ActionTile
            title="Procedimentos (Enfermagem)"
            description="Encaminhar para execução e registo de procedimentos."
            href="/nursing/procedures"
            icon={HeartPulse}
          />
          <ActionTile
            title="Almoxarifado/Farmácia"
            description="Solicitar materiais e acompanhar o estado de avio."
            href="/pharmacy/material-requests"
            icon={Pill}
          />
        </div>
      </div>
    </AppLayout>
  )
}
