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
    expect(normalized.message).toContain("Stock Balance: Sem stock suficiente.")
  })

  it("extracts readable nested validation values", () => {
    expect(
      messageFromValidationValue({
        items: [{ product: ["Produto inválido."] }, { quantity: ["Quantidade obrigatória."] }],
      })
    ).toBe("items: product: Produto inválido.; quantity: Quantidade obrigatória.")
  })

  it("unwraps problem-details validation errors into clear field messages", () => {
    const normalized = normalizeFormApiErrors(
      {
        validation: {
          type: "about:blank",
          title: "Bad Request",
          detail:
            "{'prescription_item': [ErrorDetail(string='Pk inválido \"2\" - objeto não existe.', code='does_not_exist')]}",
          code: "VALIDATION_ERROR",
          validationErrors: {
            prescription_item: ['Pk inválido "2" - objeto não existe.'],
            plan: ['Pk inválido "2" - objeto não existe.'],
          },
        },
      },
      ["prescription_item", "plan"],
      { endpoint: "/therapy/prescription_link/" }
    )

    expect(normalized.fieldErrors).toEqual({
      prescription_item:
        "O registo selecionado não existe ou já não está disponível. Atualize a lista e selecione novamente.",
      plan:
        "O registo selecionado não existe ou já não está disponível. Atualize a lista e selecione novamente.",
    })
    expect(normalized.message).toBeNull()
    expect(normalized.firstField).toBe("prescription_item")
  })
})
