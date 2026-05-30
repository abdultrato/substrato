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
  })
})
