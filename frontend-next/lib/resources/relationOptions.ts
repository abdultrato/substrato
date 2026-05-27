import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"

export type RelationTarget = {
  endpoint: string
  labelFields: string[]
}

export type RelationOption = {
  value: string
  label: string
}

const DEFAULT_LABEL_FIELDS = [
  "name",
  "nome",
  "title",
  "titulo",
  "student_code",
  "teacher_code",
  "employee_code",
  "username",
  "email",
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

const RELATION_TARGETS: Record<string, RelationTarget> = {
  user: { endpoint: "/identity/user/", labelFields: ["username", "email", "name", ...DEFAULT_LABEL_FIELDS] },
  account: { endpoint: "/accounting/account/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  assignment: { endpoint: "/education/assignment/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  assignment_submission: { endpoint: "/education/submission/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  bed: { endpoint: "/nursing/ward_bed/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  blood_unit: { endpoint: "/bloodbank/unit/", labelFields: ["unit_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  catalog: { endpoint: "/nursing/procedure_catalog/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  category: { endpoint: "/warehouse/item_category/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  classroom: { endpoint: "/education/classroom/", labelFields: ["name", "academic_year", ...DEFAULT_LABEL_FIELDS] },
  consultation: { endpoint: "/consultations/consultation/", labelFields: ["custom_id", "patient_name", ...DEFAULT_LABEL_FIELDS] },
  course: { endpoint: "/education/course/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  destination_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  destination_storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  doctor: { endpoint: "/consultations/doctors/", labelFields: ["name", "username", ...DEFAULT_LABEL_FIELDS] },
  donation: { endpoint: "/bloodbank/donation/", labelFields: ["bag_identifier", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  donor: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  employee: { endpoint: "/human_resources/employee/", labelFields: ["name", "employee_code", ...DEFAULT_LABEL_FIELDS] },
  enrollment: { endpoint: "/education/enrollment/", labelFields: ["custom_id", "student", "classroom", ...DEFAULT_LABEL_FIELDS] },
  equipment: { endpoint: "/equipment/equipment/", labelFields: ["name", "serial_number", ...DEFAULT_LABEL_FIELDS] },
  exam: { endpoint: "/clinical/exam/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  examination: { endpoint: "/education/examination/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  examination_attempt: { endpoint: "/education/examination_attempt/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  graded_by: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  homeroom_teacher: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  incident: { endpoint: "/equipment/incident/", labelFields: ["custom_id", "type", ...DEFAULT_LABEL_FIELDS] },
  insurer: { endpoint: "/insurer/insurer/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  item: { endpoint: "/warehouse/item/", labelFields: ["sku", "name", "code", ...DEFAULT_LABEL_FIELDS] },
  linked_assignment: { endpoint: "/education/assignment/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  linked_content: { endpoint: "/education/content/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  linked_examination: { endpoint: "/education/examination/", labelFields: ["title", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
  medical_exam: { endpoint: "/clinical/medicalexam/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  patient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  pick_list: { endpoint: "/warehouse/pick_list/", labelFields: ["custom_id", "status", ...DEFAULT_LABEL_FIELDS] },
  procedure: { endpoint: "/nursing/procedure/", labelFields: ["custom_id", "status", ...DEFAULT_LABEL_FIELDS] },
  procedure_item: { endpoint: "/nursing/procedure_item/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  product: { endpoint: "/pharmacy/product/", labelFields: ["name", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  purchase_order: { endpoint: "/warehouse/purchase_order/", labelFields: ["order_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  recipient: { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", ...DEFAULT_LABEL_FIELDS] },
  requisition: { endpoint: "/pharmacy/material_requisition/", labelFields: ["custom_id", "sector", ...DEFAULT_LABEL_FIELDS] },
  role: { endpoint: "/human_resources/role/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  sale: { endpoint: "/pharmacy/sale/", labelFields: ["custom_id", "id", ...DEFAULT_LABEL_FIELDS] },
  sale_item: { endpoint: "/pharmacy/sale_item/", labelFields: ["custom_id", "product_name", ...DEFAULT_LABEL_FIELDS] },
  sales_order: { endpoint: "/warehouse/sales_order/", labelFields: ["order_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  schedule_item: { endpoint: "/education/discipline_schedule/", labelFields: ["title", "scheduled_date", ...DEFAULT_LABEL_FIELDS] },
  shipment: { endpoint: "/warehouse/shipment/", labelFields: ["shipment_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  source_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  source_storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  specialty: { endpoint: "/consultations/specialty/", labelFields: ["name", "base_price", ...DEFAULT_LABEL_FIELDS] },
  stock_transfer: { endpoint: "/warehouse/stock_transfer/", labelFields: ["custom_id", "status", ...DEFAULT_LABEL_FIELDS] },
  storage: { endpoint: "/bloodbank/storage/", labelFields: ["name", "location", ...DEFAULT_LABEL_FIELDS] },
  storage_location: { endpoint: "/warehouse/storage_location/", labelFields: ["code", "name", ...DEFAULT_LABEL_FIELDS] },
  student: { endpoint: "/education/student/", labelFields: ["student_code", "name", ...DEFAULT_LABEL_FIELDS] },
  teacher: { endpoint: "/education/teacher/", labelFields: ["teacher_code", "name", ...DEFAULT_LABEL_FIELDS] },
  transaction: { endpoint: "/payments/transaction/", labelFields: ["custom_id", "reference", ...DEFAULT_LABEL_FIELDS] },
  unit: { endpoint: "/bloodbank/unit/", labelFields: ["unit_number", "custom_id", ...DEFAULT_LABEL_FIELDS] },
  ward: { endpoint: "/nursing/ward/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
  warehouse: { endpoint: "/warehouse/warehouse/", labelFields: ["name", "code", ...DEFAULT_LABEL_FIELDS] },
}

const ENDPOINT_FIELD_OVERRIDES: Record<string, Record<string, RelationTarget>> = {
  "/pharmacy/inventory_movement/": {
    lot: { endpoint: "/pharmacy/lot/", labelFields: ["lot_number", "product_name", ...DEFAULT_LABEL_FIELDS] },
  },
  "/warehouse/lot/": {
    item: { endpoint: "/warehouse/item/", labelFields: ["sku", "name", ...DEFAULT_LABEL_FIELDS] },
  },
}

function normalizeFieldName(name: string): string {
  return String(name || "")
    .trim()
    .replace(/_id$/, "")
    .replace(/Id$/, "")
    .toLowerCase()
}

function normalizeEndpoint(endpoint: string): string {
  return canonicalCollectionPath(endpoint)
}

export function relationTargetForField(fieldName: string, currentEndpoint = ""): RelationTarget | null {
  const normalizedField = normalizeFieldName(fieldName)
  const normalizedEndpoint = normalizeEndpoint(currentEndpoint)
  const override = ENDPOINT_FIELD_OVERRIDES[normalizedEndpoint]?.[normalizedField]
  const target = override || RELATION_TARGETS[normalizedField]
  if (!target) return null
  if (normalizeEndpoint(target.endpoint) === normalizedEndpoint) return null
  return target
}

export function relationLabelForRow(row: Record<string, any>, labelFields: string[] = DEFAULT_LABEL_FIELDS): string {
  const pieces: string[] = []
  const seen = new Set<string>()
  for (const field of labelFields) {
    const value = row?.[field]
    if (value === undefined || value === null || value === "") continue
    const text = String(value).trim()
    if (!text || seen.has(text)) continue
    pieces.push(text)
    seen.add(text)
    if (pieces.length >= 2) break
  }
  const id = row?.id ?? row?.pk
  if (pieces.length) {
    return id === undefined || id === null ? pieces.join(" - ") : `${pieces.join(" - ")} (#${id})`
  }
  return id === undefined || id === null ? "Registo sem identificador" : `Registo #${id}`
}

export function relationOptionsFromRows(rows: Array<Record<string, any>>, target: RelationTarget): RelationOption[] {
  return rows
    .map((row) => {
      const id = row?.id ?? row?.pk
      if (id === undefined || id === null || id === "") return null
      return {
        value: String(id),
        label: relationLabelForRow(row, target.labelFields),
      }
    })
    .filter(Boolean) as RelationOption[]
}
