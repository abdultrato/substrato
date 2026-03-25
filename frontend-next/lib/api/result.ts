import { apiFetch } from "./index"

export async function listResults(params?: any) {
  // ResultadoItem lives under /clinico/resultadoitem/ in the API v1.
  const query = params ? new URLSearchParams(params as any).toString() : ""
  const url = query ? `/clinico/resultadoitem/?${query}` : "/clinico/resultadoitem/"
  return apiFetch(url)
}

export async function createResult(payload: any) {
  return apiFetch("/clinico/resultadoitem/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function saveResult(id: number, resultValue: string | number) {
  return apiFetch(`/clinico/resultadoitem/${id}/gravar/`, {
    method: "POST",
    body: JSON.stringify({ result_value: resultValue }),
  })
}

export async function deleteResult(id: number) {
  return apiFetch(`/clinico/resultadoitem/${id}/`, { method: "DELETE" })
}

export async function validateResult(id: number) {
  return apiFetch(`/clinico/resultadoitem/${id}/validar/`, {
    method: "POST",
  })
}
