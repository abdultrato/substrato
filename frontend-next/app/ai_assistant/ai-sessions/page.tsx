"use client";

import { Suspense } from "react";
import { GeneratedResourceListPage } from "@/components/resources/GeneratedResourcePages";

export default function Ai_AssistantAiSessionsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceListPage endpoint="/ai/assistant/sessions/" />
    </Suspense>
  );
}
