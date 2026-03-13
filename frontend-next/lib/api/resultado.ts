import { apiFetch } from "./index"

export async function listarResultados(params?: any) {
  // ResultadoItem lives under /clinico/resultadoitem/ in the API v1.
  const query = params ? new URLSearchParams(params as any).toString() : ""
  const url = query ? `/clinico/resultadoitem/?${query}` : "/clinico/resultadoitem/"
  return apiFetch(url)
}

export async function criarResultado(payload: any) {
  return apiFetch("/clinico/resultadoitem/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function atualizarResultado(id: number, payload: any) {
  return apiFetch(`/clinico/resultadoitem/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deletarResultado(id: number) {
  return apiFetch(`/clinico/resultadoitem/${id}/`, { method: "DELETE" })
}

export async function validarResultado(id: number) {
  // API v1 currently exposes CRUD. Validation can be expressed as a state update.
  return apiFetch(`/clinico/resultadoitem/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "validado" }),
  })
}
