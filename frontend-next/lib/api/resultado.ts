import { apiFetch } from "./index"

export async function listarResultados() {
  return apiFetch("/resultados/")
}

export async function criarResultado(payload: any) {
  return apiFetch("/resultados/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarResultado(id: number, payload: any) {
  return apiFetch(`/resultados/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarResultado(id: number) {
  return apiFetch(`/resultados/${id}/`, { method: "DELETE" })
}
