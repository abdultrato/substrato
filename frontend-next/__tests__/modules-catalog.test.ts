import { describe, expect, it } from "vitest"

import {
  MODULES,
  discoverModulesFromApiRoot,
  discoverModulesFromOpenApiSchema,
  findModuleResource,
  mergeModules,
} from "@/lib/modules"
import {
  DOMAIN_MODULE_KEYS_BY_DOMAIN,
  DOMAIN_MODULES,
  domainModuleDefinitionFor,
  domainModuleDefinitionsForDomain,
  primaryHrefForDomainModule,
} from "@/lib/domainModules"

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
    expect(found?.group.label).toBe("Auditoria")
  })

  it("localizes unknown discovered audit resources to Portuguese", () => {
    const discovered = discoverModulesFromApiRoot({
      "audit/user_audit": "/api/v1/audit/user_audit/",
    })
    const merged = mergeModules(MODULES, discovered)
    const found = findModuleResource("audit", "user_audit", merged)

    expect(found).not.toBeNull()
    expect(found?.group.label).toBe("Auditoria")
    expect(found?.resource.label).toBe("Auditoria de Utilizador")
  })

  it("does not expose the English Workspace label in the static catalog", () => {
    const workspace = findModuleResource("reception", "workspace", MODULES)

    expect(workspace?.resource.label).toBe("Área de trabalho")
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
    const donation = findModuleResource("bloodbank", "donation", MODULES)
    const maintenance = findModuleResource("bloodbank", "storage_maintenance", MODULES)

    expect(donation?.resource.adminListHref).toBe("/admin/bloodbank/blooddonation/")
    expect(maintenance?.resource.adminListHref).toBe("/admin/bloodbank/bloodstoragemaintenance/")
  })

  it("keeps operational AI labels and admin shortcuts available", () => {
    const session = findModuleResource("ai_assistant", "ai_session", MODULES)
    const task = findModuleResource("ia_operacional", "ai_operational_task", MODULES)

    expect(session?.group.label).toBe("IA Operacional")
    expect(session?.resource.label).toBe("Sessões da IA")
    expect(session?.resource.endpoint).toBe("/ai/assistant/sessions/")
    expect(session?.resource.adminListHref).toBe("/admin/ai_assistant/aisession/")
    expect(task?.resource.endpoint).toBe("/ai/assistant/tasks/")
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
      "bloodbank/transfusion": "/api/v1/bloodbank/transfusion/",
    })
    const merged = mergeModules(MODULES, discovered)
    const transfusion = findModuleResource("bloodbank", "transfusion", merged)

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
    const small = findModuleResource("surgery", "small_surgery", MODULES)
    const large = findModuleResource("surgery", "large_surgery", MODULES)

    expect(small?.resource.adminListHref).toBe("/admin/surgery/smallsurgery/")
    expect(large?.resource.adminListHref).toBe("/admin/surgery/largesurgery/")
  })

  it("keeps expanded surgery and pathology resources available", () => {
    const schedule = findModuleResource("surgery", "agenda_cirurgica", MODULES)
    const anesthesia = findModuleResource("surgery", "anestesia", MODULES)
    const report = findModuleResource("surgery", "relatorio_operatorio", MODULES)
    const sampleReception = findModuleResource("pathology", "recepcao_amostras", MODULES)
    const pathologyReport = findModuleResource("pathology", "laudos", MODULES)

    expect(schedule?.resource.endpoint).toBe("/surgery/agenda_cirurgica/")
    expect(schedule?.resource.adminListHref).toBe("/admin/surgery/surgicalschedule/")
    expect(anesthesia?.resource.endpoint).toBe("/surgery/anestesia/")
    expect(report?.resource.endpoint).toBe("/surgery/relatorio_operatorio/")
    expect(sampleReception?.resource.endpoint).toBe("/pathology/recepcao_amostras/")
    expect(sampleReception?.resource.adminListHref).toBe("/admin/patologia/pathologysamplereception/")
    expect(pathologyReport?.resource.endpoint).toBe("/pathology/laudos/")
  })

  it("hides admin shortcut when backend has no registered model admin", () => {
    const invoiceItem = findModuleResource("billing", "faturaitem", MODULES)
    const discovered = discoverModulesFromApiRoot({
      "insurer/tenant_coverage_plan": "/api/v1/insurer/tenant_coverage_plan/",
    })
    const merged = mergeModules(MODULES, discovered)
    const tenantPlan = findModuleResource("insurer", "tenant_coverage_plan", merged)

    expect(invoiceItem?.resource.adminListHref).toBeUndefined()
    expect(tenantPlan?.resource.adminListHref).toBeUndefined()
  })

  it("keeps the static catalog aligned with canonical exposed endpoints", () => {
    const endpoints = new Set(MODULES.flatMap((group) => group.resources.map((resource) => resource.endpoint)))

    expect(endpoints).toContain("/monitoring/export_job/")
    expect(endpoints).toContain("/notifications/notification/")
    expect(endpoints).toContain("/notifications/template/")
    expect(endpoints).toContain("/equipment_integrations/equipment/")
    expect(endpoints).toContain("/audit/atividade/")
    expect(endpoints).toContain("/dashboard/analytics/")
    expect(endpoints).toContain("/human_resources/profissao/")
    expect(endpoints).toContain("/nursing/ward_dashboard/")
  })

  it("does not expose known misleading legacy API routes in the static catalog", () => {
    const endpoints = MODULES.flatMap((group) => group.resources.map((resource) => resource.endpoint))

    expect(endpoints).not.toContain("/notifications/notificacao/")
    expect(endpoints).not.toContain("/ai_assistant/ai-sessions/")
    expect(endpoints).not.toContain("/ai_assistant/ai-investigations/")
    expect(endpoints).not.toContain("/ai_assistant/ai-operational-tasks/")
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

  it("exposes the backend domain organization in the frontend catalog", () => {
    expect(Object.keys(DOMAIN_MODULE_KEYS_BY_DOMAIN)).toEqual(
      expect.arrayContaining([
        "clinical",
        "diagnostics",
        "hospitalization",
        "care",
        "operations",
        "administration",
        "platform",
        "analytics",
        "public_health",
      ])
    )

    expect(DOMAIN_MODULE_KEYS_BY_DOMAIN.clinical).toEqual(
      expect.arrayContaining([
        "clinical.patients",
        "clinical.dentistry",
        "clinical.surgery",
        "clinical.pediatrics",
        "clinical.cardiology",
        "clinical.pathology",
      ])
    )
    expect(DOMAIN_MODULE_KEYS_BY_DOMAIN.diagnostics).toEqual(
      expect.arrayContaining([
        "diagnostics.laboratory",
        "diagnostics.radiology",
        "diagnostics.blood_bank",
      ])
    )
    expect(DOMAIN_MODULE_KEYS_BY_DOMAIN.hospitalization).toEqual(
      expect.arrayContaining([
        "hospitalization.emergency",
        "hospitalization.inpatient_care",
        "hospitalization.intensive_care",
        "hospitalization.operating_room",
      ])
    )
  })

  it("maps requested domain aliases to real frontend resources or planned modules", () => {
    const expected: Record<string, string | null> = {
      identity: "/modules/identity/usuario",
      tenants: "/modules/tenants/inquilino",
      users: "/modules/identity/usuario",
      permissions: "/modules/identity/perfilprofissional",
      patients: "/modules/clinical/paciente",
      appointments: "/modules/consultations/consulta",
      encounters: "/modules/consultations/consulta",
      electronic_health_records: "/modules/medical_records/registro",
      dentistry: "/modules/dental",
      surgery: "/modules/surgery",
      pediatrics: "/modules/consultations/especialidade",
      gynecology: "/modules/maternity/gestacao",
      obstetrics: "/modules/maternity/gestacao",
      cardiology: "/modules/specialty_diagnostics/order",
      orthopedics: "/modules/consultations/especialidade",
      ophthalmology: "/modules/specialty_diagnostics/order",
      dermatology: "/modules/telemedicine/async_case",
      neurology: "/modules/specialty_diagnostics/order",
      oncology: "/modules/consultations/especialidade",
      pathology: "/modules/pathology",
      laboratory: "/modules/clinical/requisicaoanalise",
      radiology: "/modules/radiology",
      blood_bank: "/modules/bloodbank",
      emergency: "/modules/reception/checkin",
      inpatient_care: "/modules/nursing/ward_admission",
      intensive_care: "/modules/nursing/ward_admission",
      operating_room: "/modules/surgery/centro_cirurgico",
      nursing: "/modules/nursing",
      nutrition: null,
      psychology: null,
      physiotherapy: "/modules/physiotherapy",
      social_services: null,
      inventory: "/modules/warehouse/stock_level",
      procurement: "/modules/warehouse/purchase_order",
      pharmacy: "/modules/pharmacy",
      finance: "/modules/accounting",
      billing: "/modules/billing",
      insurance: "/modules/insurer",
      human_resources: "/modules/human_resources/funcionario",
      payroll: "/modules/human_resources/folhapagamento",
      analytics: "/modules/monitoring",
      reporting: "/modules/monitoring/export_job",
      auditing: "/modules/audit/atividade",
      notifications: "/modules/notifications/notification",
      documents: null,
      integrations: "/modules/equipment_integrations/equipment",
      public_health: "/modules/public_health",
    }

    for (const [lookup, href] of Object.entries(expected)) {
      const definition = domainModuleDefinitionFor(lookup)
      expect(definition, lookup).toBeDefined()
      expect(primaryHrefForDomainModule(definition!, MODULES)).toBe(href)
    }
  })

  it("keeps planned domain modules separated from active modules", () => {
    const allCare = domainModuleDefinitionsForDomain("care")
    const activeCare = domainModuleDefinitionsForDomain("care", { includePlanned: false })

    expect(allCare.map((definition) => definition.key)).toContain("care.nutrition")
    expect(activeCare.map((definition) => definition.key)).not.toContain("care.nutrition")
    expect(DOMAIN_MODULES.find((definition) => definition.key === "clinical.cardiology")?.status).toBe("partial")
  })
})
