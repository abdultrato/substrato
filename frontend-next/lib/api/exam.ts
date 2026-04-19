import { apiFetch } from "./index"

export async function listarExames() {
  return apiFetch("/clinical/exam/")
}

export async function criarExame(payload: any) {
  return apiFetch("/clinical/exam/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarExame(id: number, payload: any) {
  return apiFetch(`/clinical/exam/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarExame(id: number) {
  return apiFetch(`/clinical/exam/${id}/`, { method: "DELETE" })
}
