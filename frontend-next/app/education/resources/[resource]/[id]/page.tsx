"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch } from "@/lib/api"
import { EDUCATION_REQUIRED_GROUPS, getEducationResource } from "@/lib/education/resources"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { routeParamToString } from "@/lib/routeParams"

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

export default function EducationResourceDetailPage() {
  const params = useParams()
  const resourceKey = routeParamToString((params as any)?.resource)
  const id = routeParamToString((params as any)?.id)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog()
  const found = getEducationResource(modules, resourceKey)

  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, any> | null>(null)

  const loadDetails = useCallback(async () => {
    if (!found) return
    try {
      setLoadingData(true)
      setError(null)
      const endpoint = `${ensureTrailingSlash(found.resource.endpoint)}${id}/`
      const result = await apiFetch<Record<string, any>>(endpoint)
      setData(result || null)
    } catch (e: any) {
      setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao carregar.", "Failed to load.")))
    } finally {
      setLoadingData(false)
    }
  }, [found, id, t])

  useEffect(() => {
    loadDetails().catch(() => undefined)
  }, [loadDetails])

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="space-y-4">
          <PageHeader
            title={t("Recurso não encontrado", "Resource not found")}
            subtitle={t(
              "Não foi possível carregar o detalhe solicitado.",
              "Could not load the requested detail."
            )}
          />
          <Link href="/education/resources" className="text-xs text-[var(--gray-700)] underline">
            {t("Voltar", "Back")}
          </Link>
        </div>
      </AppLayout>
    )
  }

  const basePath = `/education/resources/${found.resource.key}`

  return (
    <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
      <div className="space-y-4">
        <PageHeader
          title={`${tr(found.resource.label)} #${id}`}
          subtitle={t("Visualização do registo.", "Record details view.")}
          actions={
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href={`${basePath}/${id}/edit`}
                className="inline-flex items-center border border-[var(--border)] bg-[var(--gray-100)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-200)]"
              >
                {t("Editar", "Edit")}
              </Link>
              <Link
                href={`${basePath}/${id}/delete`}
                className="inline-flex items-center border border-red-300 bg-red-600 px-2 py-1 text-xs text-white transition hover:bg-red-500"
              >
                {t("Apagar", "Delete")}
              </Link>
              <Link
                href={basePath}
                className="inline-flex items-center border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                {t("Voltar", "Back")}
              </Link>
            </div>
          }
        />

        {error ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>
        ) : null}

        {loadingData ? (
          <div className="text-xs text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <ResourceDetailsCard endpoint={found.resource.endpoint} data={data || {}} />
        )}
      </div>
    </AppLayout>
  )
}

