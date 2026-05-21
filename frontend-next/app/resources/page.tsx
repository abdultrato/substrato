"use client"

import Link from "next/link"
import { ChevronRight, Layers } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import { GROUPS } from "@/lib/rbac"

const MODULE_LABEL_EN_BY_KEY: Record<string, string> = {
  clinical: "Clinical",
  reception: "Reception",
  equipment: "Equipment",
  entities: "Entities",
  billing: "Billing",
  payments: "Payments",
  pharmacy: "Pharmacy",
  bloodbank: "Blood bank",
  nursing: "Nursing",
  insurer: "Insurer",
  accounting: "Accounting",
  consultations: "Consultations",
  education: "Education",
  tenants: "Tenants",
  notifications: "Notifications",
  identity: "Identity",
  medical_records: "Medical records",
  maternity: "Maternity",
  surgery: "Surgery",
  human_resources: "Human resources",
  monitoring: "Monitoring",
  audit: "Audit",
  dashboard: "Dashboard",
}

export default function RecursosPage() {
  const { loading } = useAuthGuard()
  const { t, tr, isPortuguese } = useLanguage()
  const workspaceScope = useWorkspaceScope()
  const { modules, isFetching, isError } = useModulesCatalog(workspaceScope)
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Recursos do sistema", "System resources")}
          subtitle={t("Navegue pelos módulos disponíveis no sistema.", "Browse available modules in the system.")}
        />

        {isFetching ? (
          <div className="text-xs text-[var(--gray-500)]">
            {t("Atualizando recursos do backend...", "Updating backend resources...")}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t(
              "Falha ao sincronizar com o backend agora. Mostrando catálogo local.",
              "Could not sync with backend now. Showing local catalog."
            )}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const previewResources = m.resources.slice(0, 8)
            const hiddenResources = Math.max(0, m.resources.length - previewResources.length)

            return (
              <Link
                key={m.key}
                href={`/resources/${m.key}`}
                className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
              >
                <div className="text-sm font-semibold text-[var(--text)]">
                  {isPortuguese ? m.label : (MODULE_LABEL_EN_BY_KEY[m.key] || tr(m.label))}
                </div>
                <div className="mt-1 text-xs text-[var(--gray-500)]">
                  {isPortuguese
                    ? `${m.resources.length} ${m.resources.length === 1 ? "recurso" : "recursos"}`
                    : `${m.resources.length} ${m.resources.length === 1 ? "resource" : "resources"}`}
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-full z-30 pt-2 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <div className="translate-y-1 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-3 shadow-2xl backdrop-blur-sm transition duration-200 group-hover:translate-y-0 group-focus-visible:translate-y-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-600)]">
                          <Layers className="h-3.5 w-3.5 text-[var(--primary-600)]" />
                          {t("Submódulos", "Submodules")}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--gray-500)]">
                          {t(
                            "Visão rápida dos itens disponíveis neste módulo.",
                            "Quick view of the items available in this module.",
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--gray-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gray-700)]">
                        {m.resources.length}
                      </span>
                    </div>

                    <ul className="mt-3 grid max-h-44 gap-1.5 overflow-auto pr-1">
                      {previewResources.length ? (
                        previewResources.map((resource) => (
                          <li
                            key={`${m.key}-${resource.key}`}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--gray-50)] px-2 py-1.5 text-xs text-[var(--gray-700)]"
                          >
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--primary-600)]" />
                            <span className="truncate">{tr(resource.label)}</span>
                          </li>
                        ))
                      ) : (
                        <li className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--gray-50)] px-2 py-2 text-xs text-[var(--gray-500)]">
                          {t("Sem submódulos disponíveis.", "No submodules available.")}
                        </li>
                      )}
                    </ul>

                    {hiddenResources > 0 ? (
                      <div className="mt-2 text-[11px] font-medium text-[var(--gray-500)]">
                        {isPortuguese
                          ? `+${hiddenResources} outros submódulos`
                          : `+${hiddenResources} more submodules`}
                      </div>
                    ) : null}
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
