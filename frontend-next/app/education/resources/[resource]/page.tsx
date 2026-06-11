"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import ResourceListPage from "@/components/resources/ResourceListPage"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { EDUCATION_REQUIRED_GROUPS, getEducationResource } from "@/lib/education/resources"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity"
import { routeParamToString } from "@/lib/routeParams"

export default function EducationResourceListPage() {
  const params = useParams()
  const resourceKey = routeParamToString((params as any)?.resource)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog()
  const found = getEducationResource(modules, resourceKey)

  if (loading) return null

  if (!found) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="space-y-4">
          <PageHeader
            title={t("Recurso não encontrado", "Resource not found")}
            subtitle={t(
              "O recurso solicitado não está disponível em Educação.",
              "The requested resource is not available in Education."
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
  const canList = hasOpenApiMethod(found.resource.endpoint, "get")
  const canCreate = hasOpenApiMethod(found.resource.endpoint, "post")

  if (!canList) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="space-y-4">
          <PageHeader
            title={t("Listagem indisponível", "List unavailable")}
            subtitle={t(
              "Este recurso de Educação não expõe listagem no contrato atual da API.",
              "This Education resource does not expose listing in the current API contract."
            )}
          />
          <Link href="/education/resources" className="text-xs text-[var(--gray-700)] no-underline hover:underline">
            {t("Voltar", "Back")}
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <ResourceListPage
      title={`Educação / ${tr(found.resource.label)}`}
      endpoint={found.resource.endpoint}
      adminListHref={found.resource.adminListHref}
      createHref={canCreate ? `${basePath}/new` : undefined}
      rowHref={(row) => buildRecordDetailHref(basePath, row)}
      requiredGroups={EDUCATION_REQUIRED_GROUPS}
    />
  )
}
