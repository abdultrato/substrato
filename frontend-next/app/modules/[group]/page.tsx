"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import {
  domainGroupFor,
  domainModuleDefinitionsForDomain,
  isDomainGroupKey,
  primaryHrefForDomainModule,
} from "@/lib/domainModules"
import { getResourceIcon } from "@/lib/moduleIcons"
import { findModuleGroup } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function ModuloGrupoPage() {
  const params = useParams()
  const groupKey = routeParamToString((params as any)?.group)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog("neutral")
  const domainGroup = domainGroupFor(groupKey)
  const isDomainGroup = isDomainGroupKey(groupKey)
  const moduleGroup = findModuleGroup(groupKey, modules)
  const allGroups = Object.values(GROUPS)
  const requiredGroups =
    isDomainGroup ? allGroups : moduleGroup ? requiredGroupsForResourceGroup(moduleGroup.key) : [GROUPS.ADMIN, GROUPS.LABORATORIO]

  if (loading) return null

  if (isDomainGroup && domainGroup) {
    const definitions = domainModuleDefinitionsForDomain(domainGroup.key)
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="space-y-6">
          <PageHeader
            title={tr(domainGroup.label)}
            subtitle={tr(domainGroup.description)}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {definitions.map((definition) => {
              const href = primaryHrefForDomainModule(definition, modules)
              const ref = definition.resources[0]
              const ResourceIcon = getResourceIcon(ref?.groupKey || definition.domain, ref?.resourceKey || definition.key)
              const statusLabel =
                definition.status === "implemented"
                  ? t("Implementado", "Implemented")
                  : definition.status === "partial"
                    ? t("Parcial", "Partial")
                    : t("Planeado", "Planned")
              const content = (
                <div className="flex h-full items-start gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-800">
                    <ResourceIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">{tr(definition.label)}</div>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-gray-500">{tr(definition.description)}</div>
                    {definition.extends?.length ? (
                      <div className="mt-2 text-[11px] text-gray-500">
                        {t("Reutiliza:", "Reuses:")} {definition.extends.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              )

              if (!href) {
                return (
                  <div
                    key={definition.key}
                    className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 opacity-80"
                  >
                    {content}
                  </div>
                )
              }

              return (
                <Link
                  key={definition.key}
                  href={href}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  {content}
                </Link>
              )
            })}
          </div>

          <div className="pt-2">
            <Link href="/modules" className="text-sm text-gray-700 no-underline hover:underline">
              {t("Voltar", "Back")}
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!moduleGroup) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
        <div className="space-y-6">
          <PageHeader
            title={t("Módulo não encontrado", "Module not found")}
            subtitle={t("O módulo solicitado não existe no catálogo atual.", "The requested module does not exist in the current catalog.")}
          />
          <div className="text-sm text-gray-600">
            {t("O módulo solicitado não existe na lista atual.", "The requested module does not exist in the current list.")}
          </div>
          <Link href="/modules" className="text-sm text-gray-700 no-underline hover:underline">
            {t("Voltar para módulos", "Back to modules")}
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title={tr(moduleGroup.label)}
          subtitle={t("Recursos disponíveis", "Available resources")}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {moduleGroup.resources.map((r) => {
            const ResourceIcon = getResourceIcon(moduleGroup.key, r.key)
            return (
              <Link
                key={r.key}
                href={`/modules/${moduleGroup.key}/${r.key}`}
                className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-gray-800">
                    <ResourceIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{tr(r.label)}</div>
                    <div className="mt-1 text-xs text-gray-500">{t("Abrir lista", "Open list")}</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="pt-2">
          <Link href="/modules" className="text-sm text-gray-700 no-underline hover:underline">
            {t("Voltar", "Back")}
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
