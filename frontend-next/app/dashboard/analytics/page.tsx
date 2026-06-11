"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function DashboardAnalyticsListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Dashboard / Analytics"
        subtitle="Visao operacional consolidada exposta pelo contrato de analytics."
        endpoint="/dashboard/analytics/"
        groupLabel="Dashboard"
        resourceLabel="Analytics"
        requiredGroups={requiredGroupsForResourceGroup("dashboard")}
      />
    </Suspense>
  );
}
