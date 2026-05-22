"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleGroup } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function RecursosGrupoPage() {
  const params = useParams()
  const groupKey = routeParamToString((params as any)?.group)
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { t, tr } = useLanguage()
  const { modules } = useModulesCatalog("neutral")
  const moduleGroup = findModuleGroup(groupKey, modules)
  const requiredGroups = requiredGroupsForResourceGroup(groupKey)
  const podeVerIndice = userHasAnyGroup(user, [GROUPS.ADMIN])
  const hrefVoltar = podeVerIndice ? "/resources" : "/"

  if (loading) return null

  if (!moduleGroup) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="space-y-6">
          <PageHeader
            title={t("Módulo não encontrado", "Module not found")}
            subtitle={t("O módulo solicitado não existe no catálogo atual.", "The requested module does not exist in the current catalog.")}
          />
          <div className="text-sm text-gray-600">
            {t("O módulo solicitado não existe na lista atual.", "The requested module does not exist in the current list.")}
          </div>
          <Link
            href={hrefVoltar}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground-2 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("Voltar", "Back")}
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
              href={`/resources/${moduleGroup.key}/${r.key}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">
                {tr(r.label)}
              </div>
              <div className="mt-1 text-xs text-[var(--gray-500)]">
                {t("Abrir lista", "Open list")}
              </div>
            </Link>
          ))}
        </div>

        <div className="pt-2">
          <Link
            href={hrefVoltar}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground-2 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("Voltar", "Back")}
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
