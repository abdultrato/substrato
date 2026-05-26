import { apiFetch } from "./index"

export async function listInvoices() {
  return apiFetch("/billing/invoice/")
}

export async function createInvoice(payload: any) {
  return apiFetch("/billing/invoice/", { method: "POST", body: JSON.stringify(payload) })
}

export async function updateInvoice(id: number, payload: any) {
  return apiFetch(`/billing/invoice/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deleteInvoice(id: number) {
  return apiFetch(`/billing/invoice/${id}/`, { method: "DELETE" })
}

export async function retrieveInvoice(id: number) {
  return apiFetch(`/billing/invoice/${id}/`)
}

export async function issueInvoice(id: number) {
  return apiFetch(`/billing/invoice/${id}/issue/`, { method: "POST" })
}

export async function voidInvoice(id: number) {
  return apiFetch(`/billing/invoice/${id}/void/`, { method: "POST" })
}

export async function downloadInvoicePdf(id: number) {
  return apiFetch<Blob>(`/billing/invoice/${id}/pdf/`, { method: "GET", responseType: "blob" })
}
