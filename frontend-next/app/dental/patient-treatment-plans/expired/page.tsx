"use client";

import ResourceListPage from "@/components/resources/ResourceListPage";
import { GROUPS } from "@/lib/rbac";
import { buildRecordDetailHref } from "@/lib/resources/recordIdentity";

export default function DentalExpiredPatientTreatmentPlansPage() {
  return (
    <ResourceListPage
      title="Odontologia / Pacientes com Plano Dentário Expirado"
      subtitle="Pacientes cujo plano dentário já expirou ou foi marcado como expirado."
      endpoint="/dental/patient_treatment_plan/?validity=expired"
      groupLabel="Odontologia"
      resourceLabel="Pacientes com Plano Dentário"
      createHref="/dental/patient-treatment-plans/new"
      rowHref={(row) => buildRecordDetailHref("/dental/patient-treatment-plans", row)}
      requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA]}
    />
  );
}
