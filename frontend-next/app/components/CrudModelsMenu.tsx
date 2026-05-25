"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Package,
  Search,
  ShieldCheck,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

type CrudMenuItem = {
  nome: string;
  href: string;
  icon?: LucideIcon;
};

const MODULES: Record<string, CrudMenuItem[]> = {
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
    { nome: "Sessões da IA", href: "/ai_assistant/ai-sessions", icon: Bot },
    { nome: "Mensagens da IA", href: "/ai_assistant/ai-messages", icon: FileText },
    { nome: "Chamadas de Ferramenta", href: "/ai_assistant/ai-tool-calls", icon: TerminalSquare },
    { nome: "Acções Sugeridas", href: "/ai_assistant/ai-suggested-actions", icon: Lightbulb },
    { nome: "Tarefas Operacionais", href: "/ai_assistant/ai-operational-tasks", icon: ClipboardCheck },
    { nome: "Investigações da IA", href: "/ai_assistant/ai-investigations", icon: Search },
    { nome: "Base de Conhecimento", href: "/ai_assistant/ai-knowledge-entries", icon: BrainCircuit },
    { nome: "Eventos de Política", href: "/ai_assistant/ai-policy-events", icon: ShieldCheck },
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
    { nome: "Trabalho", href: "/education/assignments" },
    { nome: "Submissão de Trabalho", href: "/education/assignment-submissions" },
    { nome: "Presença", href: "/education/attendance-records" },
    { nome: "Turma", href: "/education/classrooms" },
    { nome: "Conteúdo de Aprendizagem", href: "/education/learning-contents" },
    { nome: "Curso", href: "/education/courses" },
    { nome: "Matrícula", href: "/education/enrollments" },
    { nome: "Exame", href: "/education/examinations" },
    { nome: "Tentativa de Exame", href: "/education/examination-attempts" },
    { nome: "Nota", href: "/education/grade-records" },
    { nome: "Teste Aleatório", href: "/education/random-tests" },
    { nome: "Item do Cronograma da Disciplina", href: "/education/discipline-schedule-items" },
    { nome: "Estado do Estudante no Cronograma", href: "/education/discipline-schedule-student-statuses" },
    { nome: "Competência", href: "/education/skills" },
    { nome: "Estudante", href: "/education/student-profiles" },
    { nome: "Professor", href: "/education/teacher-profiles" },
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
  "warehouse": [
    { nome: "Armazém", href: "/warehouse/warehouses" },
    { nome: "Localização de Armazém", href: "/warehouse/storage-locations" },
    { nome: "Categoria de Item", href: "/warehouse/item-categories" },
    { nome: "Item de Estoque", href: "/warehouse/items" },
    { nome: "Lote WMS", href: "/warehouse/lots" },
    { nome: "Saldo de Estoque", href: "/warehouse/stock-levels" },
    { nome: "Movimento WMS", href: "/warehouse/stock-movements" },
    { nome: "Pedido de Compra", href: "/warehouse/purchase-orders" },
    { nome: "Linha de Compra", href: "/warehouse/purchase-order-lines" },
    { nome: "Recebimento", href: "/warehouse/goods-receipts" },
    { nome: "Linha de Recebimento", href: "/warehouse/goods-receipt-lines" },
    { nome: "Transferência", href: "/warehouse/stock-transfers" },
    { nome: "Linha de Transferência", href: "/warehouse/stock-transfer-lines" },
    { nome: "Inventário Cíclico", href: "/warehouse/cycle-counts" },
    { nome: "Linha de Inventário", href: "/warehouse/cycle-count-lines" },
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

const MODULE_ICONS: Record<string, LucideIcon> = {
  ai_assistant: Bot,
};

export default function CrudSidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Modelos</h2>
      {Object.entries(MODULES).map(([module, items]) => {
        const ModuleIcon = MODULE_ICONS[module] || Package;
        return (
          <div key={module} className="mb-4">
            <button
              onClick={() => setExpanded(p => ({ ...p, [module]: !p[module] }))}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-semibold hover:bg-gray-800"
            >
              <ModuleIcon size={16} />
              <span>{module.charAt(0).toUpperCase() + module.slice(1)}</span>
            </button>
            {expanded[module] && (
              <div className="ml-4 space-y-1">
                {items.map((item) => {
                  const ItemIcon = item.icon || Package;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 py-1 text-sm text-gray-300 hover:text-blue-400"
                    >
                      <ItemIcon size={14} />
                      <span>{item.nome}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
