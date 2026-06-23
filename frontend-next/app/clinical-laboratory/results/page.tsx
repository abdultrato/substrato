"use client";
import { Suspense } from "react";
import ResultsBoardPage from "@/components/clinical-laboratory/ResultsBoardPage";

export default function LabResultsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ResultsBoardPage />
    </Suspense>
  );
}
