"use client";
import { Suspense } from "react";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";

// Campos de exame (ExameCampo) são segunda camada: a criação/edição acontece em
// contexto, a partir do detalhe do exame. Aqui é apenas a lista de consulta.
export default function LabTestFieldsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceListPage endpoint="/clinical_laboratory/test_field/" allowCreate={false} />
    </Suspense>
  );
}
