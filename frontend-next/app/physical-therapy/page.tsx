import TherapyHubPage, { THERAPY_GROUPS } from "@/components/therapy/TherapyHubPage"

export default function PhysicalTherapyPage() {
  return (
    <TherapyHubPage
      discipline="SPECIALIZED_PHYSIOTHERAPY"
      title="Substrato Fisioterapia Especializada"
      resourceBasePath="/physical-therapy"
      requiredGroups={THERAPY_GROUPS}
    />
  )
}
