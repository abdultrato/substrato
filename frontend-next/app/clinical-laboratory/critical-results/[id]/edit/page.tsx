"use client";

import { Suspense } from "react";
import CriticalResultEditForm from "@/components/clinical-laboratory/CriticalResultEditForm";

export default function ClinicalLaboratoryCriticalResultsEditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CriticalResultEditForm />
    </Suspense>
  );
}
