"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function MonitoringTelemetryListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Monitoramento / Telemetria"
        endpoint="/monitoring/telemetry/"
        groupLabel="Monitoramento"
        resourceLabel="Telemetria"
        createHref="/monitoring/telemetry/new"
        requiredGroups={requiredGroupsForResourceGroup("monitoring")}
      />
    </Suspense>
  );
}
