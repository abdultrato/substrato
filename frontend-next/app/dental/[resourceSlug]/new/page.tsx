"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";
import { dentalEndpointFromSlug } from "../../resourceRegistry";

export default function DentalDynamicResourceCreatePage() {
  const params = useParams();
  const endpoint = dentalEndpointFromSlug((params as any)?.resourceSlug);

  if (!endpoint) {
    return <div className="p-4 text-sm text-[var(--gray-500)]">Recurso de odontologia indisponível.</div>;
  }

  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceCreatePage endpoint={endpoint} />
    </Suspense>
  );
}
