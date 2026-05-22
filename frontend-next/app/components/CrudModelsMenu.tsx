"use client";

import Link from "next/link";
import { useState } from "react";

const MODULES = {
  "accounting": [
    { nome: "Account", href: "/accounting/accounts" },
    { nome: "AccountBalance", href: "/accounting/account-balances" },
    { nome: "FinancialReconciliation", href: "/accounting/financial-reconciliations" },
    { nome: "LedgerEntry", href: "/accounting/ledger-entries" },
    { nome: "LedgerLine", href: "/accounting/ledger-lines" },
    { nome: "LegacyEntry", href: "/accounting/legacy-entries" },
    { nome: "LegacyMovement", href: "/accounting/legacy-movements" },
  ],
  "ai_assistant": [
    { nome: "AiSession", href: "/ai_assistant/ai-sessions" },
    { nome: "AiMessage", href: "/ai_assistant/ai-messages" },
    { nome: "AiToolCall", href: "/ai_assistant/ai-tool-calls" },
    { nome: "AiSuggestedAction", href: "/ai_assistant/ai-suggested-actions" },
    { nome: "AiOperationalTask", href: "/ai_assistant/ai-operational-tasks" },
    { nome: "AiInvestigation", href: "/ai_assistant/ai-investigations" },
    { nome: "AiKnowledgeEntry", href: "/ai_assistant/ai-knowledge-entries" },
    { nome: "AiPolicyEvent", href: "/ai_assistant/ai-policy-events" },
  ],
  "audit_activities": [
    { nome: "UserActivity", href: "/audit_activities/user-activities" },
  ],
  "billing": [
    { nome: "Invoice", href: "/billing/invoices" },
    { nome: "InvoiceHistory", href: "/billing/invoice-histories" },
    { nome: "InvoiceItem", href: "/billing/invoice-items" },
  ],
  "bloodbank": [
    { nome: "BloodDonation", href: "/bloodbank/blood-donations" },
    { nome: "BloodStorage", href: "/bloodbank/blood-storages" },
    { nome: "BloodUnit", href: "/bloodbank/blood-units" },
    { nome: "BloodTransfusion", href: "/bloodbank/blood-transfusions" },
    { nome: "BloodStockMovement", href: "/bloodbank/blood-stock-movements" },
    { nome: "BloodStorageMaintenance", href: "/bloodbank/blood-storage-maintenances" },
  ],
  "clinical": [
    { nome: "LabExam", href: "/clinical/lab-exams" },
    { nome: "Patient", href: "/clinical/patients" },
    { nome: "Sample", href: "/clinical/samples" },
    { nome: "LabRequest", href: "/clinical/lab-requests" },
    { nome: "LabExamField", href: "/clinical/lab-exam-fields" },
    { nome: "Result", href: "/clinical/results" },
    { nome: "ResultItem", href: "/clinical/result-items" },
    { nome: "ClinicalEvent", href: "/clinical/clinical-events" },
    { nome: "ClinicalHistory", href: "/clinical/clinical-histories" },
    { nome: "MedicalExam", href: "/clinical/medical-exams" },
    { nome: "MedicalExamField", href: "/clinical/medical-exam-fields" },
    { nome: "LabRequestItem", href: "/clinical/lab-request-items" },
    { nome: "MedicalResultFile", href: "/clinical/medical-result-files" },
    { nome: "ClinicalReference", href: "/clinical/clinical-references" },
  ],
  "consultations": [
    { nome: "ConsultationSpecialty", href: "/consultations/consultation-specialties" },
    { nome: "Holiday", href: "/consultations/holidaies" },
    { nome: "MedicalConsultation", href: "/consultations/medical-consultations" },
  ],
  "education": [
    { nome: "Assignment", href: "/education/assignments" },
    { nome: "AssignmentSubmission", href: "/education/assignment-submissions" },
    { nome: "AttendanceRecord", href: "/education/attendance-records" },
    { nome: "Classroom", href: "/education/classrooms" },
    { nome: "LearningContent", href: "/education/learning-contents" },
    { nome: "Course", href: "/education/courses" },
    { nome: "Enrollment", href: "/education/enrollments" },
    { nome: "Examination", href: "/education/examinations" },
    { nome: "ExaminationAttempt", href: "/education/examination-attempts" },
    { nome: "GradeRecord", href: "/education/grade-records" },
    { nome: "RandomTest", href: "/education/random-tests" },
    { nome: "DisciplineScheduleItem", href: "/education/discipline-schedule-items" },
    { nome: "DisciplineScheduleStudentStatus", href: "/education/discipline-schedule-student-statuses" },
    { nome: "Skill", href: "/education/skills" },
    { nome: "StudentProfile", href: "/education/student-profiles" },
    { nome: "TeacherProfile", href: "/education/teacher-profiles" },
  ],
  "equipment": [
    { nome: "Equipment", href: "/equipment/equipments" },
  ],
  "equipment_integrations": [
    { nome: "IntegrationMessage", href: "/equipment_integrations/integration-messages" },
    { nome: "IntegrationDocument", href: "/equipment_integrations/integration-documents" },
    { nome: "IntegrationCredential", href: "/equipment_integrations/integration-credentials" },
    { nome: "IntegrationEquipment", href: "/equipment_integrations/integration-equipments" },
    { nome: "IntegrationAnalyteMapping", href: "/equipment_integrations/integration-analyte-mappings" },
    { nome: "IntegrationOrder", href: "/equipment_integrations/integration-orders" },
    { nome: "IntegrationOrderItem", href: "/equipment_integrations/integration-order-items" },
    { nome: "IntegrationRouting", href: "/equipment_integrations/integration-routings" },
  ],
  "external_entities": [
    { nome: "Company", href: "/external_entities/companies" },
  ],
  "human_resources": [
    { nome: "Absence", href: "/human_resources/absences" },
    { nome: "DisciplinaryProcess", href: "/human_resources/disciplinary-processes" },
    { nome: "Employee", href: "/human_resources/employees" },
    { nome: "FamilyDependent", href: "/human_resources/family-dependents" },
    { nome: "JobTitle", href: "/human_resources/job-titles" },
    { nome: "Overtime", href: "/human_resources/overtimes" },
    { nome: "Payroll", href: "/human_resources/payrolls" },
    { nome: "Profession", href: "/human_resources/professions" },
    { nome: "Termination", href: "/human_resources/terminations" },
    { nome: "Vacation", href: "/human_resources/vacations" },
    { nome: "WorkSchedule", href: "/human_resources/work-schedules" },
  ],
  "identity": [
    { nome: "PasswordResetToken", href: "/identity/password-reset-tokens" },
    { nome: "ProfessionalProfile", href: "/identity/professional-profiles" },
    { nome: "User", href: "/identity/users" },
  ],
  "incidents": [
    { nome: "Incident", href: "/incidents/incidents" },
  ],
  "inspections": [
    { nome: "DailyInspection", href: "/inspections/daily-inspections" },
  ],
  "insurer": [
    { nome: "CoveragePlan", href: "/insurer/coverage-plans" },
    { nome: "Insurer", href: "/insurer/insurers" },
    { nome: "ProcedureAuthorization", href: "/insurer/procedure-authorizations" },
    { nome: "TenantCoveragePlan", href: "/insurer/tenant-coverage-plans" },
  ],
  "maintenance": [
    { nome: "Maintenance", href: "/maintenance/maintenances" },
  ],
  "maternity": [
    { nome: "Pregnancy", href: "/maternity/pregnancies" },
  ],
  "medical_records": [
    { nome: "MedicalRecordEntry", href: "/medical_records/medical-record-entries" },
    { nome: "PrescriptionItem", href: "/medical_records/prescription-items" },
  ],
  "monitoring": [
    { nome: "TransactionalOutboxEvent", href: "/monitoring/transactional-outbox-events" },
    { nome: "SystemError", href: "/monitoring/system-errors" },
  ],
  "notifications": [
    { nome: "DeliveryLog", href: "/notifications/delivery-logs" },
    { nome: "Notification", href: "/notifications/notifications" },
    { nome: "NotificationTemplate", href: "/notifications/notification-templates" },
  ],
  "nursing": [
    { nome: "NursingEvolution", href: "/nursing/nursing-evolutions" },
    { nome: "NursingPrescription", href: "/nursing/nursing-prescriptions" },
    { nome: "NursingRecord", href: "/nursing/nursing-records" },
    { nome: "Procedure", href: "/nursing/procedures" },
    { nome: "ProcedureCatalog", href: "/nursing/procedure-catalogs" },
    { nome: "ProcedureCatalogMaterial", href: "/nursing/procedure-catalog-materials" },
    { nome: "ProcedureItem", href: "/nursing/procedure-items" },
    { nome: "ProcedureItemValue", href: "/nursing/procedure-item-values" },
    { nome: "ProcedureMaterial", href: "/nursing/procedure-materials" },
    { nome: "ProcedureMaterialValue", href: "/nursing/procedure-material-values" },
    { nome: "NursingVitalSign", href: "/nursing/nursing-vital-signs" },
    { nome: "Ward", href: "/nursing/wards" },
    { nome: "WardBed", href: "/nursing/ward-beds" },
    { nome: "WardAdmission", href: "/nursing/ward-admissions" },
  ],
  "payments": [
    { nome: "Payment", href: "/payments/payments" },
    { nome: "PaymentHistory", href: "/payments/payment-histories" },
    { nome: "Receipt", href: "/payments/receipts" },
    { nome: "Reconciliation", href: "/payments/reconciliations" },
    { nome: "Transaction", href: "/payments/transactions" },
  ],
  "pharmacy": [
    { nome: "InventoryMovement", href: "/pharmacy/inventory-movements" },
    { nome: "Lot", href: "/pharmacy/lots" },
    { nome: "MaterialRequisition", href: "/pharmacy/material-requisitions" },
    { nome: "MaterialRequisitionItem", href: "/pharmacy/material-requisition-items" },
    { nome: "Product", href: "/pharmacy/products" },
    { nome: "ParentCategory", href: "/pharmacy/parent-categories" },
    { nome: "ProductCategory", href: "/pharmacy/product-categories" },
    { nome: "Sale", href: "/pharmacy/sales" },
    { nome: "SaleItem", href: "/pharmacy/sale-items" },
  ],
  "reception": [
    { nome: "ReceptionCheckin", href: "/reception/reception-checkins" },
  ],
  "surgery": [
    { nome: "Surgery", href: "/surgery/surgeries" },
    { nome: "SmallSurgery", href: "/surgery/small-surgeries" },
    { nome: "LargeSurgery", href: "/surgery/large-surgeries" },
    { nome: "SurgicalProcedure", href: "/surgery/surgical-procedures" },
  ],
  "tenants": [
    { nome: "TenantConfiguration", href: "/tenants/tenant-configurations" },
    { nome: "TenantFeatureFlag", href: "/tenants/tenant-feature-flags" },
    { nome: "TenantSubscription", href: "/tenants/tenant-subscriptions" },
    { nome: "SubscriptionPlan", href: "/tenants/subscription-plans" },
    { nome: "Tenant", href: "/tenants/tenants" },
    { nome: "TenantUsage", href: "/tenants/tenant-usages" },
  ],
};

export default function CrudSidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Modelos</h2>
      {Object.entries(MODULES).map(([module, items]) => (
        <div key={module} className="mb-4">
          <button
            onClick={() => setExpanded(p => ({ ...p, [module]: !p[module] }))}
            className="w-full text-left font-semibold text-sm py-2 hover:bg-gray-800 px-2 rounded"
          >
            📦 {module.charAt(0).toUpperCase() + module.slice(1)}
          </button>
          {expanded[module] && (
            <div className="ml-4 space-y-1">
              {items.map((item: any) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm py-1 hover:text-blue-400 text-gray-300"
                >
                  • {item.nome}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
