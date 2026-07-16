import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function NeurologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="NEUROLOGY"
      title="Neurologia"
      resourceBasePath="/neurology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
