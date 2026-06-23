"use client"

import { Suspense } from "react"
import ConsultationsBoardPage from "@/components/consultations/ConsultationsBoardPage"

export default function ConsultationsMedicalConsultationsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <ConsultationsBoardPage />
    </Suspense>
  )
}
