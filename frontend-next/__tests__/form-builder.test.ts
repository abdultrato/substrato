import { describe, expect, it } from "vitest"

import { buildFormSpec } from "@/lib/openapi/formBuilder"

describe("formBuilder aliases", () => {
  it("resolve schema para alias de prontuario/registro", () => {
    const spec = buildFormSpec("/prontuario/registro/", "post")
    expect(spec).not.toBeNull()
    expect((spec?.fields.length || 0) > 0).toBe(true)
  })
})

