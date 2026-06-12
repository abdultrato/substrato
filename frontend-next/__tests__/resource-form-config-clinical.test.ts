import { describe, expect, it } from "vitest"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

describe("probe", () => {
  it("resolves labrequest config for hyphenated route keys", () => {
    expect(getResourceFormConfig("clinical", "lab-requests", "/clinical/lab-requests/")).toBeTruthy()
    expect(getResourceFormConfig("clinical", "labrequest", "/clinical/labrequest/")).toBeTruthy()
    expect(getResourceFormConfig("clinical", "occupational_profile", "/clinical/occupational_profile/")).toBeTruthy()
    const cfg = getResourceFormConfig("clinical", "lab-requests", "/clinical/lab-requests/")
    expect(cfg?.esconderCampos).toContain("status")
  })
})
