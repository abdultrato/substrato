import { OpenAPI } from "@/lib/api-client/core/OpenAPI";
import { PacientesService } from "@/lib/api-client/services/PacientesService";
import { ExamesService } from "@/lib/api-client/services/ExamesService";

// Compatibility adapter: routes some paths to generated API client when available,
// otherwise falls back to fetch against /api/v1.
export async function apiFetch<T = any>(url: string, options: any = {}): Promise<T> {
  const path = url.replace(/^\/+/, "");
  const method = (options.method || "GET").toUpperCase();

  // Ensure OpenAPI base is set (can be overridden elsewhere)
  OpenAPI.BASE = OpenAPI.BASE || "/api/v1";

  try {
    // Pacientes mapping
    if (path === "pacientes/" || path === "pacientes") {
      if (method === "GET") {
        const r = await PacientesService.clinicoPacientesList();
        // generated client returns { results, count } for list endpoints in some schemas
        // normalize to previous apiFetch behavior (array) if possible
        if (r && (r as any).results) return (r as any).results as unknown as T;
        return r as unknown as T;
      }
      if (method === "POST") {
        const body = options.body ? JSON.parse(options.body) : undefined;
        return await PacientesService.clinicoPacientesCreate(body) as unknown as T;
      }
    }

    // Paciente detail (e.g. /pacientes/123/)
    const pacienteDetail = path.match(/^pacientes\/(\d+)\/?$/);
    if (pacienteDetail) {
      const id = Number(pacienteDetail[1]);
      if (method === "GET") return await PacientesService.clinicoPacientesRetrieve(id) as unknown as T;
      if (method === "PUT") {
        const body = options.body ? JSON.parse(options.body) : undefined;
        return await PacientesService.clinicoPacientesUpdate(id, body) as unknown as T;
      }
      if (method === "DELETE") return await PacientesService.clinicoPacientesDestroy(id) as unknown as T;
      if (method === "PATCH") {
        const body = options.body ? JSON.parse(options.body) : undefined;
        return await PacientesService.clinicoPacientesPartialUpdate(id, body) as unknown as T;
      }
    }

    // Exames mapping: only list currently generated
    if (path === "exames/" || path === "exames") {
      if (method === "GET") {
        const r = await ExamesService.clinicoExamesList();
        if (r && (r as any).results) return (r as any).results as unknown as T;
        return r as unknown as T;
      }
    }

    // Fallback: original fetch behavior against /api/v1
    const res = await fetch(`/api/v1${url}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }

    if (res.status === 204) return null as unknown as T;
    try {
      return await res.json() as unknown as T;
    } catch {
      return null as unknown as T;
    }
  } catch (err: any) {
    // normalize thrown errors to Error with message
    throw err instanceof Error ? err : new Error(String(err));
  }
}
