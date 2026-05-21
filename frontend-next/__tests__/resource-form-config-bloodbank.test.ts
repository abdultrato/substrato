import { describe, expect, it } from "vitest"

import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

describe("bloodbank resource form config", () => {
  it("provides create form config for all bloodbank resources", () => {
    const doacao = getResourceFormConfig("bloodbank", "doacao", "/bloodbank/doacao/")
    const armazenamento = getResourceFormConfig("bloodbank", "armazenamento", "/bloodbank/armazenamento/")
    const unidade = getResourceFormConfig("bloodbank", "unidade", "/bloodbank/unidade/")
    const transfusao = getResourceFormConfig("bloodbank", "transfusao", "/bloodbank/transfusao/")
    const movimento = getResourceFormConfig("bloodbank", "movimentoestoque", "/bloodbank/movimentoestoque/")
    const manutencao = getResourceFormConfig(
      "bloodbank",
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

  it("keeps backward compatibility for legacy group aliases", () => {
    const legacy = getResourceFormConfig("banco_sangue", "doacao", "/bloodbank/doacao/")
    const canonical = getResourceFormConfig("bloodbank", "doacao", "/bloodbank/doacao/")

    expect(legacy).not.toBeNull()
    expect(canonical).not.toBeNull()
    expect(legacy?.etapas?.length).toBe(canonical?.etapas?.length)
  })

  it("keeps tenant readonly and hides internal fields on bloodbank event forms", () => {
    const movimentacao = getResourceFormConfig("bloodbank", "movimentoestoque", "/bloodbank/movimentoestoque/")

    expect(movimentacao?.somenteLeituraCampos).toContain("tenant")
    expect(movimentacao?.esconderCampos).toContain("id")
    expect(movimentacao?.esconderCampos).toContain("created_at")
    expect(movimentacao?.etapas?.length || 0).toBeGreaterThan(0)
  })
})
