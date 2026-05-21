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
              "O recurso solicitado não está disponível em Education.",
              "The requested resource is not available in Education."
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
    <ResourceListPage
      title={`Education / ${tr(found.resource.label)}`}
      subtitle={t(
        "Listagem operacional do recurso selecionado.",
        "Operational listing of the selected resource."
      )}
      endpoint={found.resource.endpoint}
      adminListHref={found.resource.adminListHref}
      createHref={`${basePath}/new`}
      rowHref={(row) => `${basePath}/${row.id ?? row.pk ?? row.custom_id ?? row.id_custom ?? ""}`}
      requiredGroups={EDUCATION_REQUIRED_GROUPS}
    />
  )
}

