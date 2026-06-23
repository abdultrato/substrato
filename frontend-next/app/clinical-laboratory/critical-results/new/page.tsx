"use client";

import { Suspense } from "react";
import CriticalResultCreateForm from "@/components/clinical-laboratory/CriticalResultCreateForm";

export default function ClinicalLaboratoryCriticalResultsCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CriticalResultCreateForm />
    </Suspense>
  );
}
