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

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const [requests, procedureResponse] = await Promise.all([
          apiFetch<any>("/requests/?type=LAB&status=pendente", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/nursing/procedure/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setPendingRequests(extractTotalCount(requests))
        setProcedures(extractTotalCount(procedureResponse))
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
      <div className="space-y-6">
        <PageHeader
          title={t("Enfermagem", "Nursing")}
          subtitle={t("Execução: colheitas, procedimentos e registos.", "Execution: sample collection, procedures, and records.")}
          actions={
            canViewAdmin ? (
              <Link
                href="/admin/nursing/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                {t("Abrir na Administração", "Open in Administration")}
              </Link>
            ) : null
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("Requisições pendentes", "Pending requests")} value={loading ? "..." : pendingRequests} />
          <MetricCard label={t("Procedimentos", "Procedures")} value={loading ? "..." : procedures} />
          <MetricCard label={t("Colheitas", "Sample collections")} value={loading ? "..." : "—"} />
          <MetricCard
            label={t("Sinais vitais", "Vital signs")}
            value={loading ? "..." : "—"}
            hint={t("Entrada via módulo Enfermagem", "Entries via the Nursing module")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title={t("Requisições", "Requests")}
            description={t("Visualize as requisições pendentes e o que precisa ser executado.", "View pending requests and what still needs execution.")}
            href="/nursing/requests"
            icon={ClipboardList}
          />
          <ActionTile
            title={t("Itens de requisição", "Request items")}
            description={t("Lista de itens vinculados às requisições (exames).", "List of items linked to requests (tests).")}
            href="/nursing/request-items"
            icon={Droplets}
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

