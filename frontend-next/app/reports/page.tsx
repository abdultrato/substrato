"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import ResourceModelReportPanel from "@/components/resources/ResourceModelReportPanel"
import { GROUPS } from "@/lib/rbac"

const ALL_GROUPS = Object.values(GROUPS)

function ReportsContent() {
  const params = useSearchParams()
  const endpoint = params.get("endpoint") ?? ""
  const groupLabel = params.get("group") ?? "Recurso"
  const resourceLabel = params.get("resource") ?? ""

  return (
    <AppLayout requiredGroups={ALL_GROUPS}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Relatório corporativo"
          subtitle={`${groupLabel}${resourceLabel ? ` / ${resourceLabel}` : ""}`}
        />

        {endpoint ? (
          <ResourceModelReportPanel
            endpoint={endpoint}
            groupLabel={groupLabel}
            resourceLabel={resourceLabel}
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
