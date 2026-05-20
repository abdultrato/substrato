"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
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
  const { modules, isFetching, isError } = useModulesCatalog()
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
          {modules.map((m) => (
            <Link
              key={m.key}
              href={`/resources/${m.key}`}
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm transition hover:bg-[var(--gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">
                {isPortuguese ? m.label : (MODULE_LABEL_EN_BY_KEY[m.key] || tr(m.label))}
              </div>
              <div className="mt-1 text-xs text-[var(--gray-500)]">
                {isPortuguese
                  ? `${m.resources.length} ${m.resources.length === 1 ? "recurso" : "recursos"}`
                  : `${m.resources.length} ${m.resources.length === 1 ? "resource" : "resources"}`}
              </div>

              <div className="pointer-events-none absolute inset-x-3 top-full z-20 mt-2 translate-y-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                  {t("Submódulos", "Submodules")}
                </div>
                <ul className="mt-2 max-h-44 space-y-1 overflow-auto pr-1">
                  {m.resources.length ? (
                    m.resources.map((resource) => (
                      <li key={`${m.key}-${resource.key}`} className="text-xs leading-tight text-[var(--gray-700)]">
                        {tr(resource.label)}
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-[var(--gray-500)]">
                      {t("Sem submódulos disponíveis.", "No submodules available.")}
                    </li>
                  )}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
