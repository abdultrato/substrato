"use client";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { GROUPS } from "@/lib/rbac";
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity";

export default function DentalValidPatientTreatmentPlansPage() {
  return (
    <ResourceListPage
      title="Odontologia / Pacientes com Plano Dentário Válido"
      subtitle="Pacientes com plano dentário ativo dentro da vigência."
      endpoint="/dental/patient_treatment_plan/?validity=valid"
      groupLabel="Odontologia"
      resourceLabel="Pacientes com Plano Dentário"
      createHref="/dental/patient-treatment-plans/new"
      rowHref={(row) => buildRecordDetailHref("/dental/patient-treatment-plans", row)}
      requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA]}
    />
  );
}
