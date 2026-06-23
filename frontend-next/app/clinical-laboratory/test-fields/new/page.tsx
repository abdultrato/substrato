"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

// Criação de campo de exame em contexto: o exame vem pré-selecionado via
// `?test=<id>` a partir do detalhe do exame (não é criação isolada).
function CreateTestField() {
  const params = useSearchParams();
  const test = params?.get("test");
  const initialValues = test ? { test } : undefined;
  return (
    <GeneratedResourceCreatePage
      endpoint="/clinical_laboratory/test_field/"
      initialValues={initialValues}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <CreateTestField />
    </Suspense>
  );
}
