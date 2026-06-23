"use client";
import { Suspense } from "react";
import CollectionsBoardPage from "@/components/clinical-laboratory/CollectionsBoardPage";

export default function LabCollectionsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CollectionsBoardPage />
    </Suspense>
  );
}
