"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import {
  EDUCATION_REQUIRED_GROUPS,
  EDUCATION_RESOURCE_DESCRIPTORS,
  getEducationGroup,
} from "@/lib/education/resources"

export default function EducationResourcesPage() {
  const { loading } = useAuthGuard()
  const { t, tr, isPortuguese } = useLanguage()
  const { modules } = useModulesCatalog()

  if (loading) return null

  const educationGroup = getEducationGroup(modules)
  const resources = educationGroup?.resources || []
  const resourceMap = new Map(resources.map((item) => [item.key, item]))

  return (
    <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
      <div className="space-y-4">
        <PageHeader
          title={t("Educação • Recursos", "Education • Resources")}
          subtitle={t(
            "Todas as telas de consumo frontend para recursos de Educação.",
            "All frontend consumption screens for Education resources."
          )}
          actions={
            <Link
              href="/education"
              className="inline-flex items-center border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
            >
              {t("Voltar", "Back")}
            </Link>
          }
        />

        {!resources.length ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t(
              "Não foi possível carregar o catálogo de recursos de Educação.",
              "Could not load Education resource catalog."
            )}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {EDUCATION_RESOURCE_DESCRIPTORS.map((descriptor) => {
            const resource = resourceMap.get(descriptor.key)
            const label = resource ? tr(resource.label) : (isPortuguese ? descriptor.labelPt : descriptor.labelEn)
            const description = isPortuguese ? descriptor.descriptionPt : descriptor.descriptionEn
            return (
              <div key={descriptor.key} className="border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <div className="font-semibold text-[var(--text)]">{label}</div>
                <div className="mt-1 text-xs text-[var(--gray-600)]">{description}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Link
                    href={`/education/resources/${descriptor.key}`}
                    className="inline-flex items-center border border-[var(--border)] bg-[var(--gray-100)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-200)]"
                  >
                    {t("Listar", "List")}
                  </Link>
                  <Link
                    href={`/education/resources/${descriptor.key}/new`}
                    className="inline-flex items-center border border-[var(--border)] bg-[var(--primary-600)] px-2 py-1 text-xs text-white transition hover:bg-[var(--primary-700)]"
                  >
                    {t("Criar", "Create")}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
