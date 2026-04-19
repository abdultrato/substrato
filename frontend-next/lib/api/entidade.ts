import { apiFetch } from "./index"

export async function listarEntidades() {
  return apiFetch("/entities/company/")
}

export async function criarEntidade(payload: any) {
  return apiFetch("/entities/company/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarEntidade(id: number, payload: any) {
  return apiFetch(`/entities/company/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarEntidade(id: number) {
  return apiFetch(`/entities/company/${id}/`, { method: "DELETE" })
}
