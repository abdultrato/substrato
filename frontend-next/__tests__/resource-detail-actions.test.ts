import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

function readFrontendFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf-8")
}

describe("resource detail actions", () => {
  it("keeps critical detail actions behind OpenAPI method contracts", () => {
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/reserve/", "post")).toBe(true)
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/release/", "post")).toBe(true)
    expect(hasOpenApiMethod("/bloodbank/unit/{id}/transfuse/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/small_surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/surgery/large_surgery/{id}/create-invoice/", "post")).toBe(true)
    expect(hasOpenApiMethod("/billing/invoice/{id}/pdf/", "get")).toBe(true)
  })

  it("keeps warehouse document workflow actions behind OpenAPI method contracts", () => {
    expect(hasOpenApiMethod("/warehouse/sales_order/{id}/confirm/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/sales_order/{id}/allocate/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/sales_order/{id}/create-pick-list/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/sales_order/{id}/ship/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/replenishment_plan/{id}/generate/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/replenishment_plan/{id}/create-purchase-order/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/goods_receipt/{id}/post/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/stock_transfer/{id}/post/", "post")).toBe(true)
    expect(hasOpenApiMethod("/warehouse/cycle_count/{id}/post/", "post")).toBe(true)
  })

  it("does not use browser prompt or placeholder alerts for generic detail actions", () => {
    const content = readFrontendFile("app/resources/[group]/[resource]/[id]/page.tsx")

    expect(content).not.toContain("prompt(")
    expect(content).not.toContain("alert(")
    expect(content).not.toContain("confirm(")
    expect(content).not.toContain("Criar fatura apenas")
  })

  it("keeps critical user flows away from native browser dialogs", () => {
    const criticalFiles = [
      "app/consultations/page.tsx",
      "app/laboratory/requests/page.tsx",
      "app/invoices/page.tsx",
      "app/invoices/draft/[id]/page.tsx",
      "app/resources/[group]/[resource]/[id]/page.tsx",
      "app/nursing/procedures/[id]/page.tsx",
      "components/resources/GeneratedResourcePages.tsx",
    ]

    for (const path of criticalFiles) {
      const content = readFrontendFile(path)
      expect(content, path).not.toContain("alert(")
      expect(content, path).not.toContain("confirm(")
      expect(content, path).not.toContain("prompt(")
    }
  })

  it("does not expose raw JSON blocks in user-facing detail screens", () => {
    const detailFiles = [
      "app/resources/[group]/[resource]/[id]/page.tsx",
      "app/nursing/procedures/[id]/page.tsx",
      "app/patients/[id]/medical-history/page.tsx",
      "components/resources/ResourceActionPanel.tsx",
      "components/resources/ResourceDetailsCard.tsx",
    ]

    for (const path of detailFiles) {
      const content = readFrontendFile(path)
      expect(content, path).not.toContain("<pre")
      expect(content, path).not.toContain("JSON.stringify(data")
      expect(content, path).not.toContain("JSON.stringify(payload, null, 2)")
      expect(content, path).not.toContain("JSON.stringify(state.result")
    }
  })

  it("keeps user-facing operational pages free of debug copy and request tracing", () => {
    const invoicesPage = readFrontendFile("app/invoices/page.tsx")
    expect(invoicesPage).not.toContain("via API")
    expect(invoicesPage).not.toContain("backoffice completo")
    expect(invoicesPage).not.toContain("admin permanece")

    for (const path of ["lib/api/index.ts", "lib/api/api-client.ts"]) {
      const content = readFrontendFile(path)
      expect(content, path).not.toContain("console.debug")
      expect(content, path).not.toContain("debugging routing mismatches")
    }
  })

  it("guards critical repeated clicks during async actions", () => {
    const invoiceDraft = readFrontendFile("app/invoices/draft/[id]/page.tsx")
    expect(invoiceDraft).toContain("addingItemRef")
    expect(invoiceDraft).toContain("addingItemKey")
    expect(invoiceDraft).toContain("addItemButtonDisabled")
    expect(invoiceDraft).toContain("Adicionando...")

    const labRequests = readFrontendFile("app/laboratory/requests/page.tsx")
    expect(labRequests).toContain("pdfLoadingId")
    expect(labRequests).toContain("disabled={generatingPdf}")

    const consultations = readFrontendFile("app/consultations/page.tsx")
    expect(consultations).toContain("invoicePdfId")
    expect(consultations).toContain("openConsultationInvoicePdf")
    expect(consultations).toContain("disabled={invoicePdfId === Number(r.invoice_id)}")
  })

  it("blocks incomplete invoice drafts before issuing or payment submission", () => {
    const invoiceDraft = readFrontendFile("app/invoices/draft/[id]/page.tsx")
    expect(invoiceDraft).toContain("podeEmitirFatura")
    expect(invoiceDraft).toContain("motivoBloqueioEmissao")
    expect(invoiceDraft).toContain("Adicione pelo menos um item antes de emitir a fatura.")
    expect(invoiceDraft).toContain("Aguarde o item em gravação antes de emitir a fatura.")
    expect(invoiceDraft).toContain("mensagemValidacaoPagamento")
    expect(invoiceDraft).toContain("Preencha a seguradora e o número de autorização do seguro.")
    expect(invoiceDraft).toContain("Emitindo...")
    expect(invoiceDraft).toContain("Registrando...")
  })
})
