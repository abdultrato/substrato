import { describe, expect, it } from "vitest"

import {
  MODULES,
  discoverModulesFromApiRoot,
  findModuleResource,
  mergeModules,
} from "@/lib/modules"

describe("modules catalog discovery", () => {
  it("reuses static labels/keys for known endpoints", () => {
    const discovered = discoverModulesFromApiRoot({
      "clinical/patient": "http://localhost:8000/api/v1/clinical/patient/",
    })

    const merged = mergeModules(MODULES, discovered)
    const found = findModuleResource("clinical", "patient", merged)

    expect(found).not.toBeNull()
    expect(found?.group.key).toBe("clinico")
    expect(found?.resource.key).toBe("paciente")
    expect(found?.resource.label).toBe("Pacientes")
    expect(found?.resource.endpoint).toBe("/clinical/patient/")
  })

  it("adds unknown routes from backend root to known groups", () => {
    const discovered = discoverModulesFromApiRoot({
      "clinical/customresource": "/api/v1/clinical/customresource/",
    })
    const merged = mergeModules(MODULES, discovered)

    const found = findModuleResource("clinico", "customresource", merged)
    expect(found).not.toBeNull()
    expect(found?.resource.endpoint).toBe("/clinical/customresource/")
  })

  it("creates group entries for new backend groups not mapped in static catalog", () => {
    const discovered = discoverModulesFromApiRoot({
      "audit/usuario": "/api/v1/audit/usuario/",
    })
    const merged = mergeModules(MODULES, discovered)
    const found = findModuleResource("audit", "usuario", merged)

    expect(found).not.toBeNull()
    expect(found?.group.label).toBe("Audit")
  })

  it("uses real django admin paths for mapped resources", () => {
    const move = findModuleResource("farmacia", "movimentoestoque", MODULES)
    const lot = findModuleResource("farmacia", "lote", MODULES)

    expect(move?.resource.adminListHref).toBe("/admin/pharmacy/inventorymovement/")
    expect(lot?.resource.adminListHref).toBe("/admin/pharmacy/lot/")
  })

  it("hides admin shortcut when backend has no registered model admin", () => {
    const invoiceItem = findModuleResource("faturamento", "faturaitem", MODULES)
    expect(invoiceItem?.resource.adminListHref).toBeUndefined()
  })

  it("does not expose legacy portuguese admin slugs in generated shortcuts", () => {
    const legacySlugs = [
      "/admin/farmacia/",
      "/admin/contabilidade/",
      "/admin/seguradora/",
      "/admin/enfermagem/",
      "/admin/recursos_humanos/",
      "/admin/monitoramento/",
      "/admin/notificacoes/",
      "/admin/identidade/",
      "/admin/entidades/",
    ]

    const invalid = MODULES.flatMap((group) =>
      group.resources
        .map((resource) => resource.adminListHref)
        .filter((href): href is string => !!href)
        .filter((href) => legacySlugs.some((legacy) => href.startsWith(legacy)))
    )

    expect(invalid).toEqual([])
  })
})
