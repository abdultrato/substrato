"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import ResourceModelReportPanel from "@/components/resources/ResourceModelReportPanel"
import { GROUPS } from "@/lib/rbac"
import { BarChart3 } from "lucide-react"

const ALL_GROUPS = Object.values(GROUPS)

function ReportsContent() {
  const params = useSearchParams()
  const endpoint = params.get("endpoint") ?? ""
  const groupLabel = params.get("group") ?? "Recurso"
  const resourceLabel = params.get("resource") ?? ""

  return (
    <AppLayout requiredGroups={ALL_GROUPS}>
      <div className="mx-auto w-full max-w-4xl space-y-3">

        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
              <BarChart3 size={16} />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Relatório corporativo</h1>
              <p className="text-[11px] text-muted-foreground">
                {groupLabel}{resourceLabel ? ` / ${resourceLabel}` : ""}
              </p>
            </div>
          </div>
        </div>

        {endpoint ? (
          <ResourceModelReportPanel
            endpoint={endpoint}
            groupLabel={groupLabel}
            resourceLabel={resourceLabel}
          />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/15 dark:text-amber-300">
            Nenhum recurso especificado. Aceda a esta página a partir da listagem de um recurso.
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  )
}
