"use client";

import { Suspense } from "react";
import { GeneratedResourceEditPage } from "@/components/resources/GeneratedResourcePages";

export default function WarehousePurchaseOrderLinesEditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceEditPage endpoint="/warehouse/purchase_order_line/" />
    </Suspense>
  );
}
