import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { getListColumnConfig } from "@/lib/resources/listColumnConfig"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

function readFrontendFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf-8")
}

describe("nursing procedure financial visibility", () => {
  it("does not render monetary values in nursing procedure screens", () => {
    const files = [
      "app/nursing/procedures/page.tsx",
      "app/nursing/procedures/[id]/page.tsx",
      "app/nursing/procedures/new/page.tsx",
    ]

    for (const path of files) {
      const content = readFrontendFile(path)
      expect(content, path).not.toContain("currency: \"MZN\"")
      expect(content, path).not.toContain("fmtMoney")
      expect(content, path).not.toContain("formatTotalWithIva")
    }

    const detail = readFrontendFile("app/nursing/procedures/[id]/page.tsx")
    expect(detail).not.toContain("Totais Financeiros")
    expect(detail).not.toContain("PDF cotação")
    expect(detail).not.toContain("/pharmacy/product/")
  })

  it("hides monetary columns and form fields in related nursing resources", () => {
    expect(getListColumnConfig("/nursing/procedure/")?.hidden).toContain("total")
    expect(getListColumnConfig("/nursing/procedure_catalog/")?.hidden).toContain("default_price")
    expect(getListColumnConfig("/nursing/procedure_item/")?.hidden).toContain("value_unitario")
    expect(getListColumnConfig("/nursing/procedure_material/")?.hidden).toContain("value_unitario")

    const catalogConfig = getResourceFormConfig("nursing", "procedure_catalog", "/nursing/procedure_catalog/")
    const itemValueConfig = getResourceFormConfig("nursing", "procedure_item_value", "/nursing/procedure_item_value/")
    const materialValueConfig = getResourceFormConfig("nursing", "procedure_material_value", "/nursing/procedure_material_value/")

    expect(catalogConfig?.esconderCampos).toContain("default_price")
    expect(itemValueConfig?.esconderCampos).toContain("unit_price")
    expect(materialValueConfig?.esconderCampos).toContain("unit_cost")
  })

  it("keeps the staged flow with the modern presentation for new procedures", () => {
    const content = readFrontendFile("app/nursing/procedures/new/page.tsx")

    expect(content).toContain("GeneratedResourceCreatePage")
    expect(content).toContain('presentation="nursing-procedure"')

    const config = getResourceFormConfig("nursing", "procedure", "/nursing/procedure/")
    expect(config?.etapas?.map((step) => step.titulo)).toEqual([
      "Paciente e equipa",
      "Procedimento",
      "Fluxo",
      "Observacoes",
    ])
  })
})
