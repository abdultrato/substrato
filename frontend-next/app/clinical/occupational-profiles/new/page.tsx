"use client";

import { Suspense } from "react";
import { GeneratedResourceCreatePage } from "@/components/resources/GeneratedResourcePages";

export default function CreateOccupationalProfilePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceCreatePage endpoint="/clinical/occupational_profile/" />
    </Suspense>
  );
}
