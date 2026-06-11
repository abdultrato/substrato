"use client";

import { Suspense } from "react";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

export default function ClinicalLaboratoryBiosafetyExposureIncidentsCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceCreatePage endpoint="/clinical_laboratory/exposure_incident/" />
    </Suspense>
  );
}
