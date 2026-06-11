"use client"

import Link from "next/link"
import { ChevronRight, Layers } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { getModuleIcon, getResourceIcon } from "@/lib/moduleIcons"
import { GROUPS } from "@/lib/rbac"

const MODULE_LABEL_EN_BY_KEY: Record<string, string> = {
  clinical: "Clinical",
  reception: "Reception",
  equipment: "Equipment",
  entities: "Entities",
  billing: "Billing",
  payments: "Payments",
  pharmacy: "Pharmacy",
  warehouse: "ERP and WMS",
  bloodbank: "Blood bank",
  nursing: "Nursing",
  equipment_integrations: "Equipment integrations",
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
  ai_assistant: "Operational AI",
  audit: "Audit",
  dashboard: "Dashboard",
}

const MODULE_LABEL_PT_BY_KEY: Record<string, string> = {
  clinical: "Área Clínica",
  reception: "Recepção",
  equipment: "Equipamentos",
  entities: "Entidades",
  billing: "Faturação",
  payments: "Pagamentos",
  pharmacy: "Farmácia",
  warehouse: "ERP e WMS",
  bloodbank: "Banco de sangue",
  nursing: "Enfermagem",
  equipment_integrations: "Integrações de equipamentos",
  insurer: "Seguradora",
  accounting: "Contabilidade",
  consultations: "Consultas",
  education: "Educação",
  tenants: "Clientes",
  notifications: "Notificações",
  identity: "Identidade",
  medical_records: "Prontuário",
  maternity: "Maternidade",
  surgery: "Cirurgia",
  human_resources: "Recursos humanos",
  monitoring: "Monitorização",
  ai_assistant: "IA operacional",
  audit: "Auditoria",
  dashboard: "Painel",
}

export default function RecursosPage() {
  const { loading } = useAuthGuard()
  const { t, tr, isPortuguese } = useLanguage()
  const { modules, isFetching, isError } = useModulesCatalog("neutral")
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Recursos do sistema", "System resources")}
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
            const ModuleIcon = getModuleIcon(m.key)
            const previewResources = m.resources.slice(0, 8)
            const hiddenResources = Math.max(0, m.resources.length - previewResources.length)

            return (
              <Link
                key={m.key}
                href={`/resources/${m.key}`}
                className="group rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm transition-all hover:border-[var(--primary-300)] hover:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-400)]"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md border border-[var(--border)] bg-[var(--gray-50)] p-2 text-[var(--primary-700)] transition group-hover:border-[var(--primary-300)] group-hover:bg-[var(--primary-50)]">
                    <ModuleIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {isPortuguese ? (MODULE_LABEL_PT_BY_KEY[m.key] || tr(m.label)) : (MODULE_LABEL_EN_BY_KEY[m.key] || tr(m.label))}
                    </div>
                    <div className="mt-1 text-xs text-[var(--gray-500)]">
                      {isPortuguese
                        ? `${m.resources.length} ${m.resources.length === 1 ? "recurso" : "recursos"}`
                        : `${m.resources.length} ${m.resources.length === 1 ? "resource" : "resources"}`}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--gray-400)] transition group-hover:text-[var(--primary-600)]" />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--gray-600)]">
                  <Layers className="h-3.5 w-3.5 text-[var(--primary-600)]" />
                  {t("Submódulos", "Submodules")}
                </div>

                <ul className="mt-2 grid gap-1.5">
                  {previewResources.length ? (
                    previewResources.map((resource) => {
                      const ResourceIcon = getResourceIcon(m.key, resource.key)
                      return (
                        <li
                          key={`${m.key}-${resource.key}`}
                          className="flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--gray-50)] px-2 py-1.5 text-xs text-[var(--gray-700)]"
                        >
                          <ResourceIcon className="h-3.5 w-3.5 shrink-0 text-[var(--primary-600)]" />
                          <span className="truncate">{tr(resource.label)}</span>
                        </li>
                      )
                    })
                  ) : (
                    <li className="rounded-md border border-dashed border-[var(--border)] bg-[var(--gray-50)] px-2 py-2 text-xs text-[var(--gray-500)]">
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
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
