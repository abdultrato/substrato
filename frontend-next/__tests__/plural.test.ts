import { describe, expect, it } from "vitest"

import { countForm, formatCount } from "@/lib/i18n/plural"

describe("Portuguese count forms", () => {
  it("uses explicit singular and plural forms", () => {
    expect(formatCount(1, { one: "item encontrado", other: "itens encontrados" })).toBe("1 item encontrado")
    expect(formatCount(2, { one: "item encontrado", other: "itens encontrados" })).toBe("2 itens encontrados")
    expect(formatCount(0, { one: "item encontrado", other: "itens encontrados" })).toBe("0 itens encontrados")
  })

  it("supports irregular Portuguese plurals without suffix inference", () => {
    expect(countForm(1, { one: "painel", other: "painéis" })).toBe("painel")
    expect(countForm(3, { one: "painel", other: "painéis" })).toBe("painéis")
    expect(countForm(2, { one: "catálogo encontrado", other: "catálogos encontrados" })).toBe("catálogos encontrados")
  })
})
