import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { createResourceActionLabel } from "@/lib/resources/createLabels"

function readFrontendFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf-8")
}

describe("resource create labels", () => {
  it("builds explicit create labels from plural resource names", () => {
    expect(createResourceActionLabel("Faturas", "pt")).toBe("Criar fatura")
    expect(createResourceActionLabel("Planos de Reposição", "pt")).toBe("Criar plano de reposição")
    expect(createResourceActionLabel("Procedimentos Cirúrgicos", "pt")).toBe("Criar procedimento cirúrgico")
    expect(createResourceActionLabel("Invoices", "en")).toBe("Create invoice")
  })

  it("keeps generated CRUD create labels contextual instead of generic", () => {
    const genericList = readFrontendFile("components/resources/ResourceListPage.tsx")
    const generatedPages = readFrontendFile("components/resources/GeneratedResourcePages.tsx")

    expect(genericList).toContain("createResourceActionLabel")
    expect(genericList).not.toContain('t("Novo", "New")')
    expect(generatedPages).toContain("createResourceActionLabel")
    expect(generatedPages).not.toContain('${t("Novo", "New")}')
  })

  it("keeps dedicated CRUD shortcuts specific to their context", () => {
    const expectedLabels: Array<[string, string]> = [
      ["app/invoices/page.tsx", "Criar fatura"],
      ["app/pharmacy/material-requests/page.tsx", "Criar requisição de materiais"],
      ["app/payments/page.tsx", "Criar pagamento"],
      ["app/accounting/entries/page.tsx", "Criar lançamento"],
      ["app/medical-records/cardex/page.tsx", "Criar Cardex"],
      ["app/warehouse/page.tsx", "Criar pedido de compra"],
    ]

    for (const [path, label] of expectedLabels) {
      const content = readFrontendFile(path)
      expect(content, path).toContain(label)
      expect(content, path).not.toContain(">Novo")
      expect(content, path).not.toContain(">Nova")
    }
  })
})
