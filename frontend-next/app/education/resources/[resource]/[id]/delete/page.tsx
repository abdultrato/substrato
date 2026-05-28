"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch } from "@/lib/api"
import { EDUCATION_REQUIRED_GROUPS, getEducationResource } from "@/lib/education/resources"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

function pickRecordLabel(data: Record<string, any> | null) {
  if (!data) return "-"
  const labelKeys = ["custom_id", "id_custom", "code", "student_code", "teacher_code", "name", "title"]
  for (const key of labelKeys) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return String(data.id || "-")
}

export default function EducationResourceDeletePage() {
  const params = useParams()
  const resourceKey = routeParamToString((params as any)?.resource)
  const id = routeParamToString((params as any)?.id)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog()
  const router = useRouter()
  const found = getEducationResource(modules, resourceKey)

  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<Record<string, any> | null>(null)
  const detailEndpoint = found ? `${ensureTrailingSlash(found.resource.endpoint)}{id}/` : ""
  const canReadDetail = found ? hasOpenApiMethod(detailEndpoint, "get") : false
  const canDelete = found ? hasOpenApiMethod(detailEndpoint, "delete") : false

  const loadRecord = useCallback(async () => {
    if (!found || !canReadDetail) {
      setLoadingData(false)
      return
    }
    try {
      setLoadingData(true)
      setError(null)
      const endpoint = `${ensureTrailingSlash(found.resource.endpoint)}${id}/`
      const result = await apiFetch<Record<string, any>>(endpoint)
      setRecord(result || null)
    } catch (e: any) {
      setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao carregar.", "Failed to load.")))
    } finally {
      setLoadingData(false)
    }
  }, [found, id, t, canReadDetail])

  useEffect(() => {
    loadRecord().catch(() => undefined)
  }, [loadRecord])

  async function handleDelete() {
    if (!found || !canDelete) return
    try {
      setSubmitting(true)
      setError(null)
      const endpoint = `${ensureTrailingSlash(found.resource.endpoint)}${id}/`
      await apiFetch(endpoint, { method: "DELETE" })
      router.push(`/education/resources/${found.resource.key}`)
    } catch (e: any) {
      setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao apagar.", "Failed to delete.")))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="space-y-4">
          <PageHeader
            title={t("Recurso não encontrado", "Resource not found")}
            subtitle={t(
              "Não foi possível abrir a tela de remoção.",
              "Could not open delete screen."
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

  if (!canReadDetail || !canDelete) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <PageHeader
            title={t("Remoção indisponível", "Deletion unavailable")}
            subtitle={t(
              "Este recurso de Educação não expõe leitura e remoção no contrato atual da API.",
              "This Education resource does not expose both read and delete operations in the current API contract."
            )}
            actions={
              <Link href={`${basePath}/${id}`} className="text-xs text-[var(--gray-700)] underline">
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
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader
          title={`${t("Apagar", "Delete")} ${tr(found.resource.label)} #${id}`}
          subtitle={t(
            "Confirme a remoção do registo.",
            "Confirm record deletion."
          )}
          actions={
            <Link href={`${basePath}/${id}`} className="text-xs text-[var(--gray-700)] underline">
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
          <div className="space-y-3 border border-red-300 bg-red-50 p-3">
            <div className="text-xs font-semibold text-red-800">
              {t("Esta ação é irreversível.", "This action is irreversible.")}
            </div>
            <div className="text-xs text-red-900">
              {t("Registo selecionado:", "Selected record:")} <strong>{pickRecordLabel(record)}</strong>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center border border-red-300 bg-red-600 px-2 py-1 text-xs text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {submitting ? t("Apagando...", "Deleting...") : t("Confirmar apagamento", "Confirm delete")}
              </button>
              <Link
                href={`${basePath}/${id}`}
                className="inline-flex items-center border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                {t("Cancelar", "Cancel")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
