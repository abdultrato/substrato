export async function apiFetch(url: string, options: any = {}) {
  const res = await fetch(`/api/v1${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  if (res.status === 204) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}
