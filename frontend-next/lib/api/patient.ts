import { apiFetch } from "./index"

export async function listarPacientes() {
  return apiFetch("/pacientes/")
}

export async function criarPaciente(payload: any) {
  return apiFetch("/pacientes/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarPaciente(id: number, payload: any) {
  return apiFetch(`/pacientes/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarPaciente(id: number) {
  return apiFetch(`/pacientes/${id}/`, { method: "DELETE" })
}
