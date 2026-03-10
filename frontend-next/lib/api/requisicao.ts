import { apiFetch } from "./index"

export async function listarRequisicoes() {
  return apiFetch("/requisicoes/")
}

export async function criarRequisicao(payload: any) {
  return apiFetch("/requisicoes/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarRequisicao(id: number, payload: any) {
  return apiFetch(`/requisicoes/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarRequisicao(id: number) {
  return apiFetch(`/requisicoes/${id}/`, { method: "DELETE" })
}
