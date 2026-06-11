"use client";

import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";

export default function WarehouseStorageLocationsDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/warehouse/storage_location/" />
    </Suspense>
  );
}
