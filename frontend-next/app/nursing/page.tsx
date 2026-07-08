"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ClipboardList,
  Droplets,
  HeartPulse,
  PackageSearch,
  BedDouble,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { useLanguage } from "@/hooks/useLanguage"

export default function NursingPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
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
        <PageHeader
          title={t("Enfermagem", "Nursing")}
          subtitle={t("Execução: coletas, procedimentos e registos.", "Execution: sample collection, procedures, and records.")}
          icon={HeartPulse}
          iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          actions={
            canViewAdmin ? (
              <Link
                href="/admin/nursing/"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground-2 transition hover:bg-muted hover:text-foreground"
              >
                {t("Admin", "Admin")}
              </Link>
            ) : null
          }
        />

        {errorMessage ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-nowrap gap-2 overflow-x-auto">
          <div className="min-w-[10rem] flex-1">
            <MetricCard
              label={t("Requisições pendentes", "Pending requests")}
              value={loading ? "..." : pendingRequests}
              accentClass="border-l-amber-500"
              href="/nursing/requests"
              icon={ClipboardList}
              iconClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <MetricCard
              label={t("Procedimentos", "Procedures")}
              value={loading ? "..." : procedures}
              accentClass="border-l-violet-500"
              href="/nursing/procedures"
              icon={HeartPulse}
              iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-400"
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <MetricCard
              label={t("Coletas", "Sample collections")}
              value={loading ? "..." : collections}
              accentClass="border-l-blue-500"
              href="/nursing/colheitas"
              icon={Droplets}
              iconClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
            />
          </div>
        </div>

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
