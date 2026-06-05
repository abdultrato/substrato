import { describe, expect, it } from "vitest"

import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

describe("dental resource form config", () => {
  it("hides the dental procedure code because it is generated from custom_id", () => {
    const config = getResourceFormConfig("dental", "procedure", "/dental/procedure/")

    expect(config).not.toBeNull()
    expect(config?.esconderCampos).toContain("code")
    expect(config?.esconderCampos).toContain("tenant")
    expect(config?.ordenarCampos).not.toContain("code")
    expect(config?.labels?.code).toBe("Código do procedimento")
  })

  it("uses dental numbering label and placeholder on odontogram entries", () => {
    const config = getResourceFormConfig("dental", "odontogram", "/dental/odontogram/")

    expect(config).not.toBeNull()
    expect(config?.labels?.tooth_number).toBe("Numeração dentária")
    expect(config?.placeholders?.tooth_number).toBe("Ex.: 11, 26, 48 ou 75")
    expect(config?.ordenarCampos).toContain("tooth_number")
    expect(config?.ordenarCampos).toContain("severity")
    expect(config?.ordenarCampos).toContain("procedure_suggested")
  })

  it("keeps treatment plan patient and financial fields visible", () => {
    const config = getResourceFormConfig("dental", "treatment_plan", "/dental/treatment_plan/")

    expect(config).not.toBeNull()
    expect(config?.esconderCampos).not.toContain("patient")
    expect(config?.ordenarCampos).toEqual(
      expect.arrayContaining(["patient", "priority", "discount_amount", "approved_amount", "requires_initial_payment"])
    )
  })

  it("exposes required fields for executed procedures", () => {
    const config = getResourceFormConfig("dental", "procedure_execution", "/dental/procedure_execution/")

    expect(config).not.toBeNull()
    expect(config?.esconderCampos).not.toContain("patient")
    expect(config?.esconderCampos).not.toContain("procedure")
    expect(config?.ordenarCampos).toEqual(expect.arrayContaining(["patient", "procedure", "status", "clinical_notes"]))
  })

  it("exposes required fields for prescriptions and billing items", () => {
    const prescription = getResourceFormConfig("dental", "prescription", "/dental/prescription/")
    const billing = getResourceFormConfig("dental", "billing_item", "/dental/billing_item/")

    expect(prescription?.ordenarCampos).toEqual(expect.arrayContaining(["patient", "medication", "instructions"]))
    expect(billing?.ordenarCampos).toEqual(expect.arrayContaining(["patient", "description", "quantity", "unit_price"]))
  })
})
