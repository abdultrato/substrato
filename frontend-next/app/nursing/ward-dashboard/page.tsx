"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function NursingWardDashboardListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Enfermagem / Painel da enfermaria"
        subtitle="Resumo assistencial de enfermaria conforme contrato atual da API."
        endpoint="/nursing/ward_dashboard/"
        groupLabel="Enfermagem"
        resourceLabel="Painel da enfermaria"
        requiredGroups={requiredGroupsForResourceGroup("nursing")}
      />
    </Suspense>
  );
}
