// Mapa slug → endpoint da API do Laboratório Clínico (LIS).
// Os endpoints reais são servidos em /api/v1/clinical_laboratory/<recurso>/.
export const LAB_RESOURCE_ROUTES: Record<string, string> = {
  // Catálogo
  sectors: "/clinical_laboratory/sector/",
  tests: "/clinical_laboratory/test/",
  "test-fields": "/clinical_laboratory/test_field/",
  panels: "/clinical_laboratory/panel/",
  // Pedido
  orders: "/clinical_laboratory/order/",
  "order-items": "/clinical_laboratory/order_item/",
  // Pré-analítico
  collections: "/clinical_laboratory/collection/",
  samples: "/clinical_laboratory/sample/",
  reception: "/clinical_laboratory/reception/",
  rejections: "/clinical_laboratory/rejection/",
  // Analítico
  worklists: "/clinical_laboratory/worklist/",
  results: "/clinical_laboratory/result/",
  validations: "/clinical_laboratory/validation/",
  // Pós-analítico
  reports: "/clinical_laboratory/report/",
  "critical-results": "/clinical_laboratory/critical_notification/",
  // Sectores especializados
  cultures: "/clinical_laboratory/culture/",
  isolates: "/clinical_laboratory/isolate/",
  antibiograms: "/clinical_laboratory/antibiogram/",
  molecular: "/clinical_laboratory/molecular_result/",
  "afb-smears": "/clinical_laboratory/afb_smear/",
}

export function labEndpointFromSlug(slug: string | string[] | undefined): string | null {
  const key = Array.isArray(slug) ? slug[0] : slug
  if (!key) return null
  return LAB_RESOURCE_ROUTES[key] || null
}
