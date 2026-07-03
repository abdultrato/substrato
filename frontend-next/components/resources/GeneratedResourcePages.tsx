"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowLeft, BookOpenCheck, Building2, ChevronLeft, ClipboardList, HeartPulse, Landmark, Package2, Pencil, Scale, Stethoscope, Trash2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import ResourceDetailActionsPanel from "@/components/resources/ResourceDetailActionsPanel"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import NursingEvolutionDetails from "@/components/resources/NursingEvolutionDetails"
import NursingPrescriptionDetails from "@/components/resources/NursingPrescriptionDetails"
import NursingPrescriptionListCard from "@/components/resources/NursingPrescriptionListCard"
import NursingVitalSignDetails from "@/components/resources/NursingVitalSignDetails"
import NursingVitalSignListCard from "@/components/resources/NursingVitalSignListCard"
import AccountListCard from "@/components/resources/AccountListCard"
import AccountDetails from "@/components/resources/AccountDetails"
import BankAccountListCard from "@/components/resources/BankAccountListCard"
import BankAccountDetails from "@/components/resources/BankAccountDetails"
import LedgerEntryListCard from "@/components/resources/LedgerEntryListCard"
import LedgerEntryDetails from "@/components/resources/LedgerEntryDetails"
import LedgerMovementListCard from "@/components/resources/LedgerMovementListCard"
import LedgerMovementDetails from "@/components/resources/LedgerMovementDetails"
import FinancialReconciliationListCard from "@/components/resources/FinancialReconciliationListCard"
import FinancialReconciliationDetails from "@/components/resources/FinancialReconciliationDetails"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { educationResourceUiFromEndpoint, normalizeEducationEndpoint } from "@/lib/education/ui"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { canonicalModuleGroupKey, type ModuleGroup, type ModuleResource } from "@/lib/modules"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"
import { hasOpenApiMethod, hasWriteContract } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { createResourceActionLabel } from "@/lib/resources/createLabels"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { buildRecordDetailHref, primaryRecordId } from "@/lib/resources/recordIdentity"

type EndpointContext = {
  endpoint: string
  normalizedEndpoint: string
  groupKey: string
  groupLabel: string
  resourceKey: string
  resourceLabel: string
  adminListHref?: string
  requiredGroups: string[]
}

function normalizeEndpoint(value: string): string {
  const clean = String(value || "").split("?")[0].split("#")[0].trim()
  if (!clean) return "/"
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

function titleFromSlug(slug: string): string {
  return String(slug || "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function endpointParts(endpoint: string): { groupKey: string; resourceKey: string } {
  const parts = normalizeEndpoint(endpoint).split("/").filter(Boolean)
  return {
    groupKey: canonicalModuleGroupKey(parts[0] || ""),
    resourceKey: parts[1] || "resource",
  }
}

function findByEndpoint(
  modules: ModuleGroup[],
  endpoint: string
): { group: ModuleGroup; resource: ModuleResource } | null {
  const normalized = normalizeEndpoint(endpoint)
  for (const group of modules) {
    for (const resource of group.resources) {
      if (normalizeEndpoint(resource.endpoint) === normalized) {
        return { group, resource }
      }
    }
  }
  return null
}

function buildEndpointContext(modules: ModuleGroup[], endpoint: string): EndpointContext {
  const routeEndpoint = normalizeEndpoint(endpoint)
  const normalizedEndpoint = normalizeEducationEndpoint(routeEndpoint)
  // Try canonical path first (handles hyphenated routes like /clinical/lab-requests/ → /clinical/labrequest/)
  const canonicalEndpoint = canonicalCollectionPath(normalizedEndpoint)
  const match = findByEndpoint(modules, canonicalEndpoint) || findByEndpoint(modules, normalizedEndpoint)

  if (match) {
    const groupKey = canonicalModuleGroupKey(match.group.key)
    return {
      endpoint,
      normalizedEndpoint,
      groupKey,
      groupLabel: match.group.label,
      resourceKey: match.resource.key,
      resourceLabel: match.resource.label,
      adminListHref: match.resource.adminListHref,
      requiredGroups: requiredGroupsForResourceGroup(groupKey),
    }
  }

  const parsed = endpointParts(normalizedEndpoint)
  const educationUi = parsed.groupKey === "education" ? educationResourceUiFromEndpoint(normalizedEndpoint) : null
  const groupLabel = parsed.groupKey === "education" ? "Educação" : titleFromSlug(parsed.groupKey)
  const resourceLabel = educationUi?.label || titleFromSlug(parsed.resourceKey)

  return {
    endpoint,
    normalizedEndpoint,
    groupKey: parsed.groupKey,
    groupLabel,
    resourceKey: educationUi?.key || parsed.resourceKey,
    resourceLabel,
    requiredGroups: requiredGroupsForResourceGroup(parsed.groupKey),
  }
}

function stripTrailingSlash(path: string): string {
  const clean = String(path || "").trim()
  if (!clean) return "/"
  const trimmed = clean.replace(/\/+$/, "")
  return trimmed || "/"
}

function detailContractEndpoint(endpoint: string): string {
  return `${normalizeEndpoint(endpoint).replace(/\/$/, "")}/{id}/`
}

function pickPrimaryLabel(data: Record<string, any> | null | undefined): string {
  if (!data || typeof data !== "object") return ""
  const candidates = [
    "name",
    "nome",
    "title",
    "descricao",
    "description",
    "id_custom",
    "custom_id",
    "codigo",
    "code",
  ]
  for (const key of candidates) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function useEndpointContext(endpoint: string): EndpointContext {
  const { modules } = useModulesCatalog("neutral")
  return useMemo(() => buildEndpointContext(modules, endpoint), [endpoint, modules])
}

export function GeneratedResourceListPage({
  endpoint,
  allowCreate = true,
}: {
  endpoint: string
  /** Quando false, oculta a criação isolada (ex.: fila de validações criada em contexto). */
  allowCreate?: boolean
}) {
  const ctx = useEndpointContext(endpoint)
  const { t, tr } = useLanguage()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const basePath = stripTrailingSlash(pathname || "")
  const canList = hasOpenApiMethod(ctx.normalizedEndpoint, "get")
  // Encaminha filtros vindos da URL da página (ex.: /requests?status=pendente)
  // para a API de listagem; parâmetros de controlo da própria lista ficam fora.
  const listEndpoint = useMemo(() => {
    const params = new URLSearchParams()
    searchParams?.forEach((value, key) => {
      if (["page", "page_size", "search", "ordering"].includes(key)) return
      if (value) params.set(key, value)
    })
    const qs = params.toString()
    return qs ? `${ctx.normalizedEndpoint}?${qs}` : ctx.normalizedEndpoint
  }, [ctx.normalizedEndpoint, searchParams])
  const canCreate = allowCreate && hasOpenApiMethod(ctx.normalizedEndpoint, "post")
  const groupLabel = tr(ctx.groupLabel)
  const resourceLabel = tr(ctx.resourceLabel)

  if (!canList) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Listagem indisponível", "List unavailable")}
            subtitle={t("Este recurso existe no catálogo, mas a API não expõe listagem para ele.", "This resource exists in the catalog, but the API does not expose a list endpoint for it.")}
            actions={
              <Link
                href="/workspaces"
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar ao módulo", "Back to module")}
              </Link>
            }
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <ResourceListPage
      title={`${groupLabel} / ${resourceLabel}`}
      endpoint={listEndpoint}
      groupLabel={groupLabel}
      resourceLabel={resourceLabel}
      adminListHref={ctx.adminListHref}
      createHref={canCreate ? `${basePath}/new` : undefined}
      rowHref={(row) => buildRecordDetailHref(basePath, row)}
      requiredGroups={ctx.requiredGroups}
      clientFullTextSearch={ctx.groupKey === "accounting" || ctx.normalizedEndpoint.startsWith("/accounting/")}
      cardGridClassName={
        ctx.groupKey === "accounting" || ctx.normalizedEndpoint.startsWith("/accounting/")
          ? "grid gap-1.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          : undefined
      }
      renderCard={
        ctx.normalizedEndpoint === "/nursing/nursing_prescription/"
          ? (row, href) => <NursingPrescriptionListCard row={row} href={href} />
          : ctx.normalizedEndpoint === "/nursing/nursing_vital_sign/"
            ? (row, href) => <NursingVitalSignListCard row={row} href={href} />
            : ctx.normalizedEndpoint === "/accounting/accounts/"
              ? (row, href) => <AccountListCard row={row} href={href} />
              : ctx.normalizedEndpoint === "/accounting/bank_account/"
                ? (row, href) => <BankAccountListCard row={row} href={href} />
                : ctx.normalizedEndpoint === "/accounting/entry/"
                  ? (row, href) => <LedgerEntryListCard row={row} href={href} />
                  : ctx.normalizedEndpoint === "/accounting/movement/"
                    ? (row, href) => <LedgerMovementListCard row={row} href={href} />
                    : ctx.normalizedEndpoint === "/accounting/financialreconciliation/" || ctx.normalizedEndpoint === "/accounting/financial-reconciliations/"
                      ? (row, href) => <FinancialReconciliationListCard row={row} href={href} />
                      : undefined
      }
    />
  )
}

export function GeneratedResourceCreatePage({
  endpoint,
  initialValues,
  presentation = "default",
}: {
  endpoint: string
  /** Valores iniciais (ex.: pré-selecionar o resultado ao criar uma validação em contexto). */
  initialValues?: Record<string, any>
  presentation?: "default" | "nursing-procedure" | "nursing-material"
}) {
  useAuthGuard()
  const { t, tr, language } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const ctx = useEndpointContext(endpoint)
  const basePath = stripTrailingSlash((pathname || "").replace(/\/new\/?$/, ""))
  const canCreate = hasOpenApiMethod(ctx.normalizedEndpoint, "post")
  const resourceLabel = tr(ctx.resourceLabel)
  const createActionLabel = createResourceActionLabel(resourceLabel, language)
  const isNursingProcedure = presentation === "nursing-procedure"
  const isNursingMaterial = presentation === "nursing-material"

  // Glass styles copied from procedure detail page
  const GLASS =
    "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
  const GLASS_SOFT =
    "rounded-lg border border-white/20 bg-white/25 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

  if (!canCreate) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-6xl space-y-2.5 px-1">
          <section className={`relative overflow-hidden ${GLASS} h-[80px]`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-[var(--primary-500)]" />
            <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                  <Link href={basePath} className="transition-colors hover:text-foreground">{resourceLabel + "s"}</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">{t("Criação indisponível", "Creation unavailable")}</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
                <Link
                  href={basePath}
                  className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
                >
                  {t("Voltar", "Back")}
                </Link>
              </div>
            </div>
          </section>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t("Este recurso não expõe criação no contrato atual da API.", "This resource does not expose creation in the current API contract.")}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className={`mx-auto w-full px-1 ${isNursingProcedure ? "max-w-4xl space-y-2" : isNursingMaterial ? "max-w-5xl space-y-3" : "max-w-6xl space-y-2.5"}`}>
        {/* Header */}
        <section className={`relative overflow-hidden ${isNursingProcedure || isNursingMaterial ? `${GLASS} min-h-[64px]` : "rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20 h-[72px]"}`}>
          {isNursingProcedure ? (
            <>
              <div className="pointer-events-none absolute -right-8 -top-16 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative flex min-h-[64px] items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                    <HeartPulse size={17} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold leading-tight text-foreground">Novo procedimento</h1>
                    <p className="text-[11px] text-muted-foreground">Registo clínico de enfermagem em etapas</p>
                  </div>
                </div>
                <Link
                  href={basePath}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  <ArrowLeft size={13} /> {t("Voltar", "Back")}
                </Link>
              </div>
            </>
          ) : isNursingMaterial ? (
            <>
              <span className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 bottom-0 h-28 w-28 rounded-full bg-teal-400/10 blur-3xl" />
              <div className="relative flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                    <Package2 size={18} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold leading-tight text-foreground">Novo material de procedimento</h1>
                    <p className="text-[11px] text-muted-foreground">
                      Registe produto, lote, quantidade e vínculo ao procedimento de enfermagem.
                    </p>
                  </div>
                </div>
                <Link
                  href={basePath}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
                >
                  <ArrowLeft size={13} /> {t("Voltar", "Back")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
              <div className="flex h-full items-center justify-between gap-3 px-4 py-3 pl-5">
                <div className="min-w-0">
                  <h1 className="font-display text-sm font-bold text-foreground leading-tight">{createActionLabel}</h1>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                    <Link href={basePath} className="transition-colors hover:text-foreground">{resourceLabel}</Link>
                    <span>/</span>
                    <span>{t("Novo", "New")}</span>
                  </div>
                </div>
                <Link
                  href={basePath}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10"
                >
                  <ChevronLeft size={11} /> {t("Voltar", "Back")}
                </Link>
              </div>
            </>
          )}
        </section>
        {/* Form card */}
        <div
          className={
            isNursingProcedure
              ? ""
              : isNursingMaterial
                ? "relative overflow-hidden rounded-xl border border-emerald-200/30 bg-white/25 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:bg-white/[0.04]"
                : GLASS
          }
        >
          {isNursingMaterial ? (
            <>
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
            </>
          ) : null}
          <div className={isNursingProcedure ? "" : isNursingMaterial ? "relative px-4 py-4 sm:px-5" : "px-4 py-3"}>
            {!isNursingProcedure && !isNursingMaterial ? (
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                {t("Dados do", "Data for")} {resourceLabel}
              </h2>
            ) : null}
            {isNursingMaterial ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/30 pb-3 dark:border-white/10">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Dados do material</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Preencha os campos essenciais para consumo e rastreio de stock.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Enfermagem
                </span>
              </div>
            ) : null}
            <AutoForm
              endpoint={ctx.normalizedEndpoint}
              method="post"
              initialValues={initialValues}
              submitLabel={createActionLabel}
              config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
              presentation={ctx.normalizedEndpoint === "/nursing/nursing_evolution/" || ctx.normalizedEndpoint === "/nursing/nursing_prescription/" || ctx.normalizedEndpoint === "/nursing/nursing_vital_sign/" || ctx.normalizedEndpoint === "/accounting/bank_account/" || ctx.normalizedEndpoint === "/accounting/accounts/" || ctx.normalizedEndpoint === "/accounting/entry/" || ctx.normalizedEndpoint === "/accounting/movement/" || ctx.normalizedEndpoint === "/accounting/financialreconciliation/" || ctx.normalizedEndpoint === "/accounting/financial-reconciliations/" ? "nursing-system" : "default"}
              onSuccess={(data) => {
                const id = primaryRecordId(data)
                if (id !== undefined && id !== null && String(id).trim()) {
                  router.push(`${basePath}/${encodeURIComponent(String(id))}`)
                  return
                }
                router.push(basePath)
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export function GeneratedResourceDetailPage({
  endpoint,
  children,
}: {
  endpoint: string
  /** Secções de segunda camada renderizadas dentro do detalhe (ex.: itens do pedido). */
  children?: ReactNode
}) {
  useAuthGuard()
  const { t, tr } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [notificationBusy, setNotificationBusy] = useState<null | "invoice" | "results">(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null)
  const ctx = useEndpointContext(endpoint)
  const basePath = stripTrailingSlash((pathname || "").replace(/\/[^/]+\/?$/, ""))
  const detailEndpoint = detailContractEndpoint(ctx.normalizedEndpoint)
  const canReadDetail = hasOpenApiMethod(detailEndpoint, "get")
  const canEdit = hasWriteContract(detailEndpoint, "put")
  const canDelete = hasOpenApiMethod(detailEndpoint, "delete")
  const resourceLabel = tr(ctx.resourceLabel)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["generated-resource-detail", ctx.normalizedEndpoint, id, safeRefreshToken],
    queryFn: async () =>
      await apiFetch<Record<string, any>>(`${ctx.normalizedEndpoint}${id}/`, {
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!id && canReadDetail,
  })

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await apiFetch(`${ctx.normalizedEndpoint}${id}/`, { method: "DELETE" })
      router.push(basePath)
    } catch (e: any) {
      setDeleteError(
        isNotFoundLikeError(e)
          ? t("Registo não encontrado.", "Record not found.")
          : e?.message || t("Erro ao apagar registo.", "Failed to delete record.")
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleBusinessNotification(kind: "invoice" | "results") {
    const actionPath = kind === "invoice" ? "send-notification" : "send-results-notification"
    try {
      setNotificationBusy(kind)
      setDeleteError(null)
      setNotificationError(null)
      setNotificationFeedback(null)
      await apiFetch(`${ctx.normalizedEndpoint}${id}/${actionPath}/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setNotificationFeedback(
        kind === "invoice"
          ? t("Notificação de fatura processada.", "Invoice notification processed.")
          : t("Notificação de resultados processada.", "Results notification processed.")
      )
    } catch (e: any) {
      setNotificationError(
        isNotFoundLikeError(e)
          ? t("Registo não encontrado.", "Record not found.")
          : e?.message || t("Falha ao enviar notificação.", "Failed to send notification.")
      )
    } finally {
      setNotificationBusy(null)
    }
  }

  if (!canReadDetail) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Detalhe indisponível", "Detail unavailable")}
            subtitle={t("Este recurso não expõe consulta por identificador no contrato atual da API.", "This resource does not expose detail lookup in the current API contract.")}
            actions={
              <Link
                href={basePath}
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar", "Back")}
              </Link>
            }
          />
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      </AppLayout>
    )
  }

  if (error) {
    const message = isNotFoundLikeError(error)
      ? t("Registo não encontrado.", "Record not found.")
      : (error as any)?.message || t("Erro ao carregar registo.", "Failed to load record.")

    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={`${resourceLabel} #${id}`}
            actions={
              <Link
                href={basePath}
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar", "Back")}
              </Link>
            }
          />
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>
        </div>
      </AppLayout>
    )
  }

  const primary = pickPrimaryLabel(data)
  const currentStatus = String(data?.status ?? data?.estado ?? "").toLowerCase()
  const canNotifyPaidInvoice = ctx.normalizedEndpoint === "/billing/invoice/" && currentStatus === "paga"
  const canNotifyValidatedResults = ctx.normalizedEndpoint === "/clinical/labrequest/" && currentStatus === "validado"
  const isNursingEvolution = ctx.normalizedEndpoint === "/nursing/nursing_evolution/"
  const isNursingPrescription = ctx.normalizedEndpoint === "/nursing/nursing_prescription/"
  const isNursingVitalSign = ctx.normalizedEndpoint === "/nursing/nursing_vital_sign/"
  const isAccount = ctx.normalizedEndpoint === "/accounting/accounts/"
  const isBankAccount = ctx.normalizedEndpoint === "/accounting/bank_account/"
  const isLedgerEntry = ctx.normalizedEndpoint === "/accounting/entry/"
  const isLedgerMovement = ctx.normalizedEndpoint === "/accounting/movement/"
  const isReconciliation = ctx.normalizedEndpoint === "/accounting/financialreconciliation/" || ctx.normalizedEndpoint === "/accounting/financial-reconciliations/"
  const isNursingCard = isNursingEvolution || isNursingPrescription || isNursingVitalSign
  const isCardDetail = isNursingCard || isAccount || isBankAccount || isLedgerEntry || isLedgerMovement || isReconciliation

  const detailActions = (
    <div className="flex flex-wrap items-center gap-2">
      {canNotifyPaidInvoice ? (
                <button
                  type="button"
                  onClick={() => handleBusinessNotification("invoice")}
                  disabled={notificationBusy !== null}
                  className="inline-flex h-9 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-900 shadow-sm transition-all duration-150 hover:bg-sky-100 disabled:opacity-60"
                >
                  {notificationBusy === "invoice"
                    ? t("Notificando...", "Notifying...")
                    : t("Enviar notificação", "Send notification")}
                </button>
              ) : null}
              {canNotifyValidatedResults ? (
                <button
                  type="button"
                  onClick={() => handleBusinessNotification("results")}
                  disabled={notificationBusy !== null}
                  className="inline-flex h-9 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-900 shadow-sm transition-all duration-150 hover:bg-sky-100 disabled:opacity-60"
                >
                  {notificationBusy === "results"
                    ? t("Notificando...", "Notifying...")
                    : t("Enviar notificação", "Send notification")}
                </button>
              ) : null}
              {canEdit ? (
                <Link
                  href={`${basePath}/${id}/edit`}
                  className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
                >
                  {t("Editar", "Edit")}
                </Link>
              ) : null}
              {canDelete ? (
                <ConfirmDialog
                  title={t("Apagar registo", "Delete record")}
                  message={t("Esta ação apaga o registo selecionado.", "This action deletes the selected record.")}
                  confirmText={t("Apagar", "Delete")}
                  onConfirm={handleDelete}
                  disabled={deleting}
                >
                  <button
                    type="button"
                    disabled={deleting}
                    className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-500 hover:shadow-md disabled:opacity-60"
                  >
                    {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
                  </button>
                </ConfirmDialog>
              ) : null}
      <Link
        href={basePath}
        className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
      >
        {t("Voltar", "Back")}
      </Link>
    </div>
  )

  const nursingCardActions = (
    <div className="flex flex-wrap items-center gap-1.5">
      {canEdit ? (
        <Link
          href={`${basePath}/${id}/edit`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-3 text-xs font-semibold text-[var(--primary-700)] backdrop-blur-sm transition hover:bg-[var(--primary-500)]/25"
        >
          <Pencil size={13} /> {t("Editar", "Edit")}
        </Link>
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          title={t("Apagar registo", "Delete record")}
          message={t("Esta ação apaga o registo selecionado.", "This action deletes the selected record.")}
          confirmText={t("Apagar", "Delete")}
          onConfirm={handleDelete}
          disabled={deleting}
        >
          <button
            type="button"
            disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300/50 bg-red-500/15 px-3 text-xs font-semibold text-red-600 backdrop-blur-sm transition hover:bg-red-500/25 disabled:opacity-60 dark:text-red-400"
          >
            <Trash2 size={13} /> {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
          </button>
        </ConfirmDialog>
      ) : null}
      <Link
        href={basePath}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/25 px-3 text-xs font-semibold text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
      >
        <ArrowLeft size={13} /> {t("Voltar", "Back")}
      </Link>
    </div>
  )

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {!isCardDetail ? (
          <PageHeader
            title={primary ? primary : `${resourceLabel} #${id}`}
            actions={detailActions}
          />
        ) : null}

        {deleteError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {deleteError}
          </div>
        ) : null}

        {notificationError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {notificationError}
          </div>
        ) : null}

        {notificationFeedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notificationFeedback}
          </div>
        ) : null}

        {data ? (
          <ResourceDetailActionsPanel
            endpoint={ctx.normalizedEndpoint}
            id={id}
            resourceLabel={resourceLabel}
            record={data}
            onCompleted={() => void refetch()}
          />
        ) : null}

        {data ? (
          isNursingEvolution ? (
            <NursingEvolutionDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isNursingPrescription ? (
            <NursingPrescriptionDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isNursingVitalSign ? (
            <NursingVitalSignDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isAccount ? (
            <AccountDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isBankAccount ? (
            <BankAccountDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isLedgerEntry ? (
            <LedgerEntryDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isLedgerMovement ? (
            <LedgerMovementDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : isReconciliation ? (
            <FinancialReconciliationDetails endpoint={ctx.normalizedEndpoint} data={data} actions={nursingCardActions} />
          ) : (
            <ResourceDetailsCard endpoint={ctx.normalizedEndpoint} data={data} />
          )
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("Registo não encontrado.", "Record not found.")}
          </div>
        )}

        {data && ctx.normalizedEndpoint === "/billing/invoice/" ? (
          <InvoiceHistoryPanel invoiceId={id} />
        ) : null}

        {data ? children : null}
      </div>
    </AppLayout>
  )
}

type InvoiceHistoryEntry = {
  id: number
  event_type: string
  description?: string
  created_at?: string
  created_by_name?: string
}

function InvoiceHistoryPanel({ invoiceId }: { invoiceId: string }) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-history", invoiceId],
    queryFn: async () =>
      await apiFetch<{ results?: InvoiceHistoryEntry[]; count?: number } | InvoiceHistoryEntry[]>(
        `/billing/invoicehistory/?invoice=${invoiceId}&page_size=50&ordering=created_at`,
        { clientCache: false }
      ),
    enabled: !!invoiceId,
  })

  const entries: InvoiceHistoryEntry[] = Array.isArray(data)
    ? data
    : ((data as any)?.results ?? [])

  const EVENT_LABELS: Record<string, { pt: string; en: string; color: string }> = {
    CRIACAO: { pt: "Criação", en: "Creation", color: "bg-sky-500" },
    EMISSAO: { pt: "Emissão", en: "Issued", color: "bg-indigo-500" },
    PAGAMENTO: { pt: "Pagamento", en: "Payment", color: "bg-emerald-500" },
    CANCELAMENTO: { pt: "Cancelamento", en: "Cancelled", color: "bg-red-500" },
    SINCRONIZACAO: { pt: "Sincronização", en: "Sync", color: "bg-amber-500" },
  }

  function formatDate(iso?: string) {
    if (!iso) return "-"
    try {
      return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--gray-100)] text-[var(--primary-700)]"><ClipboardList size={14} /></div>
          <p className="text-xs font-semibold text-[var(--text)]">{t("Histórico da fatura", "Invoice history")}</p>
        </div>
        <p className="mt-2 text-[11px] text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</p>
      </section>
    )
  }

  if (!entries.length) return null

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--gray-100)] text-[var(--primary-700)]"><ClipboardList size={14} /></div>
        <div>
          <p className="text-xs font-semibold text-[var(--text)]">{t("Histórico da fatura", "Invoice history")}</p>
          <p className="text-[11px] text-[var(--gray-600)]">{entries.length} {t("evento(s)", "event(s)")}</p>
        </div>
      </div>
      <div className="mt-2 rounded-md border border-[var(--border)] bg-white p-2 shadow-sm">
        <ol className="relative border-l border-[var(--border)] pl-4">
          {entries.map((entry, i) => {
            const meta = EVENT_LABELS[entry.event_type] ?? { pt: entry.event_type, en: entry.event_type, color: "bg-gray-400" }
            return (
              <li key={entry.id ?? i} className={i < entries.length - 1 ? "mb-3" : undefined}>
                <span className={`absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full ${meta.color} ring-2 ring-white`} />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text)]">{isPt ? meta.pt : meta.en}</span>
                  {entry.created_by_name ? (
                    <span className="text-[11px] text-[var(--gray-600)]">— {entry.created_by_name}</span>
                  ) : null}
                  <span className="text-[11px] text-[var(--gray-400)]">{formatDate(entry.created_at)}</span>
                </div>
                {entry.description ? (
                  <p className="mt-0.5 text-[11px] text-[var(--gray-600)]">{entry.description}</p>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export function GeneratedResourceEditPage({ endpoint }: { endpoint: string }) {
  useAuthGuard()
  const { t, tr } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const ctx = useEndpointContext(endpoint)
  const detailPath = stripTrailingSlash((pathname || "").replace(/\/edit\/?$/, ""))
  const detailEndpoint = detailContractEndpoint(ctx.normalizedEndpoint)
  const canReadDetail = hasOpenApiMethod(detailEndpoint, "get")
  const canUpdate = hasWriteContract(detailEndpoint, "put")
  const resourceLabel = tr(ctx.resourceLabel)

  const { data, isLoading, error } = useQuery({
    queryKey: ["generated-resource-edit", ctx.normalizedEndpoint, id, safeRefreshToken],
    queryFn: async () =>
      await apiFetch<Record<string, any>>(`${ctx.normalizedEndpoint}${id}/`, {
        clientCache: safeRefreshToken === 0,
      }),
    enabled: !!id && canReadDetail && canUpdate,
  })

  if (!canReadDetail || !canUpdate) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Edição indisponível", "Editing unavailable")}
            subtitle={t("Este recurso não expõe leitura e edição no contrato atual da API.", "This resource does not expose both read and edit operations in the current API contract.")}
            actions={
              <Link
                href={detailPath}
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar", "Back")}
              </Link>
            }
          />
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
      </AppLayout>
    )
  }

  if (error) {
    const message = isNotFoundLikeError(error)
      ? t("Registo não encontrado.", "Record not found.")
      : (error as any)?.message || t("Erro ao carregar registo.", "Failed to load record.")

    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={`${t("Editar", "Edit")} ${resourceLabel}`}
            actions={
              <Link
                href={detailPath}
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar", "Back")}
              </Link>
            }
          />
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>
        </div>
      </AppLayout>
    )
  }

  const isNursingEvolution = ctx.normalizedEndpoint === "/nursing/nursing_evolution/"
  const isNursingPrescription = ctx.normalizedEndpoint === "/nursing/nursing_prescription/"
  const isNursingVitalSign = ctx.normalizedEndpoint === "/nursing/nursing_vital_sign/"
  const isBankAccount = ctx.normalizedEndpoint === "/accounting/bank_account/"
  const isAccount = ctx.normalizedEndpoint === "/accounting/accounts/"
  const isLedgerEntry = ctx.normalizedEndpoint === "/accounting/entry/"
  const isLedgerMovement = ctx.normalizedEndpoint === "/accounting/movement/"
  const isReconciliation = ctx.normalizedEndpoint === "/accounting/financialreconciliation/" || ctx.normalizedEndpoint === "/accounting/financial-reconciliations/"
  const isNursingCard = isNursingEvolution || isNursingPrescription || isNursingVitalSign || isBankAccount || isAccount || isLedgerEntry || isLedgerMovement || isReconciliation

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {isNursingCard ? (
          <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute left-0 top-0 h-full w-1 bg-[var(--primary-500)]" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
                  {isReconciliation ? <Scale size={18} /> : isLedgerMovement ? <Scale size={18} /> : isLedgerEntry ? <BookOpenCheck size={18} /> : isAccount ? <Landmark size={18} /> : isBankAccount ? <Building2 size={18} /> : isNursingVitalSign ? <Activity size={18} /> : isNursingPrescription ? <Stethoscope size={18} /> : <HeartPulse size={18} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    {isReconciliation
                      ? t("Editar conciliação", "Edit reconciliation")
                      : isLedgerMovement
                      ? t("Editar movimento", "Edit movement")
                      : isLedgerEntry
                      ? t("Editar lançamento", "Edit entry")
                      : isAccount
                        ? t("Editar conta contábil", "Edit account")
                        : isBankAccount
                          ? t("Editar conta bancária", "Edit bank account")
                          : isNursingVitalSign
                            ? t("Editar sinais vitais", "Edit vital signs")
                            : isNursingPrescription
                              ? t("Editar prescrição de enfermagem", "Edit nursing prescription")
                              : t("Editar evolução de enfermagem", "Edit nursing evolution")}
                  </p>
                  <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">
                    {pickPrimaryLabel(data) || `${resourceLabel} #${id}`}
                  </h2>
                </div>
              </div>
              <Link
                href={detailPath}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/25 px-3 text-xs font-semibold text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                <ArrowLeft size={13} /> {t("Voltar", "Back")}
              </Link>
            </div>
          </section>
        ) : (
          <PageHeader
            title={`${t("Editar", "Edit")} ${resourceLabel}`}
            actions={
              <Link
                href={detailPath}
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                {t("Voltar", "Back")}
              </Link>
            }
          />
        )}

        <AutoForm
          endpoint={`${ctx.normalizedEndpoint}${id}/`}
          method="put"
          initialValues={data || {}}
          submitLabel={t("Guardar alterações", "Save changes")}
          config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
          presentation={isNursingCard ? "nursing-system" : "default"}
          onSuccess={() => router.push(detailPath)}
        />
      </div>
    </AppLayout>
  )
}
