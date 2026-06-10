"use client";
import { Suspense } from "react";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";

// Fila de validações (revisão pelo supervisor). A criação não é isolada:
// acontece em contexto, a partir do detalhe do resultado.
// Ver FRONTEND_API_EXPOSURE_MATRIX.md / readiness/clinical_laboratory.md.
export default function LabValidationsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceListPage endpoint="/clinical_laboratory/validation/" allowCreate={false} />
    </Suspense>
  );
}
