"use client";

import { Suspense } from "react";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";

export default function IdentityPasswordResetTokensDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/identity/passwordresettoken/" />
    </Suspense>
  );
}
