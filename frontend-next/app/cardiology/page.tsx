import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function CardiologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="CARDIOLOGY"
      title="Substrato Cardiologia"
      subtitle="Ecocardiograma, teste ergométrico, Holter, medições e laudos cardiológicos."
      resourceBasePath="/cardiology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
