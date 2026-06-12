"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import ResourceDetailActionsPanel from "@/components/resources/ResourceDetailActionsPanel"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
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
  const basePath = stripTrailingSlash(pathname || "")
  const canList = hasOpenApiMethod(ctx.normalizedEndpoint, "get")
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
      endpoint={ctx.normalizedEndpoint}
      groupLabel={groupLabel}
      resourceLabel={resourceLabel}
      adminListHref={ctx.adminListHref}
      createHref={canCreate ? `${basePath}/new` : undefined}
      rowHref={(row) => buildRecordDetailHref(basePath, row)}
      requiredGroups={ctx.requiredGroups}
    />
  )
}

export function GeneratedResourceCreatePage({
  endpoint,
  initialValues,
}: {
  endpoint: string
  /** Valores iniciais (ex.: pré-selecionar o resultado ao criar uma validação em contexto). */
  initialValues?: Record<string, any>
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

  if (!canCreate) {
    return (
      <AppLayout requiredGroups={ctx.requiredGroups}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Criação indisponível", "Creation unavailable")}
            subtitle={t("Este recurso não expõe criação no contrato atual da API.", "This resource does not expose creation in the current API contract.")}
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

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={createActionLabel}
          actions={
            <Link
              href={basePath}
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              {t("Voltar", "Back")}
            </Link>
          }
        />

        <AutoForm
          endpoint={ctx.normalizedEndpoint}
          method="post"
          initialValues={initialValues}
          submitLabel={createActionLabel}
          config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
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

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={primary ? primary : `${resourceLabel} #${id}`}
          actions={
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
          }
        />

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
          <ResourceDetailsCard endpoint={ctx.normalizedEndpoint} data={data} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("Registo não encontrado.", "Record not found.")}
          </div>
        )}

        {data ? children : null}
      </div>
    </AppLayout>
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

        <AutoForm
          endpoint={`${ctx.normalizedEndpoint}${id}/`}
          method="put"
          initialValues={data || {}}
          submitLabel={t("Guardar alterações", "Save changes")}
          config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
          onSuccess={() => router.push(detailPath)}
        />
      </div>
    </AppLayout>
  )
}
