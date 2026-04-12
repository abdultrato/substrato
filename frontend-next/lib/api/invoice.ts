import { apiFetch } from "./index"

export async function listarFaturas() {
  return apiFetch("/billing/invoice/")
}

export async function criarFatura(payload: any) {
  return apiFetch("/billing/invoice/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarFatura(id: number, payload: any) {
  return apiFetch(`/billing/invoice/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarFatura(id: number) {
  return apiFetch(`/billing/invoice/${id}/`, { method: "DELETE" })
}

export async function obterFatura(id: number) {
  return apiFetch(`/billing/invoice/${id}/`)
}

export async function emitirFatura(id: number) {
  // best-effort: call an action endpoint if available
  return apiFetch(`/billing/invoice/${id}/emitir/`, { method: "POST" })
}

export async function anularFatura(id: number) {
  return apiFetch(`/billing/invoice/${id}/anular/`, { method: "POST" })
}

export async function gerarPdfFatura(id: number) {
  return apiFetch<Blob>(`/billing/invoice/${id}/pdf/`, { method: "GET", responseType: "blob" })
}
