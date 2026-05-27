"use client";

import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";

export default function AiOperationalTasksDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/ai/assistant/tasks/" />
    </Suspense>
  );
}
