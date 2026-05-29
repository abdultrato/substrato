import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function OphthalmologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="OPHTHALMOLOGY"
      title="Substrato Oftalmologia"
      subtitle="Campo visual, topografia corneal, OCT, medições e laudos oftalmológicos."
      resourceBasePath="/ophthalmology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
