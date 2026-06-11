"use client";

import { Suspense } from "react";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function ReceptionWorkspaceListPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResourceListPage
        title="Recepcao / Workspace"
        endpoint="/reception/workspace/"
        groupLabel="Recepcao"
        resourceLabel="Workspace"
        requiredGroups={requiredGroupsForResourceGroup("reception")}
      />
    </Suspense>
  );
}
