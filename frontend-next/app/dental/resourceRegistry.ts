export const DENTAL_RESOURCE_ROUTES: Record<string, string> = {
  procedures: "/dental/procedure/",
  appointments: "/dental/appointment/",
  consultations: "/dental/consultation/",
  records: "/dental/record/",
  "odontogram-charts": "/dental/odontogram_chart/",
  odontograms: "/dental/odontogram/",
  diagnoses: "/dental/diagnosis/",
  "treatment-plans": "/dental/treatment_plan/",
  "treatment-phases": "/dental/treatment_phase/",
  "treatment-items": "/dental/treatment_item/",
  quotations: "/dental/quotation/",
  approvals: "/dental/approval/",
  payments: "/dental/payment/",
  "procedure-executions": "/dental/procedure_execution/",
  "patient-treatment-plans": "/dental/patient_treatment_plan/",
  "prosthesis-lab-orders": "/dental/prosthesis_lab_order/",
  "imaging-orders": "/dental/imaging_order/",
  prescriptions: "/dental/prescription/",
  followups: "/dental/followup/",
  "material-consumptions": "/dental/material_consumption/",
  "clinical-evolutions": "/dental/clinical_evolution/",
  "billing-items": "/dental/billing_item/",
  documents: "/dental/document/",
  "audit-events": "/dental/audit_event/",
  "patient-plan-summaries": "/dental/patient_plan_summary/",
}

export function dentalEndpointFromSlug(slug: string | string[] | undefined): string | null {
  const key = Array.isArray(slug) ? slug[0] : slug
  if (!key) return null
  return DENTAL_RESOURCE_ROUTES[key] || null
}
