import { apiFetch } from "./index"

export async function listRequests() {
  return apiFetch("/clinical/labrequest/")
}

export async function createRequest(payload: any) {
  return apiFetch("/clinical/labrequest/", { method: "POST", body: JSON.stringify(payload) })
}

export async function updateRequest(id: number, payload: any) {
  return apiFetch(`/clinical/labrequest/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deleteRequest(id: number) {
  return apiFetch(`/clinical/labrequest/${id}/`, { method: "DELETE" })
}

export async function cancelRequest(id: number) {
  return apiFetch(`/clinical/labrequest/${id}/cancelar/`, { method: "POST" })
}

export async function validateRequestResults(id: number) {
  return apiFetch(`/clinical/labrequest/${id}/validar_resultados/`, { method: "POST" })
}
