"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch } from "@/lib/api"
import { educationResourceUiFromEndpoint, normalizeEducationEndpoint } from "@/lib/education/ui"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { canonicalModuleGroupKey, type ModuleGroup, type ModuleResource } from "@/lib/modules"
import { hasWriteContract } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

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
  const match = findByEndpoint(modules, normalizedEndpoint)

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

function groupContextMessage(groupKey: string, action: "list" | "new" | "detail" | "edit"): string {
  const canonical = canonicalModuleGroupKey(groupKey)
  const byGroup: Record<string, Record<string, string>> = {
    clinical: {
      list: "Monitorize o ciclo clínico com foco em consistência de dados e rastreabilidade.",
      new: "Registe dados clínicos com validação completa antes de submeter.",
      detail: "Consulte o registo clínico completo com os campos de negócio do backend.",
      edit: "Atualize apenas os dados clínicos necessários e preserve o histórico.",
    },
    laboratory: {
      list: "Acompanhe requisições, amostras e resultados com fluxo operacional claro.",
      new: "Preencha os dados laboratoriais obrigatórios para manter integridade do processo.",
      detail: "Verifique a estrutura laboratorial do registo antes de qualquer ação.",
      edit: "Ajuste informações laboratoriais mantendo compatibilidade com o contrato da API.",
    },
    nursing: {
      list: "Visualize evoluções, sinais vitais e procedimentos com leitura rápida.",
      new: "Registe dados assistenciais completos para continuidade do cuidado.",
      detail: "Consulte o contexto assistencial e os estados associados ao registo.",
      edit: "Edite o plano assistencial com consistência entre frontend e backend.",
    },
    bloodbank: {
      list: "Controle doações, unidades e movimentos com estados operacionais explícitos.",
      new: "Registe o fluxo hemoterápico com todos os campos exigidos pelo backend.",
      detail: "Analise o estado da unidade e o contexto transfusional do registo.",
      edit: "Atualize dados do banco de sangue sem perder coerência de estado.",
    },
    pharmacy: {
      list: "Gerencie stock, lotes e saídas com visão operacional objetiva.",
      new: "Registe dados farmacêuticos com validações de negócio já no formulário.",
      detail: "Consulte o item farmacêutico com todos os atributos relevantes do backend.",
      edit: "Ajuste registos farmacêuticos mantendo consistência com regras de estoque.",
    },
    accounting: {
      list: "Acompanhe lançamentos e conciliações com leitura financeira objetiva.",
      new: "Crie registos contabilísticos com campos completos e sem ambiguidade.",
      detail: "Consulte o registo financeiro com foco em auditoria e reconciliação.",
      edit: "Atualize dados contabilísticos com rastreabilidade e precisão.",
    },
    education: {
      list: "Acompanhe turmas, avaliações e progresso com estrutura pedagógica clara.",
      new: "Registe informação académica com completude para fluxo escolar.",
      detail: "Consulte dados pedagógicos com leitura contextual por disciplina.",
      edit: "Atualize o registo académico preservando regras de progressão.",
    },
    warehouse: {
      list: "Acompanhe compras, estoque, reservas, separação e expedições com leitura operacional clara.",
      new: "Registe dados de armazém com campos completos para manter o fluxo ERP/WMS consistente.",
      detail: "Consulte o registo de armazém com rastreabilidade de item, lote, localização e estado.",
      edit: "Atualize o registo mantendo coerência entre estoque, pedidos, reservas e movimentos.",
    },
  }

  return (
    byGroup[canonical]?.[action] ||
    {
      list: "Visualize os registos com contexto de negócio e filtros úteis.",
      new: "Preencha os campos necessários para criar um novo registo.",
      detail: "Consulte o registo completo com os dados esperados pela API.",
      edit: "Atualize o registo mantendo compatibilidade com o backend.",
    }[action]
  )
}

function rowIdentity(row: Record<string, any>): string | number | null {
  return row?.id ?? row?.pk ?? row?.id_custom ?? row?.custom_id ?? null
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

export function GeneratedResourceListPage({ endpoint }: { endpoint: string }) {
  const ctx = useEndpointContext(endpoint)
  const { tr } = useLanguage()
  const pathname = usePathname()
  const basePath = stripTrailingSlash(pathname || "")
  const canCreate = hasWriteContract(ctx.normalizedEndpoint, "post")
  const groupLabel = tr(ctx.groupLabel)
  const resourceLabel = tr(ctx.resourceLabel)

  return (
    <ResourceListPage
      title={`${groupLabel} / ${resourceLabel}`}
      subtitle={groupContextMessage(ctx.groupKey, "list")}
      endpoint={ctx.normalizedEndpoint}
      groupLabel={groupLabel}
      resourceLabel={resourceLabel}
      adminListHref={ctx.adminListHref}
      createHref={canCreate ? `${basePath}/new` : undefined}
      rowHref={(row) => {
        const id = rowIdentity(row)
        return id === null ? basePath : `${basePath}/${id}`
      }}
      requiredGroups={ctx.requiredGroups}
    />
  )
}

export function GeneratedResourceCreatePage({ endpoint }: { endpoint: string }) {
  useAuthGuard()
  const { t, tr } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const ctx = useEndpointContext(endpoint)
  const basePath = stripTrailingSlash((pathname || "").replace(/\/new\/?$/, ""))
  const resourceLabel = tr(ctx.resourceLabel)

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={`${t("Novo", "New")} ${resourceLabel}`}
          subtitle={groupContextMessage(ctx.groupKey, "new")}
          actions={
            <Link
              href={basePath}
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              {t("Voltar", "Back")}
            </Link>
          }
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <AutoForm
            endpoint={ctx.normalizedEndpoint}
            method="post"
            submitLabel={t("Criar", "Create")}
            config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
            onSuccess={(data) => {
              const id = data?.id ?? data?.pk ?? data?.id_custom ?? data?.custom_id
              if (id !== undefined && id !== null && String(id).trim()) {
                router.push(`${basePath}/${id}`)
                return
              }
              router.push(basePath)
            }}
          />
        </div>
      </div>
    </AppLayout>
  )
}

export function GeneratedResourceDetailPage({ endpoint }: { endpoint: string }) {
  useAuthGuard()
  const { t, tr } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [deleting, setDeleting] = useState(false)
  const ctx = useEndpointContext(endpoint)
  const basePath = stripTrailingSlash((pathname || "").replace(/\/[^/]+\/?$/, ""))
  const canEdit = hasWriteContract(`${ctx.normalizedEndpoint}{id}/`, "put")
  const resourceLabel = tr(ctx.resourceLabel)

  const { data, isLoading, error } = useQuery({
    queryKey: ["generated-resource-detail", ctx.normalizedEndpoint, id],
    queryFn: async () => await apiFetch<Record<string, any>>(`${ctx.normalizedEndpoint}${id}/`),
    enabled: !!id,
  })

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja apagar este registo?")) return
    setDeleting(true)
    try {
      await apiFetch(`${ctx.normalizedEndpoint}${id}/`, { method: "DELETE" })
      router.push(basePath)
    } finally {
      setDeleting(false)
    }
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
            subtitle={groupContextMessage(ctx.groupKey, "detail")}
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

  return (
    <AppLayout requiredGroups={ctx.requiredGroups}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={primary ? primary : `${resourceLabel} #${id}`}
          subtitle={groupContextMessage(ctx.groupKey, "detail")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <Link
                  href={`${basePath}/${id}/edit`}
                  className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
                >
                  {t("Editar", "Edit")}
                </Link>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-500 hover:shadow-md disabled:opacity-60"
                >
                  {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
                </button>
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

        {data ? (
          <ResourceDetailsCard endpoint={ctx.normalizedEndpoint} data={data} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("Registo não encontrado.", "Record not found.")}
          </div>
        )}
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
  const ctx = useEndpointContext(endpoint)
  const detailPath = stripTrailingSlash((pathname || "").replace(/\/edit\/?$/, ""))
  const resourceLabel = tr(ctx.resourceLabel)

  const { data, isLoading, error } = useQuery({
    queryKey: ["generated-resource-edit", ctx.normalizedEndpoint, id],
    queryFn: async () => await apiFetch<Record<string, any>>(`${ctx.normalizedEndpoint}${id}/`),
    enabled: !!id,
  })

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
            subtitle={groupContextMessage(ctx.groupKey, "edit")}
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
          subtitle={groupContextMessage(ctx.groupKey, "edit")}
          actions={
            <Link
              href={detailPath}
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              {t("Voltar", "Back")}
            </Link>
          }
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <AutoForm
            endpoint={`${ctx.normalizedEndpoint}${id}/`}
            method="put"
            initialValues={data || {}}
            submitLabel={t("Guardar alterações", "Save changes")}
            config={getResourceFormConfig(ctx.groupKey, ctx.resourceKey, ctx.normalizedEndpoint)}
            onSuccess={() => router.push(detailPath)}
          />
        </div>
      </div>
    </AppLayout>
  )
}
