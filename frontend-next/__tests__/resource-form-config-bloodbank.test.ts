import { describe, expect, it } from "vitest"

import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

describe("bloodbank resource form config", () => {
  it("provides create form config for all bloodbank resources", () => {
    const doacao = getResourceFormConfig("banco_sangue", "doacao", "/bloodbank/doacao/")
    const armazenamento = getResourceFormConfig("banco_sangue", "armazenamento", "/bloodbank/armazenamento/")
    const unidade = getResourceFormConfig("banco_sangue", "unidade", "/bloodbank/unidade/")
    const transfusao = getResourceFormConfig("banco_sangue", "transfusao", "/bloodbank/transfusao/")
    const movimento = getResourceFormConfig("banco_sangue", "movimentoestoque", "/bloodbank/movimentoestoque/")
    const manutencao = getResourceFormConfig(
      "banco_sangue",
      "manutencaoarmazenamento",
      "/bloodbank/manutencaoarmazenamento/"
    )

    expect(doacao).not.toBeNull()
    expect(armazenamento).not.toBeNull()
    expect(unidade).not.toBeNull()
    expect(transfusao).not.toBeNull()
    expect(movimento).not.toBeNull()
    expect(manutencao).not.toBeNull()
  })

  it("keeps tenant readonly and hides internal fields on bloodbank event forms", () => {
    const movimentacao = getResourceFormConfig("banco_sangue", "movimentoestoque", "/bloodbank/movimentoestoque/")

    expect(movimentacao?.somenteLeituraCampos).toContain("tenant")
    expect(movimentacao?.esconderCampos).toContain("id")
    expect(movimentacao?.esconderCampos).toContain("created_at")
    expect(movimentacao?.etapas?.length || 0).toBeGreaterThan(0)
  })
})
