import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function CardiologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="CARDIOLOGY"
      title="Cardiologia"
      resourceBasePath="/cardiology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
