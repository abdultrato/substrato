import { apiFetch } from "./api/index"

const http = {
  async get(url: string) {
    const data = await apiFetch(url)
    return { data }
  },
  async post(url: string, body: any) {
    const data = await apiFetch(url, { method: "POST", body: JSON.stringify(body) })
    return { data }
  },
}

export default http
