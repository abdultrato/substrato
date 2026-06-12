"use client";
import { Suspense } from "react";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";

export default function LabReceptionPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      {/* Criação manual escondida: a receção entra pelo fluxo de requisições
          (/laboratory/sample-reception), não por registo avulso. */}
      <div className="contents [&_a[href$='/reception/new']]:!hidden">
        <GeneratedResourceListPage endpoint="/clinical_laboratory/reception/" allowCreate={false} />
      </div>
    </Suspense>
  );
}
