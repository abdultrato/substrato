"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AutoForm from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { EDUCATION_REQUIRED_GROUPS, getEducationResource } from "@/lib/education/resources"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { createResourceActionLabel } from "@/lib/resources/createLabels"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { getTenantIdFromUser } from "@/lib/tenancy"

export default function EducationResourceCreatePage() {
  const params = useParams()
  const resourceKey = routeParamToString((params as any)?.resource)
  const { loading } = useAuthGuard()
  const { t, tr, language } = useLanguage()
  const { user } = useAuth()
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
              "Não foi possível abrir o formulário solicitado.",
              "Could not open the requested form."
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
  const canCreate = hasOpenApiMethod(found.resource.endpoint, "post")
  if (!canCreate) {
    return (
      <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <PageHeader
            title={t("Criação indisponível", "Creation unavailable")}
            subtitle={t(
              "Este recurso de Educação não expõe criação no contrato atual da API.",
              "This Education resource does not expose creation in the current API contract."
            )}
            actions={
              <Link href={basePath} className="text-xs text-[var(--gray-700)] underline">
                {t("Voltar", "Back")}
              </Link>
            }
          />
        </div>
      </AppLayout>
    )
  }

  const cfg = getResourceFormConfig("education", found.resource.key, found.resource.endpoint)
  const resourceLabel = tr(found.resource.label)
  const createActionLabel = createResourceActionLabel(resourceLabel, language)
  const tenantId = getTenantIdFromUser(user)
  const makeTenantEditable = !!cfg?.somenteLeituraCampos?.includes("tenant") && !tenantId
  const effectiveConfig = makeTenantEditable
    ? {
        ...cfg,
        somenteLeituraCampos: (cfg?.somenteLeituraCampos || []).filter((field) => field !== "tenant"),
      }
    : cfg
  const initialValues = tenantId ? { tenant: tenantId } : {}

  return (
    <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={createActionLabel}
          subtitle={t(
            "Criação de registo em Educação.",
            "Create a new Education record."
          )}
          actions={
            <Link href={basePath} className="text-xs text-[var(--gray-700)] underline">
              {t("Voltar", "Back")}
            </Link>
          }
        />

        <AutoForm
          endpoint={found.resource.endpoint}
          method="post"
          submitLabel={createActionLabel}
          initialValues={initialValues}
          config={effectiveConfig}
          onSuccess={() => {
            window.location.href = basePath
          }}
        />
      </div>
    </AppLayout>
  )
}
