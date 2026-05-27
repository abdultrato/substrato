import { describe, expect, it } from "vitest"

import {
  messageFromValidationValue,
  normalizeFormApiErrors,
} from "@/lib/resources/formErrors"

describe("form error normalization", () => {
  it("maps DRF field validation arrays to known form fields", () => {
    const normalized = normalizeFormApiErrors(
      {
        validation: {
          patient: ["Este campo é obrigatório."],
          quantity: ["Certifique-se de que este valor é maior que 0."],
        },
      },
      ["patient", "quantity", "notes"]
    )

    expect(normalized.fieldErrors).toEqual({
      patient: "Este campo é obrigatório.",
      quantity: "Certifique-se de que este valor é maior que 0.",
    })
    expect(normalized.firstField).toBe("patient")
    expect(normalized.message).toBeNull()
  })

  it("keeps unknown validation keys as form-level messages", () => {
    const normalized = normalizeFormApiErrors(
      {
        validation: {
          non_field_errors: ["Operação inválida para o estado atual."],
          stock_balance: ["Sem stock suficiente."],
        },
      },
      ["product", "quantity"]
    )

    expect(normalized.fieldErrors).toEqual({})
    expect(normalized.message).toContain("Operação inválida para o estado atual.")
    expect(normalized.message).toContain("stock balance: Sem stock suficiente.")
  })

  it("extracts readable nested validation values", () => {
    expect(
      messageFromValidationValue({
        items: [{ product: ["Produto inválido."] }, { quantity: ["Quantidade obrigatória."] }],
      })
    ).toBe("items: product: Produto inválido.; quantity: Quantidade obrigatória.")
  })
})
