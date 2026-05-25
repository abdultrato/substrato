"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { getModuleIcon } from "@/lib/moduleIcons"
import { GROUPS } from "@/lib/rbac"

export default function ModulosPage() {
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const { modules, isFetching, isError } = useModulesCatalog("neutral")
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Módulos", "Modules")}
          subtitle={t("Acesso rápido a todos os apps disponíveis no sistema.", "Quick access to all available apps in the system.")}
        />

        {isFetching ? (
          <div className="text-xs text-muted-foreground">
            {t("Sincronizando catálogo com o backend...", "Syncing catalog with backend...")}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t(
              "Não foi possível atualizar o catálogo em tempo real. Exibindo estrutura local.",
              "Unable to update catalog in real time. Showing local structure."
            )}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const ModuleIcon = getModuleIcon(m.key)
            return (
              <Link
                key={m.key}
                href={`/modules/${m.key}`}
                className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-border bg-background p-2 text-foreground">
                    <ModuleIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{tr(m.label)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t(`${m.resources.length} recursos`, `${m.resources.length} resources`)}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
