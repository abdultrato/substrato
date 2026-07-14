"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

export default function ClinicalLaboratoryMolecularCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <MolecularCreateFromQueue />
    </Suspense>
  );
}

function MolecularCreateFromQueue() {
  const searchParams = useSearchParams();
  const initialValues: Record<string, any> = {};

  ["order_item", "sample", "assay"].forEach((key) => {
    const value = searchParams.get(key);
    if (value) initialValues[key] = key === "assay" ? value : Number(value);
  });

  return <GeneratedResourceCreatePage endpoint="/clinical_laboratory/molecular_result/" initialValues={initialValues} />;
}
