import SpecialtyDiagnosticsHubPage, { SPECIALTY_DIAGNOSTICS_GROUPS } from "@/components/diagnostics/SpecialtyDiagnosticsHubPage"

export default function NeurologyPage() {
  return (
    <SpecialtyDiagnosticsHubPage
      specialty="NEUROLOGY"
      title="Substrato Neurologia"
      subtitle="EEG, potencial evocado, doppler transcraniano, medições e laudos neurológicos."
      resourceBasePath="/neurology"
      requiredGroups={SPECIALTY_DIAGNOSTICS_GROUPS}
    />
  )
}
