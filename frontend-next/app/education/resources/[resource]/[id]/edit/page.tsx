"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AutoForm from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { EDUCATION_REQUIRED_GROUPS, getEducationResource } from "@/lib/education/resources"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

function detailContractEndpoint(endpoint: string): string {
  return `${endpoint.replace(/\/$/, "")}/{id}/`
}

export default function EducationResourceEditPage() {
  const params = useParams()
  const resourceKey = routeParamToString((params as any)?.resource)
  const id = routeParamToString((params as any)?.id)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const found = getEducationResource(modules, resourceKey)

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<Record<string, any> | null>(null)
  const detailEndpoint = found ? detailContractEndpoint(found.resource.endpoint) : ""
  const canReadDetail = found ? hasOpenApiMethod(detailEndpoint, "get") : false
  const canUpdate = found
    ? hasOpenApiMethod(detailEndpoint, "put") || hasOpenApiMethod(detailEndpoint, "patch")
    : false

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!found || !canReadDetail || !canUpdate) {
        if (mounted) setLoadingData(false)
        return
      }
      try {
        setLoadingData(true)
        setError(null)
        const endpoint = `${found.resource.endpoint.replace(/\/$/, "")}/${id}/`
        const result = await apiFetch<Record<string, any>>(endpoint, { clientCache: safeRefreshToken === 0 })
        if (!mounted) return
        setInitialValues(result || {})
      } catch (e: any) {
        if (!mounted) return
        setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao carregar.", "Failed to load.")))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load().catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [found, id, t, canReadDetail, canUpdate, safeRefreshToken])

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="space-y-4">
          <PageHeader
            title={t("Recurso não encontrado", "Resource not found")}
            subtitle={t(
              "Não foi possível abrir a edição solicitada.",
              "Could not open the requested edit screen."
            )}
          />
          <Link href="/education/resources" className="text-xs text-[var(--gray-700)] no-underline hover:underline">
            {t("Voltar", "Back")}
          </Link>
        </div>
      </AppLayout>
    )
  }

  const basePath = `/education/resources/${found.resource.key}`

  if (!canReadDetail || !canUpdate) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Edição indisponível", "Editing unavailable")}
            subtitle={t(
              "Este recurso de Educação não expõe leitura e edição no contrato atual da API.",
              "This Education resource does not expose both read and edit operations in the current API contract."
            )}
            actions={
              <Link href={`${basePath}/${id}`} className="text-xs text-[var(--gray-700)] no-underline hover:underline">
                {t("Voltar", "Back")}
              </Link>
            }
          />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={`${t("Editar", "Edit")} ${tr(found.resource.label)} #${id}`}
          actions={
            <Link href={`${basePath}/${id}`} className="text-xs text-[var(--gray-700)] no-underline hover:underline">
              {t("Voltar", "Back")}
            </Link>
          }
        />

        {error ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>
        ) : null}

        {loadingData ? (
          <div className="text-xs text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <AutoForm
            endpoint={`${found.resource.endpoint.replace(/\/$/, "")}/${id}/`}
            method="put"
            initialValues={initialValues || {}}
            submitLabel={t("Salvar", "Save")}
            config={getResourceFormConfig("education", found.resource.key, found.resource.endpoint)}
            onSuccess={() => router.push(`${basePath}/${id}`)}
          />
        )}
      </div>
    </AppLayout>
  )
}
