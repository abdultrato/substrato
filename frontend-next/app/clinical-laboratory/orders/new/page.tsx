"use client";
import { Suspense } from "react";
import NewLabOrderForm from "@/components/clinical-laboratory/NewLabOrderForm";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <NewLabOrderForm />
    </Suspense>
  );
}
