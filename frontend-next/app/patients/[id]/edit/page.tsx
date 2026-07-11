"use client"

import { useParams, useRouter } from "next/navigation"

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

export default function EditPatientPage() {
  const router = useRouter()
  const { id } = useParams() as { id?: string | string[] }
  const patientId = Number(Array.isArray(id) ? id[0] : id)

  if (!Number.isFinite(patientId)) return null

  return (
    <AppLayout requiredGroups={ALLOWED}>
      <PatientIntakeWizard
        patientId={patientId}
        onClose={() => router.push(`/patients/${patientId}`)}
        onSuccess={(saved) => router.push(`/patients/${saved.id}`)}
      />
    </AppLayout>
  )
}
