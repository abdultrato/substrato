"use client";

import { Suspense } from "react";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";

export default function IncidentsIncidentsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceListPage endpoint="/equipment/incident/" />
    </Suspense>
  );
}
