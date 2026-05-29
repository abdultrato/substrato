import TherapyHubPage, { THERAPY_GROUPS } from "@/components/therapy/TherapyHubPage"

export default function PhysicalTherapyPage() {
  return (
    <TherapyHubPage
      discipline="SPECIALIZED_PHYSIOTHERAPY"
      title="Substrato Fisioterapia Especializada"
      subtitle="Planos motores especializados, acompanhamento de evolução funcional e integração com prescrições de fisioterapia e fonoaudiologia."
      resourceBasePath="/physical-therapy"
      requiredGroups={THERAPY_GROUPS}
    />
  )
}
