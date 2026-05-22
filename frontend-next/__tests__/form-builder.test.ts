import { describe, expect, it } from "vitest"

import { buildFormSpec } from "@/lib/openapi/formBuilder"

describe("formBuilder aliases", () => {
  it("resolve schema para alias de prontuario/registro", () => {
    const spec = buildFormSpec("/medical-records/registro/", "post")
    expect(spec).not.toBeNull()
    expect((spec?.fields.length || 0) > 0).toBe(true)
  })

  it("resolve schema para alias kebab/plural de lab-exams e preserva campos obrigatorios", () => {
    const spec = buildFormSpec("/clinical/lab-exams/", "post")
    expect(spec).not.toBeNull()

    const sampleType = spec?.submitFields.find((field) => field.name === "sample_type")
    expect(sampleType).toBeDefined()
    expect(sampleType?.required).toBe(true)
  })

  it("aceita endpoint com prefixo /api/v1 sem duplicar nem perder spec", () => {
    const spec = buildFormSpec("/api/v1/clinical/lab-exams/", "post")
    expect(spec).not.toBeNull()
    expect((spec?.submitFields.length || 0) > 0).toBe(true)
  })
})

