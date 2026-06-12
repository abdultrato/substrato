"use client";
import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";
import OrderItemsSection from "@/components/clinical-laboratory/OrderItemsSection";
import OrderSectorsSection from "@/components/clinical-laboratory/OrderSectorsSection";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/clinical_laboratory/order/">
        <OrderSectorsSection />
        <OrderItemsSection />
      </GeneratedResourceDetailPage>
    </Suspense>
  );
}
