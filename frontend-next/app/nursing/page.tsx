"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import {
  ClipboardList,
  Droplets,
  HeartPulse,
  PackageSearch,
  BedDouble,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"
import { useLanguage } from "@/hooks/useLanguage"

function HeaderStat({
  label,
  value,
  href,
  icon: Icon,
  chipClass,
}: {
  label: string
  value: ReactNode
  href: string
  icon: any
  chipClass: string
}) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-white/30 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-sm transition hover:border-emerald-400/60 hover:bg-white/60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${chipClass}`}>
        <Icon size={14} strokeWidth={2} />
      </span>
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-lg font-bold leading-none text-foreground tabular-nums">{value}</span>
    </Link>
  )
}

export default function NursingPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingRequests, setPendingRequests] = useState<number>(0)
  const [procedures, setProcedures] = useState<number>(0)
  const [collections, setCollections] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const [requests, procedureResponse, collectionResponse] = await Promise.all([
          apiFetch<any>("/requests/?type=LAB&status=pendente", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/nursing/procedure/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/labrequest/?validada=true&type=LAB&status=pendente", {
            clientCache: safeRefreshToken === 0,
          }),
        ])

        if (!mounted) return
        setPendingRequests(extractTotalCount(requests))
        setProcedures(extractTotalCount(procedureResponse))
        setCollections(extractTotalCount(collectionResponse))
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || t("Falha ao carregar o workspace de enfermagem.", "Failed to load the nursing workspace.")),
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-emerald-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-emerald-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <HeartPulse size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground">{t("Enfermagem", "Nursing")}</h1>
              <p className="text-[11px] text-muted-foreground">
                {t("Execução: coletas, procedimentos e registos.", "Execution: sample collection, procedures, and records.")}
              </p>
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <HeaderStat
              label={t("Requisições pendentes", "Pending requests")}
              value={loading ? "..." : pendingRequests}
              href="/nursing/requests"
              icon={ClipboardList}
              chipClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            />
            <HeaderStat
              label={t("Procedimentos", "Procedures")}
              value={loading ? "..." : procedures}
              href="/nursing/procedures"
              icon={HeartPulse}
              chipClass="bg-violet-500/15 text-violet-600 dark:text-violet-400"
            />
            <HeaderStat
              label={t("Coletas", "Sample collections")}
              value={loading ? "..." : collections}
              href="/nursing/colheitas"
              icon={Droplets}
              chipClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title={t("Requisições", "Requests")}
            description={t("Visualize as requisições pendentes e o que precisa ser executado.", "View pending requests and what still needs execution.")}
            href="/nursing/requests"
            icon={ClipboardList}
          />
          <ActionTile
            title={t("Procedimentos", "Procedures")}
            description={t("Registos e execução de procedimentos de enfermagem.", "Nursing procedure records and execution.")}
            href="/nursing/procedures"
            icon={HeartPulse}
          />
          <ActionTile
            title={t("Enfermaria", "Ward")}
            description={t("Painel de camas e internamentos.", "Dashboard for beds and admissions.")}
            href="/nursing/ward"
            icon={BedDouble}
          />
          <ActionTile
            title={t("Criar requisição de materiais", "Create material request")}
            description={t(
              "Abrir o formulário para solicitar materiais ao almoxarifado/farmácia.",
              "Open the form to request supplies from warehouse/pharmacy.",
            )}
            href="/pharmacy/material-requests/new"
            icon={PackageSearch}
          />
        </div>
      </div>
    </AppLayout>
  )
}
