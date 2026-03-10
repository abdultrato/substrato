import { apiFetch } from "./index"

export async function listarFaturas() {
  return apiFetch("/faturas/")
}

export async function criarFatura(payload: any) {
  return apiFetch("/faturas/", { method: "POST", body: JSON.stringify(payload) })
}

export async function atualizarFatura(id: number, payload: any) {
  return apiFetch(`/faturas/${id}/`, { method: "PUT", body: JSON.stringify(payload) })
}

export async function deletarFatura(id: number) {
  return apiFetch(`/faturas/${id}/`, { method: "DELETE" })
}
