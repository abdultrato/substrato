"use client"

import { useRouter } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { PatientIntakeWizard } from "@/components/reception/PatientIntakeWizard"
import { GROUPS } from "@/lib/rbac"

const ALLOWED = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.LABORATORIO,
  GROUPS.ENFERMAGEM,
]

export default function NewPatientPage() {
  const router = useRouter()

  return (
    <AppLayout requiredGroups={ALLOWED}>
      <PatientIntakeWizard
        onClose={() => router.push("/patients")}
      />
    </AppLayout>
  )
}
