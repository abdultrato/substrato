"use client";

import { Suspense } from "react";
import CriticalResultDetail from "@/components/clinical-laboratory/CriticalResultDetail";

export default function ClinicalLaboratoryCriticalResultsDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CriticalResultDetail />
    </Suspense>
  );
}
