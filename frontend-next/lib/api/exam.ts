import { apiFetch } from "./index"

export async function listarExames() {
  return apiFetch("/exames/")
}

export async function criarExame(payload: any) {
  return apiFetch("/exames/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarExame(id: number, payload: any) {
  return apiFetch(`/exames/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarExame(id: number) {
  return apiFetch(`/exames/${id}/`, { method: "DELETE" })
}
