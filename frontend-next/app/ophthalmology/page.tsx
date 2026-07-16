import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function OphthalmologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="OPHTHALMOLOGY"
      title="Oftalmologia"
      resourceBasePath="/ophthalmology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
