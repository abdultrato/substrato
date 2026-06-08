"use client";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";
import { labEndpointFromSlug } from "../resourceRegistry";

export default function LabDynamicResourcePage() {
  const params = useParams();
  const endpoint = labEndpointFromSlug(params?.resourceSlug as string | string[] | undefined);

  if (!endpoint) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Recurso de laboratório não encontrado.
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceListPage endpoint={endpoint} />
    </Suspense>
  );
}
