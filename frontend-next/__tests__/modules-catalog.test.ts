import { describe, expect, it } from "vitest"

import {
  MODULES,
  discoverModulesFromApiRoot,
  discoverModulesFromOpenApiSchema,
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
    expect(found?.group.key).toBe("clinical")
    expect(found?.resource.key).toBe("paciente")
    expect(found?.resource.label).toBe("Pacientes")
    expect(found?.resource.endpoint).toBe("/clinical/patient/")
  })

  it("adds unknown routes from backend root to known groups", () => {
    const discovered = discoverModulesFromApiRoot({
      "clinical/customresource": "/api/v1/clinical/customresource/",
    })
    const merged = mergeModules(MODULES, discovered)

    const found = findModuleResource("clinical", "customresource", merged)
    expect(found).not.toBeNull()
    expect(found?.resource.endpoint).toBe("/clinical/customresource/")
  })

  it("discovers resources from OpenAPI paths and keeps backend endpoint", () => {
    const discovered = discoverModulesFromOpenApiSchema({
      paths: {
        "/api/v1/pharmacy/product/": { get: {} },
      },
    })
    const merged = mergeModules(MODULES, discovered)
    const found = findModuleResource("pharmacy", "product", merged)

    expect(found).not.toBeNull()
    expect(found?.resource.endpoint).toBe("/pharmacy/product/")
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
    const move = findModuleResource("pharmacy", "inventory_movement", MODULES)
    const lot = findModuleResource("pharmacy", "lot", MODULES)

    expect(move?.resource.adminListHref).toBe("/admin/pharmacy/inventorymovement/")
    expect(lot?.resource.adminListHref).toBe("/admin/pharmacy/lot/")
  })

  it("exposes pharmacy resources with English technical keys and endpoints", () => {
    const product = findModuleResource("pharmacy", "product", MODULES)
    const requisition = findModuleResource("pharmacy", "material_requisition", MODULES)
    const saleItem = findModuleResource("pharmacy", "sale_item", MODULES)

    expect(product?.resource.label).toBe("Produtos")
    expect(product?.resource.endpoint).toBe("/pharmacy/product/")
    expect(requisition?.resource.label).toBe("Requisições de Material")
    expect(requisition?.resource.endpoint).toBe("/pharmacy/material_requisition/")
    expect(saleItem?.resource.label).toBe("Itens de Venda")
    expect(saleItem?.resource.endpoint).toBe("/pharmacy/sale_item/")
  })

  it("keeps bloodbank admin shortcuts available in static catalog", () => {
    const donation = findModuleResource("bloodbank", "doacao", MODULES)
    const maintenance = findModuleResource("bloodbank", "manutencaoarmazenamento", MODULES)

    expect(donation?.resource.adminListHref).toBe("/admin/bloodbank/blooddonation/")
    expect(maintenance?.resource.adminListHref).toBe("/admin/bloodbank/bloodstoragemaintenance/")
  })

  it("keeps operational AI labels and admin shortcuts available", () => {
    const session = findModuleResource("ai_assistant", "ai_session", MODULES)
    const task = findModuleResource("ia_operacional", "ai_operational_task", MODULES)

    expect(session?.group.label).toBe("IA Operacional")
    expect(session?.resource.label).toBe("Sessões da IA")
    expect(session?.resource.adminListHref).toBe("/admin/ai_assistant/aisession/")
    expect(task?.resource.adminListHref).toBe("/admin/ai_assistant/aioperationaltask/")
  })

  it("exposes warehouse resources with English technical keys and endpoints", () => {
    const salesOrder = findModuleResource("warehouse", "sales_order", MODULES)
    const stockLevel = findModuleResource("warehouse", "stock_level", MODULES)

    expect(salesOrder?.resource.label).toBe("Pedidos de Venda")
    expect(salesOrder?.resource.endpoint).toBe("/warehouse/sales_order/")
    expect(stockLevel?.resource.label).toBe("Saldos de Estoque")
    expect(stockLevel?.resource.endpoint).toBe("/warehouse/stock_level/")
  })

  it("exposes equipment resources with English technical keys and endpoints", () => {
    const inspection = findModuleResource("equipment", "daily_inspection", MODULES)
    const incident = findModuleResource("equipment", "incident", MODULES)
    const maintenance = findModuleResource("equipment", "maintenance", MODULES)

    expect(inspection?.resource.label).toBe("Inspeções Diárias")
    expect(inspection?.resource.endpoint).toBe("/equipment/daily_inspection/")
    expect(incident?.resource.label).toBe("Ocorrências")
    expect(incident?.resource.endpoint).toBe("/equipment/incident/")
    expect(maintenance?.resource.label).toBe("Manutenções")
    expect(maintenance?.resource.endpoint).toBe("/maintenance/maintenance/")
  })

  it("infers bloodbank admin path when route comes from backend discovery", () => {
    const discovered = discoverModulesFromApiRoot({
      "bloodbank/transfusao": "/api/v1/bloodbank/transfusao/",
    })
    const merged = mergeModules(MODULES, discovered)
    const transfusion = findModuleResource("bloodbank", "transfusao", merged)

    expect(transfusion?.resource.adminListHref).toBe("/admin/bloodbank/bloodtransfusion/")
  })

  it("deduplicates PT/EN endpoint aliases when they map to the same admin model", () => {
    const discovered = discoverModulesFromApiRoot({
      "equipment/daily_inspection": "/api/v1/equipment/daily_inspection/",
    })
    const merged = mergeModules(MODULES, discovered)
    const equipment = merged.find((group) => group.key === "equipment")

    expect(equipment).toBeDefined()
    const inspectionResources =
      equipment?.resources.filter(
        (resource) =>
          resource.adminListHref === "/admin/inspections/dailyinspection/"
      ) || []

    expect(inspectionResources).toHaveLength(1)
    expect(inspectionResources[0].endpoint).toBe("/equipment/daily_inspection/")
  })

  it("keeps segregated surgery admin shortcuts available", () => {
    const small = findModuleResource("surgery", "pequenacirurgia", MODULES)
    const large = findModuleResource("surgery", "grandecirurgia", MODULES)

    expect(small?.resource.adminListHref).toBe("/admin/surgery/smallsurgery/")
    expect(large?.resource.adminListHref).toBe("/admin/surgery/largesurgery/")
  })

  it("hides admin shortcut when backend has no registered model admin", () => {
    const invoiceItem = findModuleResource("billing", "faturaitem", MODULES)
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
      "/admin/faturamento/",
      "/admin/consultas/",
      "/admin/recepcao/",
      "/admin/prontuario/",
      "/admin/maternidade/",
      "/admin/cirurgia/",
      "/admin/inquilinos/",
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
