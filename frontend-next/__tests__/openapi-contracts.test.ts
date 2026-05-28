import { describe, expect, it } from "vitest"

import { hasOpenApiMethod, hasWriteContract } from "@/lib/openapi/writeContract"

describe("OpenAPI resource contracts", () => {
  it("resolves read contracts through canonical frontend aliases", () => {
    expect(hasOpenApiMethod("/clinical/lab-exams/", "get")).toBe(true)
    expect(hasOpenApiMethod("/consultations/holidays/", "get")).toBe(true)
    expect(hasOpenApiMethod("/medical-records/registro/{id}/", "get")).toBe(true)
  })

  it("does not expose unsupported methods for collection-only resources", () => {
    expect(hasOpenApiMethod("/ai/assistant/sessions/", "get")).toBe(true)
    expect(hasOpenApiMethod("/ai/assistant/sessions/", "post")).toBe(false)
    expect(hasOpenApiMethod("/ai/assistant/sessions/{id}/", "get")).toBe(true)
    expect(hasWriteContract("/ai/assistant/sessions/{id}/", "put")).toBe(false)
    expect(hasOpenApiMethod("/ai/assistant/tasks/{id}/", "patch")).toBe(true)
  })

  it("accepts patch as the edit fallback for writable detail resources", () => {
    expect(hasWriteContract("/clinical/patients/{id}/", "put")).toBe(true)
  })
})
