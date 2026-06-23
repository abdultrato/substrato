"use client";

import { Suspense } from "react";
import RequestDetailPage from "@/components/requests/RequestDetailPage";

export default function RequestDetailRoute() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <RequestDetailPage />
    </Suspense>
  );
}
