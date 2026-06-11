"use client";

import { Suspense } from "react";
import { GeneratedResourceEditPage } from "@/components/resources/GeneratedResourcePages";

export default function ClinicalLaboratoryCriticalResultsEditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceEditPage endpoint="/clinical_laboratory/critical_notification/" />
    </Suspense>
  );
}
