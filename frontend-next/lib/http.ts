import { apiFetch, type ApiFetchOptions } from "./api/index"

const http = {
  async get(url: string, opts?: ApiFetchOptions) {
    const data = await apiFetch(url, opts)
    return { data }
  },
  async post(url: string, body: any, opts?: ApiFetchOptions) {
    const data = await apiFetch(url, { method: "POST", body: JSON.stringify(body), ...(opts || {}) })
    return { data }
  },
}

export default http
