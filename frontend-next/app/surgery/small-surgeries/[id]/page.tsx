"use client";

import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";

export default function SmallSurgeriesDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/surgery/small-surgeries/" />
    </Suspense>
  );
}
