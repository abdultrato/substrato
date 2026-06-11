import TherapyHubPage, { THERAPY_GROUPS } from "@/components/therapy/TherapyHubPage"

export default function OccupationalTherapyPage() {
  return (
    <TherapyHubPage
      discipline="OCCUPATIONAL_THERAPY"
      title="Substrato Terapia Ocupacional"
      resourceBasePath="/occupational-therapy"
      requiredGroups={THERAPY_GROUPS}
    />
  )
}
