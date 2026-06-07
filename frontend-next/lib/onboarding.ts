// Cliente leve para os endpoints públicos de onboarding (signup/pricing/checkout).

const backendBase =
  (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/$/, "")

function apiUrl(path: string) {
  return backendBase ? `${backendBase}${path}` : path
}

export interface PublicPlan {
  id: number
  custom_id: string | null
  name: string
  description?: string
  type: string
  monthly_price: string
  user_limit: number
  monthly_request_limit: number
  priority_support: boolean
  allows_multi_unit: boolean
}

export interface SignupPayload {
  company_name: string
  admin_name?: string
  email: string
  password: string
  plan_id?: number
  cycle?: "MENSAL" | "ANUAL"
}

async function jsonOrThrow(res: Response) {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const detail =
      body?.detail ||
      body?.email?.[0] ||
      body?.plan_id?.[0] ||
      body?.password?.[0] ||
      body?.company_name?.[0] ||
      "Não foi possível concluir a operação."
    throw new Error(detail)
  }
  return body
}

export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const res = await fetch(apiUrl("/api/v1/onboarding/plans/"), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  return jsonOrThrow(res)
}

export async function signup(payload: SignupPayload) {
  const res = await fetch(apiUrl("/api/v1/onboarding/signup/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  return jsonOrThrow(res)
}

export async function checkout(input: { gateway?: string; phone?: string } = {}) {
  const res = await fetch(apiUrl("/api/v1/onboarding/checkout/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return jsonOrThrow(res)
}
