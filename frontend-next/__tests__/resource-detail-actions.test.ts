import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

describe("resource detail actions", () => {
  it("keeps critical detail actions behind OpenAPI method contracts", () => {
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/reserve/", "post")).toBe(true)
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/release/", "post")).toBe(true)
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/transfuse/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/small_surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/large_surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/billing/invoice/{id}/pdf/", "get")).toBe(true)
  })

  it("does not use browser prompt or placeholder alerts for generic detail actions", () => {
    const content = readFileSync(
      resolve(process.cwd(), "app/resources/[group]/[resource]/[id]/page.tsx"),
      "utf-8"
    )

    expect(content).not.toContain("prompt(")
    expect(content).not.toContain("alert(")
    expect(content).not.toContain("Criar fatura apenas")
  })
})
