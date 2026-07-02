"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GeneratedResourceDetailPage } from "@/components/resources/GeneratedResourcePages";
import { apiFetch } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";

type LegacyRouteState = "checking" | "render-order" | "redirecting";

export default function SpecialtyDiagnosticsExamsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)
  const [state, setState] = useState<LegacyRouteState>("checking")

  useEffect(() => {
    if (!id) return

    let active = true

    async function resolveLegacyRoute() {
      try {
        await apiFetch(`/specialty_diagnostics/order/${id}/`, { clientCache: false })
        if (active) setState("render-order")
        return
      } catch {}

      try {
        const request = await apiFetch<Record<string, any>>(`/clinical/lab-requests/${id}/`, { clientCache: false })
        if (String(request?.type || "").toUpperCase() === "MED") {
          if (active) setState("redirecting")
          router.replace(`/clinical/lab-requests/${id}`)
          return
        }
      } catch {}

      if (active) setState("render-order")
    }

    void resolveLegacyRoute()

    return () => {
      active = false
    }
  }, [id, router])

  if (state !== "render-order") {
    return (
      <div className="p-4 text-sm text-[var(--gray-500)]">
        {state === "redirecting" ? "A redirecionar para a requisição clínica..." : "Carregando..."}
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="p-4 text-sm text-[var(--gray-500)]">Carregando...</div>}>
      <GeneratedResourceDetailPage endpoint="/specialty_diagnostics/order/" />
    </Suspense>
  );
}
