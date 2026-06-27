import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"

export type RelationTarget = {
  endpoint: string
  labelFields: string[]
  staticFilters?: Record<string, string | number | boolean>
}

export type RelationOption = {
  value: string
  label: string
}

const DEFAULT_LABEL_FIELDS = [
  "full_name",
  "display_name",
  "name",
  "nome",
  "title",
  "titulo",
  "student_code",
  "teacher_code",
  "employee_code",
  "username",
  "email",
  "identifier",
  "document_number",
  "custom_id",
  "id_custom",
  "code",
  "codigo",
  "lot_number",
  "unit_number",
  "bag_identifier",
  "invoice_code",
  "reference",
  "referencia",
]

const USER_LABEL_FIELDS = [
  "full_name",
  "display_name",
  "name",
  "nome",
  "username",
  "email",
  ...DEFAULT_LABEL_FIELDS,
]

const TENANT_LABEL_FIELDS = [
  "name",
  "nome",
  "identifier",
  "slug",
  "schema_name",
  "domain",
  "email",
  ...DEFAULT_LABEL_FIELDS,
]

const RELATION_TARGETS: Record<string, RelationTarget> = {
  user: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  usuario: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  utilizador: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  created_by: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  updated_by: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  deleted_by: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  account: { endpoint: "/accounting/account/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  animal: { endpoint: "/veterinary/animal/", labelFields: ["name", "owner_name", "species", ...DEFAULT_LABEL_FIELDS] },
  assignment: { endpoint: "/education/assignment/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  assignment_submission: { endpoint: "/education/submission/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  attendant: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
  bed: { endpoint: "/nursing/ward_bed/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  blood_unit: { endpoint: "/bloodbank/unit/", labelFields: ["unit_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  catalog: { endpoint: "/nursing/procedure_catalog/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  category: { endpoint: "/warehouse/item_category/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  classroom: { endpoint: "/education/classroom/", labelFields: ["name", "academic_year", ...DEFAULT_LABEL_FIELDS] },
  acknowledged_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  administered_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  adverse_event: { endpoint: "/public_health/adverse_event/", labelFields: ["custom_id", "patient_name", "vaccine_name", ...DEFAULT_LABEL_FIELDS] },
  care_manager: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  campaign: { endpoint: "/public_health/campaign/", labelFields: ["name", "target_region", "start_date", ...DEFAULT_LABEL_FIELDS] },
  clinician: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  consultation: { endpoint: "/consultations/consultation/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
  course: { endpoint: "/education/course/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  destination_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  destination_storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  doctor: { endpoint: "/consultations/doctors/", labelFields: ["name", "username", ...DEFAULT_LABEL_FIELDS] },
  driver: { endpoint: "/transportation/driver/", labelFields: ["name", "license_number", ...DEFAULT_LABEL_FIELDS] },
  dentist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  donation: { endpoint: "/bloodbank/donation/", labelFields: ["bag_identifier", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  donor: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  employee: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  enrollment: { endpoint: "/education/enrollment/", labelFields: ["custom_id", "student", "classroom", ...DEFAULT_LABEL_FIELDS] },
  equipment: { endpoint: "/equipment/equipment/", labelFields: ["name", "serial_number", ...DEFAULT_LABEL_FIELDS] },
  exam: { endpoint: "/clinical_laboratory/test/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS], staticFilters: { active: true } },
  // M2M `exams` das requisições laboratoriais — multi-seleção por pesquisa.
  exams: { endpoint: "/clinical_laboratory/test/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS], staticFilters: { active: true } },
  medical_exams: { endpoint: "/clinical/medicalexam/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  // Bandeja de exames do perfil profissional (medicina ocupacional).
  occupational_profile: { endpoint: "/clinical/occupational_profile/", labelFields: ["name", "profession", ...DEFAULT_LABEL_FIELDS] },
  examination: { endpoint: "/education/examination/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  examination_attempt: { endpoint: "/education/examination_attempt/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  financier_company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
  graded_by: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  homeroom_teacher: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  incident: { endpoint: "/equipment/incident/", labelFields: ["custom_id", "type", ...DEFAULT_LABEL_FIELDS] },
  immunization_record: { endpoint: "/public_health/immunization/", labelFields: ["custom_id", "patient_name", "vaccine_name", ...DEFAULT_LABEL_FIELDS] },
  investigated_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  insurer: { endpoint: "/insurer/insurer/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  invoice: { endpoint: "/billing/invoice/", labelFields: ["custom_id", "patient_name", "total", ...DEFAULT_LABEL_FIELDS] },
  fatura: { endpoint: "/billing/invoice/", labelFields: ["custom_id", "patient_name", "total", ...DEFAULT_LABEL_FIELDS] },
  factura: { endpoint: "/billing/invoice/", labelFields: ["custom_id", "patient_name", "total", ...DEFAULT_LABEL_FIELDS] },
  item: { endpoint: "/warehouse/item/", labelFields: ["sku", "name", "code", ...DEFAULT_LABEL_FIELDS] },
  linked_assignment: { endpoint: "/education/assignment/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  linked_content: { endpoint: "/education/content/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  linked_examination: { endpoint: "/education/examination/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
  medical_exam: { endpoint: "/clinical/medicalexam/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  paciente: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  payment: { endpoint: "/payments/payment/", labelFields: ["custom_id", "value", "status", ...DEFAULT_LABEL_FIELDS] },
  pick_list: { endpoint: "/warehouse/pick_list/", labelFields: ["custom_id", "status", ...DEFAULT_LABEL_FIELDS] },
  payer_company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
  procedure: { endpoint: "/nursing/procedure/", labelFields: ["custom_id", "patient_name", "ward_name", "workflow_status_display", ...DEFAULT_LABEL_FIELDS] },
  procedure_financing: { endpoint: "/credit_financing/procedure_financing/", labelFields: ["custom_id", "patient_name", "contract_number", ...DEFAULT_LABEL_FIELDS] },
  procedure_item: { endpoint: "/nursing/procedure_item/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
  purchase_order: { endpoint: "/warehouse/purchase_order/", labelFields: ["order_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  radiologist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  recipient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  request: { endpoint: "/clinical/labrequest/", labelFields: ["custom_id", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
  pedido: { endpoint: "/clinical/labrequest/", labelFields: ["custom_id", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
  lab_request: { endpoint: "/clinical/labrequest/", labelFields: ["custom_id", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
  request_item: { endpoint: "/clinical/labrequestitem/", labelFields: ["custom_id", "exam_name", "status", ...DEFAULT_LABEL_FIELDS] },
  pedido_item: { endpoint: "/clinical/labrequestitem/", labelFields: ["custom_id", "exam_name", "status", ...DEFAULT_LABEL_FIELDS] },
  lab_request_item: { endpoint: "/clinical/labrequestitem/", labelFields: ["custom_id", "exam_name", "status", ...DEFAULT_LABEL_FIELDS] },
  requisition: { endpoint: "/pharmacy/material_requisition/", labelFields: ["custom_id", "sector", ...DEFAULT_LABEL_FIELDS] },
  requisicao: { endpoint: "/pharmacy/material_requisition/", labelFields: ["custom_id", "sector", ...DEFAULT_LABEL_FIELDS] },
  requesting_doctor: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  // Medico solicitante das requisicoes laboratoriais - apenas funcionarios
  // com papel de medico ativos (endpoint dedicado de medicos).
  requesting_physician: { endpoint: "/consultations/doctors/", labelFields: ["name", "profession_name", ...DEFAULT_LABEL_FIELDS] },
  requesting_company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
  requested_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  reported_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  resolved_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  reviewer: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  role: { endpoint: "/human_resources/role/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  // Profissão do funcionário — pesquisa por nome (catálogo de profissões RH).
  profession: { endpoint: "/human_resources/profissao/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  profissao: { endpoint: "/human_resources/profissao/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  sale: { endpoint: "/pharmacy/sale/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  // Todos os FKs `sector` do backend apontam para o catálogo de sectores do
  // laboratório (LabSector). Em módulos onde `sector` é uma string (ex.:
  // farmácia), o valor não é numérico e a resolução nem é tentada.
  sector: { endpoint: "/clinical_laboratory/sector/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  // Exames do catálogo do laboratório (ex.: M2M `tests` dos painéis e
  // worklists). Resolve IDs para "Nome - Código".
  test: { endpoint: "/clinical_laboratory/test/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  tests: { endpoint: "/clinical_laboratory/test/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  sale_item: { endpoint: "/pharmacy/sale_item/", labelFields: ["custom_id", "product_name", ...DEFAULT_LABEL_FIELDS] },
  sales_order: { endpoint: "/warehouse/sales_order/", labelFields: ["order_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  schedule_item: { endpoint: "/education/discipline_schedule/", labelFields: ["title", "scheduled_date", ...DEFAULT_LABEL_FIELDS] },
  shipment: { endpoint: "/warehouse/shipment/", labelFields: ["shipment_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  source_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  source_storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  specialty: { endpoint: "/consultations/specialty/", labelFields: ["name", "base_price", ...DEFAULT_LABEL_FIELDS] },
  sponsor_company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
  stock_transfer: { endpoint: "/warehouse/stock_transfer/", labelFields: ["custom_id", "status", ...DEFAULT_LABEL_FIELDS] },
  storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  storage_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  student: { endpoint: "/education/student/", labelFields: ["student_code", "name", ...DEFAULT_LABEL_FIELDS] },
  student_funding: { endpoint: "/credit_financing/student_funding/", labelFields: ["custom_id", "student_code", "academic_year", ...DEFAULT_LABEL_FIELDS] },
  teacher: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  tenant: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  tenant_unit: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  tenant_unidade: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  tenantunit: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  unidade_tenant: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  unidade_do_tenant: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  cliente: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  inquilino: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  therapist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  target_group: { endpoint: "/public_health/target/", labelFields: ["custom_id", "region", "district", ...DEFAULT_LABEL_FIELDS] },
  transaction: { endpoint: "/payments/transaction/", labelFields: ["custom_id", "reference", ...DEFAULT_LABEL_FIELDS] },
  unit: { endpoint: "/bloodbank/unit/", labelFields: ["unit_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  unidade: { endpoint: "/bloodbank/unit/", labelFields: ["unit_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  vaccine: { endpoint: "/veterinary/vaccine/", labelFields: ["name", "disease", "species", ...DEFAULT_LABEL_FIELDS] },
  vehicle: { endpoint: "/transportation/vehicle/", labelFields: ["license_plate", "name", "fleet_number", ...DEFAULT_LABEL_FIELDS] },
  veterinarian: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  ward: { endpoint: "/nursing/ward/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  warehouse: { endpoint: "/warehouse/warehouse/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  lab_company: { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", ...DEFAULT_LABEL_FIELDS] },
}

const ENDPOINT_FIELD_OVERRIDES: Record<string, Record<string, RelationTarget>> = {
  "/nursing/procedure/": {
    professional: { endpoint: "/identity/user/", labelFields: USER_LABEL_FIELDS },
    selected_catalogs: { endpoint: "/nursing/procedure_catalog/", labelFields: ["name", "nome"] },
    selected_materials: { endpoint: "/pharmacy/product/", labelFields: ["name", "nome"] },
  },
  "/clinical_laboratory/critical_notification/": {
    result: { endpoint: "/clinical_laboratory/result/", labelFields: ["custom_id", "value", "unit", ...DEFAULT_LABEL_FIELDS] },
    order: { endpoint: "/clinical_laboratory/order/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  },
  "/reception/checkin/": {
    tenant: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
    tenant_unit: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
    tenant_unidade: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
    unit: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
    unidade: { endpoint: "/tenants/tenant/", labelFields: TENANT_LABEL_FIELDS },
  },
  "/pharmacy/inventory_movement/": {
    lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/warehouse/lot/": {
    item: { endpoint: "/warehouse/item/", labelFields: ["sku", "name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/odontogram/": {
    odontogram: { endpoint: "/dental/odontogram_chart/", labelFields: ["custom_id", "patient_name", "charted_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    procedure: { endpoint: "/dental/procedure/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/consultation/": {
    appointment: { endpoint: "/dental/appointment/", labelFields: ["custom_id", "patient_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/odontogram_chart/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    created_by_dentist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/diagnosis/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    odontogram_entry: { endpoint: "/dental/odontogram/", labelFields: ["tooth_number", "condition", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    responsible_dentist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/treatment_plan/": {
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/treatment_phase/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/treatment_item/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    phase: { endpoint: "/dental/treatment_phase/", labelFields: ["title", "phase_type", ...DEFAULT_LABEL_FIELDS] },
    procedure: { endpoint: "/dental/procedure/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
    appointment: { endpoint: "/dental/appointment/", labelFields: ["custom_id", "patient_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/patient_treatment_plan/": {
    patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    dentist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/quotation/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    issued_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/approval/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    quotation: { endpoint: "/dental/quotation/", labelFields: ["custom_id", "treatment_plan_title", "total_amount", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/payment/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    treatment_item: { endpoint: "/dental/treatment_item/", labelFields: ["custom_id", "procedure_name", "treatment_plan_title", ...DEFAULT_LABEL_FIELDS] },
    quotation: { endpoint: "/dental/quotation/", labelFields: ["custom_id", "treatment_plan_title", "total_amount", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/procedure_execution/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    treatment_item: { endpoint: "/dental/treatment_item/", labelFields: ["custom_id", "procedure_name", "treatment_plan_title", ...DEFAULT_LABEL_FIELDS] },
    appointment: { endpoint: "/dental/appointment/", labelFields: ["custom_id", "patient_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
    procedure: { endpoint: "/dental/procedure/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
    performed_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/prosthesis_lab_order/": {
    treatment_item: { endpoint: "/dental/treatment_item/", labelFields: ["custom_id", "procedure_name", "treatment_plan_title", ...DEFAULT_LABEL_FIELDS] },
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/imaging_order/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    treatment_item: { endpoint: "/dental/treatment_item/", labelFields: ["custom_id", "procedure_name", "treatment_plan_title", ...DEFAULT_LABEL_FIELDS] },
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/prescription/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    medication_product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/followup/": {
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    appointment: { endpoint: "/dental/appointment/", labelFields: ["custom_id", "patient_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/material_consumption/": {
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    warehouse_item: { endpoint: "/warehouse/item/", labelFields: ["sku", "name", ...DEFAULT_LABEL_FIELDS] },
    inventory_movement: { endpoint: "/pharmacy/inventory_movement/", labelFields: ["custom_id", "product_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/clinical_evolution/": {
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/document/": {
    consultation: { endpoint: "/dental/consultation/", labelFields: ["custom_id", "patient_name", "started_at", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/dental/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/audit_event/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/billing_item/": {
    treatment_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    treatment_item: { endpoint: "/dental/treatment_item/", labelFields: ["custom_id", "procedure_name", "treatment_plan_title", ...DEFAULT_LABEL_FIELDS] },
    procedure_execution: { endpoint: "/dental/procedure_execution/", labelFields: ["custom_id", "procedure_name", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    quotation: { endpoint: "/dental/quotation/", labelFields: ["custom_id", "treatment_plan_title", "total_amount", ...DEFAULT_LABEL_FIELDS] },
    invoice: { endpoint: "/billing/invoices/", labelFields: ["custom_id", "total", "status", ...DEFAULT_LABEL_FIELDS] },
    invoice_item: { endpoint: "/billing/invoice-items/", labelFields: ["custom_id", "description", "unit_price", ...DEFAULT_LABEL_FIELDS] },
  },
  "/dental/patient_plan_summary/": {
    active_plan: { endpoint: "/dental/treatment_plan/", labelFields: ["title", ...DEFAULT_LABEL_FIELDS] },
    next_appointment: { endpoint: "/dental/appointment/", labelFields: ["custom_id", "patient_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/record/": {
    appointment: { endpoint: "/veterinary/appointment/", labelFields: ["custom_id", "animal_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/vaccination/": {
    vaccine: { endpoint: "/veterinary/vaccine/", labelFields: ["name", "disease", "species", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/lab_request/": {
    appointment: { endpoint: "/veterinary/appointment/", labelFields: ["custom_id", "animal_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
    record: { endpoint: "/veterinary/record/", labelFields: ["custom_id", "animal_name", "opened_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/lab_request_item/": {
    request: { endpoint: "/veterinary/lab_request/", labelFields: ["custom_id", "animal_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
    exam: { endpoint: "/veterinary/lab_exam/", labelFields: ["code", "name", "species", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/admission/": {
    appointment: { endpoint: "/veterinary/appointment/", labelFields: ["custom_id", "animal_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/prescription/": {
    record: { endpoint: "/veterinary/record/", labelFields: ["custom_id", "animal_name", "opened_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/veterinary/prescription_item/": {
    prescription: { endpoint: "/veterinary/prescription/", labelFields: ["custom_id", "animal_name", "issued_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/assessment/": {
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/treatment_plan/": {
    assessment: { endpoint: "/physiotherapy/assessment/", labelFields: ["custom_id", "patient_name", "assessed_at", ...DEFAULT_LABEL_FIELDS] },
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/intervention/": {
    plan: { endpoint: "/physiotherapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
    device: { endpoint: "/physiotherapy/device/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/session/": {
    plan: { endpoint: "/physiotherapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/progress_note/": {
    plan: { endpoint: "/physiotherapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
    session: { endpoint: "/physiotherapy/session/", labelFields: ["custom_id", "patient_name", "scheduled_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/physiotherapy/device_usage/": {
    session: { endpoint: "/physiotherapy/session/", labelFields: ["custom_id", "patient_name", "scheduled_at", ...DEFAULT_LABEL_FIELDS] },
    device: { endpoint: "/physiotherapy/device/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/evaluation/": {
    therapist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/treatment_plan/": {
    therapist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    evaluation: { endpoint: "/therapy/evaluation/", labelFields: ["custom_id", "patient_name", "evaluated_at", ...DEFAULT_LABEL_FIELDS] },
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/goal/": {
    plan: { endpoint: "/therapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/session/": {
    plan: { endpoint: "/therapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
    therapist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/progress_note/": {
    plan: { endpoint: "/therapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
    session: { endpoint: "/therapy/session/", labelFields: ["custom_id", "patient_name", "scheduled_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/therapy/prescription_link/": {
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    plan: { endpoint: "/therapy/treatment_plan/", labelFields: ["name", "patient_name", "start_date", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/preparation/": {
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
    pharmacist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    verifier: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    prepared_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/ingredient/": {
    preparation: { endpoint: "/clinical_pharmacy/preparation/", labelFields: ["custom_id", "patient_name", "product_name", ...DEFAULT_LABEL_FIELDS] },
    product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/interaction_rule/": {
    primary_drug: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    interacting_drug: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/interaction_check/": {
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    primary_drug: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    interacting_drug: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    rule: { endpoint: "/clinical_pharmacy/interaction_rule/", labelFields: ["name", "primary_drug_name", "interacting_drug_name", ...DEFAULT_LABEL_FIELDS] },
    pharmacist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/controlled_movement/": {
    product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    preparation: { endpoint: "/clinical_pharmacy/preparation/", labelFields: ["custom_id", "patient_name", "product_name", ...DEFAULT_LABEL_FIELDS] },
    responsible: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    witness: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/clinical_pharmacy/antibiotic_review/": {
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    antibiotic: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
    reviewer: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/telemedicine/waiting_room/": {
    consultation: { endpoint: "/consultations/consultation/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    clinician: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/telemedicine/vital_reading/": {
    device: { endpoint: "/telemedicine/device/", labelFields: ["serial_number", "external_device_id", "device_type", ...DEFAULT_LABEL_FIELDS] },
  },
  "/telemedicine/async_case/": {
    consultation: { endpoint: "/consultations/consultation/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    requested_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    reviewer: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/telemedicine/program/": {
    care_manager: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/telemedicine/alert/": {
    program: { endpoint: "/telemedicine/program/", labelFields: ["custom_id", "patient_name", "condition", ...DEFAULT_LABEL_FIELDS] },
    reading: { endpoint: "/telemedicine/vital_reading/", labelFields: ["custom_id", "patient_name", "measured_at", ...DEFAULT_LABEL_FIELDS] },
    device: { endpoint: "/telemedicine/device/", labelFields: ["serial_number", "external_device_id", "device_type", ...DEFAULT_LABEL_FIELDS] },
    acknowledged_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    resolved_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/lot/": {
    vaccine: { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/campaign/": {
    vaccine: { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code", ...DEFAULT_LABEL_FIELDS] },
    manager: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/target/": {
    campaign: { endpoint: "/public_health/campaign/", labelFields: ["name", "target_region", "start_date", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/immunization/": {
    patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
    vaccine: { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code", ...DEFAULT_LABEL_FIELDS] },
    lot: { endpoint: "/public_health/lot/", labelFields: ["lot_number", "vaccine_name", "expiration_date", ...DEFAULT_LABEL_FIELDS] },
    campaign: { endpoint: "/public_health/campaign/", labelFields: ["name", "target_region", "start_date", ...DEFAULT_LABEL_FIELDS] },
    target_group: { endpoint: "/public_health/target/", labelFields: ["custom_id", "region", "district", ...DEFAULT_LABEL_FIELDS] },
    administered_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/adverse_event/": {
    immunization_record: { endpoint: "/public_health/immunization/", labelFields: ["custom_id", "patient_name", "vaccine_name", ...DEFAULT_LABEL_FIELDS] },
    patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
    vaccine: { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code", ...DEFAULT_LABEL_FIELDS] },
    lot: { endpoint: "/public_health/lot/", labelFields: ["lot_number", "vaccine_name", "expiration_date", ...DEFAULT_LABEL_FIELDS] },
    reported_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    investigated_by: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/public_health/notification/": {
    campaign: { endpoint: "/public_health/campaign/", labelFields: ["name", "target_region", "start_date", ...DEFAULT_LABEL_FIELDS] },
    immunization_record: { endpoint: "/public_health/immunization/", labelFields: ["custom_id", "patient_name", "vaccine_name", ...DEFAULT_LABEL_FIELDS] },
    adverse_event: { endpoint: "/public_health/adverse_event/", labelFields: ["custom_id", "patient_name", "vaccine_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/radiology/study/": {
    requesting_doctor: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    radiologist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    protocol: { endpoint: "/radiology/protocol/", labelFields: ["code", "name", "modality", ...DEFAULT_LABEL_FIELDS] },
    equipment: { endpoint: "/radiology/equipment/", labelFields: ["code", "name", "modality", ...DEFAULT_LABEL_FIELDS] },
  },
  "/radiology/series/": {
    study: { endpoint: "/radiology/study/", labelFields: ["accession_number", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
  },
  "/radiology/file/": {
    study: { endpoint: "/radiology/study/", labelFields: ["accession_number", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
    series: { endpoint: "/radiology/series/", labelFields: ["series_instance_uid", "study_label", "series_number", ...DEFAULT_LABEL_FIELDS] },
  },
  "/radiology/report/": {
    study: { endpoint: "/radiology/study/", labelFields: ["accession_number", "patient_name", "requested_at", ...DEFAULT_LABEL_FIELDS] },
    radiologist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/radiology/pacs_event/": {
    study: { endpoint: "/radiology/study/", labelFields: ["accession_number", "patient_name", "study_instance_uid", ...DEFAULT_LABEL_FIELDS] },
    equipment: { endpoint: "/radiology/equipment/", labelFields: ["code", "name", "ae_title", ...DEFAULT_LABEL_FIELDS] },
  },
  "/specialty_diagnostics/order/": {
    requesting_doctor: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    specialist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
    medical_record: { endpoint: "/medical_records/record/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
    prescription_item: { endpoint: "/medical_records/prescricaoitem/", labelFields: ["custom_id", "medication_name", ...DEFAULT_LABEL_FIELDS] },
    protocol: { endpoint: "/specialty_diagnostics/protocol/", labelFields: ["code", "name", "specialty", "modality", ...DEFAULT_LABEL_FIELDS] },
    equipment: { endpoint: "/specialty_diagnostics/equipment/", labelFields: ["code", "name", "specialty", "modality", ...DEFAULT_LABEL_FIELDS] },
  },
  "/specialty_diagnostics/measurement/": {
    order: { endpoint: "/specialty_diagnostics/order/", labelFields: ["order_number", "patient_name", "specialty", "modality", ...DEFAULT_LABEL_FIELDS] },
  },
  "/specialty_diagnostics/report/": {
    order: { endpoint: "/specialty_diagnostics/order/", labelFields: ["order_number", "patient_name", "specialty", "modality", ...DEFAULT_LABEL_FIELDS] },
    specialist: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  },
  "/specialty_diagnostics/integration_event/": {
    order: { endpoint: "/specialty_diagnostics/order/", labelFields: ["order_number", "patient_name", "external_order_id", ...DEFAULT_LABEL_FIELDS] },
    equipment: { endpoint: "/specialty_diagnostics/equipment/", labelFields: ["code", "name", "integration_endpoint", ...DEFAULT_LABEL_FIELDS] },
  },
  "/transportation/route_stop/": {
    route: { endpoint: "/transportation/route/", labelFields: ["code", "name", "origin", "destination", ...DEFAULT_LABEL_FIELDS] },
  },
  "/transportation/trip/": {
    route: { endpoint: "/transportation/route/", labelFields: ["code", "name", "origin", "destination", ...DEFAULT_LABEL_FIELDS] },
  },
  "/transportation/tracking_point/": {
    trip: { endpoint: "/transportation/trip/", labelFields: ["custom_id", "vehicle_plate", "driver_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
  "/transportation/maintenance_order/": {
    plan: { endpoint: "/transportation/maintenance_plan/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/transportation/fuel_log/": {
    trip: { endpoint: "/transportation/trip/", labelFields: ["custom_id", "vehicle_plate", "driver_name", "scheduled_start", ...DEFAULT_LABEL_FIELDS] },
  },
}

function normalizeFieldName(name: string): string {
  return String(name || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/_id$/i, "")
    .toLowerCase()
}

function normalizeEndpoint(endpoint: string): string {
  const canonical = canonicalCollectionPath(endpoint)
  return canonical.replace(/\/\d+\/$/, "/")
}

export function relationTargetForField(fieldName: string, currentEndpoint = ""): RelationTarget | null {
  const normalizedField = normalizeFieldName(fieldName)
  const normalizedEndpoint = normalizeEndpoint(currentEndpoint)
  const override = ENDPOINT_FIELD_OVERRIDES[normalizedEndpoint]?.[normalizedField]
  const target =
    override ||
    RELATION_TARGETS[normalizedField] ||
    (normalizedField.endsWith("_by") ? RELATION_TARGETS.user : null)
  if (!target) return null
  if (normalizeEndpoint(target.endpoint) === normalizedEndpoint) return null
  return target
}

export function relationLabelForRow(row: Record<string, any>, labelFields: string[] = DEFAULT_LABEL_FIELDS): string {
  const pieces: string[] = []
  const seen = new Set<string>()
  for (const field of labelFields) {
    const value =
      field === "full_name" && !row?.full_name
        ? [row?.first_name, row?.last_name].filter(Boolean).join(" ")
        : row?.[field]
    if (value === undefined || value === null || value === "") continue
    const text = String(value).trim()
    if (!text || seen.has(text)) continue
    pieces.push(text)
    seen.add(text)
    if (pieces.length >= 2) break
  }
  const id = row?.id ?? row?.pk
  if (pieces.length) {
    return pieces.join(" - ")
  }
  return id === undefined || id === null ? "Registo sem identificador" : `Registo #${id}`
}

export function relationOptionFromRow(row: Record<string, any>, target: RelationTarget): RelationOption | null {
  const id = row?.id ?? row?.pk
  if (id === undefined || id === null || id === "") return null
  return {
    value: String(id),
    label: relationLabelForRow(row, target.labelFields),
  }
}

export function relationOptionsFromRows(rows: Array<Record<string, any>>, target: RelationTarget): RelationOption[] {
  return rows
    .map((row) => relationOptionFromRow(row, target))
    .filter(Boolean) as RelationOption[]
}
