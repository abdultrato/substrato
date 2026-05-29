import { describe, expect, it } from "vitest"

import {
  relationLabelForRow,
  relationOptionFromRow,
  relationOptionsFromRows,
  relationTargetForField,
} from "@/lib/resources/relationOptions"

describe("relation options", () => {
  it("maps common foreign-key fields to canonical collection endpoints", () => {
    expect(relationTargetForField("patient", "/consultations/consultation/")?.endpoint).toBe("/clinical/patient/")
    expect(relationTargetForField("product_id", "/pharmacy/lot/")?.endpoint).toBe("/pharmacy/product/")
    expect(relationTargetForField("course", "/education/classroom/")?.endpoint).toBe("/education/course/")
    expect(relationTargetForField("storage", "/bloodbank/unit/")?.endpoint).toBe("/bloodbank/storage/")
  })

  it("maps audit fields and Portuguese relation aliases to readable sources", () => {
    expect(relationTargetForField("updated_by", "/billing/invoice/")?.endpoint).toBe("/identity/user/")
    expect(relationTargetForField("usuario", "/billing/invoice/")?.endpoint).toBe("/identity/user/")
    expect(relationTargetForField("paciente", "/billing/invoice/")?.endpoint).toBe("/clinical/patient/")
    expect(relationTargetForField("pedido", "/billing/invoice/")?.endpoint).toBe("/clinical/labrequest/")
    expect(relationTargetForField("fatura", "/payments/payment/")?.endpoint).toBe("/billing/invoice/")
    expect(relationTargetForField("unidade", "/clinical/patient/")?.endpoint).toBe("/bloodbank/unit/")
    expect(relationTargetForField("tenant", "/billing/invoice/")?.endpoint).toBe("/tenants/tenant/")
  })

  it("does not suggest the current endpoint as its own relation source", () => {
    expect(relationTargetForField("product", "/pharmacy/product/")).toBeNull()
  })

  it("builds readable labels without exposing integer IDs when descriptive fields exist", () => {
    expect(relationLabelForRow({ id: 7, name: "Paracetamol", custom_id: "MED-7" }, ["name", "custom_id"])).toBe(
      "Paracetamol - MED-7"
    )
    expect(
      relationLabelForRow({ id: 9, first_name: "Ana", last_name: "Mabunda", username: "ana" }, ["full_name", "username"])
    ).toBe("Ana Mabunda - ana")
    expect(
      relationOptionFromRow(
        { id: 12, full_name: "Marta Nhantumbo", username: "marta" },
        { endpoint: "/identity/user/", labelFields: ["full_name", "username"] }
      )
    ).toEqual({ value: "12", label: "Marta Nhantumbo - marta" })

    expect(
      relationOptionsFromRows(
        [
          { id: 3, student_code: "EST-003" },
          { pk: 4, name: "Turma A" },
          { name: "Sem ID" },
        ],
        { endpoint: "/education/student/", labelFields: ["student_code", "name"] }
      )
    ).toEqual([
      { value: "3", label: "EST-003" },
      { value: "4", label: "Turma A" },
    ])

    expect(relationLabelForRow({ id: 8, invoice_code: "FT-2026-001" }, ["invoice_code"])).toBe(
      "FT-2026-001"
    )
  })
})
