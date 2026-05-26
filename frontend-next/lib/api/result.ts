import { apiFetch } from "./index"

export async function listResults(params?: any) {
  // ResultItem lives under /clinical/resultitem/ in the API v1.
  const query = params ? new URLSearchParams(params as any).toString() : ""
  const url = query ? `/clinical/resultitem/?${query}` : "/clinical/resultitem/"
  return apiFetch(url)
}

export async function createResult(payload: any) {
  return apiFetch("/clinical/resultitem/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function saveResult(id: number, resultValue: string | number) {
  return apiFetch(`/clinical/resultitem/${id}/save-result/`, {
    method: "POST",
    body: JSON.stringify({ result_value: resultValue }),
  })
}

export async function deleteResult(id: number) {
  return apiFetch(`/clinical/resultitem/${id}/`, { method: "DELETE" })
}

export async function validateResult(id: number) {
  return apiFetch(`/clinical/resultitem/${id}/validate-result/`, {
    method: "POST",
  })
}
