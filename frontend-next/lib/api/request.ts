import { apiFetch } from "./index"

export async function listRequests() {
  return apiFetch("/requisicoes/")
}

export async function createRequest(payload: any) {
  return apiFetch("/requisicoes/", { method: "POST", body: JSON.stringify(payload) })
}

export async function updateRequest(id: number, payload: any) {
  return apiFetch(`/requisicoes/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deleteRequest(id: number) {
  return apiFetch(`/requisicoes/${id}/`, { method: "DELETE" })
}

export async function cancelRequest(id: number) {
  return apiFetch(`/requisicoes/${id}/cancelar/`, { method: "POST" })
}

export async function validateRequestResults(id: number) {
  return apiFetch(`/requisicoes/${id}/validar_resultados/`, { method: "POST" })
}
