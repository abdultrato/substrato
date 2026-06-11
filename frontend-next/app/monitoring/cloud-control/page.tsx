"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function MonitoringCloudControlListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Monitoramento / Cloud control"
        endpoint="/monitoring/cloud_control/"
        groupLabel="Monitoramento"
        resourceLabel="Cloud control"
        createHref="/monitoring/cloud-control/new"
        requiredGroups={requiredGroupsForResourceGroup("monitoring")}
      />
    </Suspense>
  );
}
