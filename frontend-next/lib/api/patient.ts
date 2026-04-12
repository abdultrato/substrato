import { apiFetch } from "./index"

export async function listarPacientes() {
  return apiFetch("/clinical/patient/")
}

export async function criarPaciente(payload: any) {
  return apiFetch("/clinical/patient/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarPaciente(id: number, payload: any) {
  return apiFetch(`/clinical/patient/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarPaciente(id: number) {
  return apiFetch(`/clinical/patient/${id}/`, { method: "DELETE" })
}
