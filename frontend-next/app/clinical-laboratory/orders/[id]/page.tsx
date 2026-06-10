"use client";
import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";
import OrderItemsSection from "@/components/clinical-laboratory/OrderItemsSection";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/clinical_laboratory/order/">
        <OrderItemsSection />
      </GeneratedResourceDetailPage>
    </Suspense>
  );
}
