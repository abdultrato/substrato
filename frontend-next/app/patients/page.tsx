"use client";

import { Suspense } from "react";
import PatientsListPage from "@/components/patients/PatientsListPage";

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <PatientsListPage />
    </Suspense>
  );
}
