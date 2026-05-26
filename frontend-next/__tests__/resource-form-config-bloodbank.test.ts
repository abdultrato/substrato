import { describe, expect, it } from "vitest"

import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

describe("bloodbank resource form config", () => {
  it("provides create form config for all bloodbank resources", () => {
    const donation = getResourceFormConfig("bloodbank", "donation", "/bloodbank/donation/")
    const storage = getResourceFormConfig("bloodbank", "storage", "/bloodbank/storage/")
    const unit = getResourceFormConfig("bloodbank", "unit", "/bloodbank/unit/")
    const transfusion = getResourceFormConfig("bloodbank", "transfusion", "/bloodbank/transfusion/")
    const stockMovement = getResourceFormConfig("bloodbank", "stock_movement", "/bloodbank/stock_movement/")
    const storageMaintenance = getResourceFormConfig(
      "bloodbank",
      "storage_maintenance",
      "/bloodbank/storage_maintenance/"
    )

    expect(donation).not.toBeNull()
    expect(storage).not.toBeNull()
    expect(unit).not.toBeNull()
    expect(transfusion).not.toBeNull()
    expect(stockMovement).not.toBeNull()
    expect(storageMaintenance).not.toBeNull()
  })

  it("uses canonical English group keys", () => {
    const canonical = getResourceFormConfig("bloodbank", "donation", "/bloodbank/donation/")

    expect(canonical).not.toBeNull()
    expect(canonical?.etapas?.length).toBeGreaterThan(0)
  })

  it("keeps tenant readonly and hides internal fields on bloodbank event forms", () => {
    const stockMovement = getResourceFormConfig("bloodbank", "stock_movement", "/bloodbank/stock_movement/")

    expect(stockMovement?.somenteLeituraCampos).toContain("tenant")
    expect(stockMovement?.esconderCampos).toContain("id")
    expect(stockMovement?.esconderCampos).toContain("created_at")
    expect(stockMovement?.etapas?.length || 0).toBeGreaterThan(0)
  })
})
