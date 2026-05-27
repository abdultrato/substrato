import { describe, expect, it } from "vitest"

import {
  relationLabelForRow,
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

  it("does not suggest the current endpoint as its own relation source", () => {
    expect(relationTargetForField("product", "/pharmacy/product/")).toBeNull()
  })

  it("builds readable labels with id fallback", () => {
    expect(relationLabelForRow({ id: 7, name: "Paracetamol", custom_id: "MED-7" }, ["name", "custom_id"])).toBe(
      "Paracetamol - MED-7 (#7)"
    )

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
      { value: "3", label: "EST-003 (#3)" },
      { value: "4", label: "Turma A (#4)" },
    ])
  })
})
