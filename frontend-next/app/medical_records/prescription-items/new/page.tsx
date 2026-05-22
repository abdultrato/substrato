"use client";

import { Suspense } from "react";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

export default function CreatePrescriptionItemPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceCreatePage endpoint="/medical_records/prescription-items/" />
    </Suspense>
  );
}
