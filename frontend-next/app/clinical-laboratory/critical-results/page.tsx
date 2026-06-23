"use client";
import { Suspense } from "react";
import CriticalResultsBoard from "@/components/clinical-laboratory/CriticalResultsBoard";

export default function LabCriticalResultsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CriticalResultsBoard />
    </Suspense>
  );
}
