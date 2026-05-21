import { apiFetch } from "./index"

export async function listarEntidades() {
  return apiFetch("/external_entities/empresa/")
}

export async function criarEntidade(payload: any) {
  return apiFetch("/external_entities/empresa/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarEntidade(id: number, payload: any) {
  return apiFetch(`/external_entities/empresa/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarEntidade(id: number) {
  return apiFetch(`/external_entities/empresa/${id}/`, { method: "DELETE" })
}
