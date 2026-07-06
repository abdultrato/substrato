"use client"

import { useRouter } from "next/navigation"
import AppLayout from "@/components/layout/AppLayout"
import { PatientIntakeWizard } from "@/components/reception/PatientIntakeWizard"
import { GROUPS } from "@/lib/rbac"

const ALLOWED = [GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.RECEPCAO]

export default function NewDonorPage() {
  const router = useRouter()
  return (
    <AppLayout requiredGroups={ALLOWED}>
      <PatientIntakeWizard
        onClose={() => router.push("/bloodbank")}
        onSuccess={() => router.push("/bloodbank")}
      />
    </AppLayout>
  )
}
