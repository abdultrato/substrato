import TherapyHubPage, { THERAPY_GROUPS } from "@/components/therapy/TherapyHubPage"

export default function OccupationalTherapyPage() {
  return (
    <TherapyHubPage
      discipline="OCCUPATIONAL_THERAPY"
      title="Substrato Terapia Ocupacional"
      subtitle="Avaliações funcionais, atividades da vida diária, adaptação laboral, planos individualizados e evolução terapêutica."
      resourceBasePath="/occupational-therapy"
      requiredGroups={THERAPY_GROUPS}
    />
  )
}
