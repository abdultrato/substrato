"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function PublicHealthDashboardListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Saude publica / Dashboard"
        endpoint="/public_health/dashboard/"
        groupLabel="Saude publica"
        resourceLabel="Dashboard"
        requiredGroups={requiredGroupsForResourceGroup("public_health")}
      />
    </Suspense>
  );
}
