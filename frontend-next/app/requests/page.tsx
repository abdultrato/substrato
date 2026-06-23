"use client";

import { Suspense } from "react";
import RequestsBoardPage from "@/components/requests/RequestsBoardPage";

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <RequestsBoardPage />
    </Suspense>
  );
}
