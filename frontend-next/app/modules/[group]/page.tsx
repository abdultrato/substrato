"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import { findModuleGroup } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

export default function ModuloGrupoPage() {
  const params = useParams()
  const groupKey = routeParamToString((params as any)?.group)
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const workspaceScope = useWorkspaceScope()
  const { modules } = useModulesCatalog(workspaceScope)
  const moduleGroup = findModuleGroup(groupKey, modules)
  const allGroups = Object.values(GROUPS)
  const requiredGroups =
    moduleGroup?.key === "equipamentos" ? allGroups : [GROUPS.ADMIN, GROUPS.LABORATORIO]

  if (loading) return null

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
          <Link href="/modules" className="text-sm text-gray-700 underline">
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
          {moduleGroup.resources.map((r) => (
            <Link
              key={r.key}
              href={`/modules/${moduleGroup.key}/${r.key}`}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="text-sm font-semibold text-gray-900">{tr(r.label)}</div>
              <div className="mt-1 text-xs text-gray-500">{t("Abrir lista", "Open list")}</div>
            </Link>
          ))}
        </div>

        <div className="pt-2">
          <Link href="/modules" className="text-sm text-gray-700 underline">
            {t("Voltar", "Back")}
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
