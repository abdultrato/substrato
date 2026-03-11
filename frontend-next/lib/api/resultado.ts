import { apiFetch } from "./index"

export async function listarResultados(params?: any) {
  // params can be used to filter by requisicao etc.
  const query = params ? new URLSearchParams(params as any).toString() : ""
  const url = query ? `/resultados/?${query}` : "/resultados/"
  return apiFetch(url)
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

export async function validarResultado(id: number) {
  return apiFetch(`/resultados/${id}/validar/`, { method: "POST" })
}
