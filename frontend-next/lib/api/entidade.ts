import { apiFetch } from "./index"

export async function listarEntidades() {
  return apiFetch("/entidades/")
}

export async function criarEntidade(payload: any) {
  return apiFetch("/entidades/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarEntidade(id: number, payload: any) {
  return apiFetch(`/entidades/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarEntidade(id: number) {
  return apiFetch(`/entidades/${id}/`, { method: "DELETE" })
}
