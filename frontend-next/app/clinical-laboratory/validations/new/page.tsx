"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

// Criação de validação em contexto: o resultado vem pré-selecionado via
// `?result=<id>` a partir do detalhe do resultado (não é criação isolada).
function CreateValidation() {
  const params = useSearchParams();
  const result = params?.get("result");
  const initialValues = result ? { result } : undefined;
  return (
    <GeneratedResourceCreatePage
      endpoint="/clinical_laboratory/validation/"
      initialValues={initialValues}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CreateValidation />
    </Suspense>
  );
}
