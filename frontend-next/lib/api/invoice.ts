import { apiFetch } from "./index"

export async function listarFaturas() {
  return apiFetch("/faturas/")
}

export async function criarFatura(payload: any) {
  return apiFetch("/faturas/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarFatura(id: number, payload: any) {
  return apiFetch(`/faturas/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarFatura(id: number) {
  return apiFetch(`/faturas/${id}/`, { method: "DELETE" })
}

export async function obterFatura(id: number) {
  return apiFetch(`/faturas/${id}/`)
}

export async function emitirFatura(id: number) {
  // best-effort: call an action endpoint if available
  return apiFetch(`/faturas/${id}/emitir/`, { method: "POST" })
}

export async function anularFatura(id: number) {
  return apiFetch(`/faturas/${id}/anular/`, { method: "POST" })
}

export async function gerarPdfFatura(id: number) {
  return apiFetch<Blob>(`/faturas/${id}/pdf/`, { method: "GET", responseType: "blob" })
}
