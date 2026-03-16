"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleGroup } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

export default function ModuloGrupoPage() {
  const params = useParams()
  const grupo = routeParamToString((params as any)?.grupo)
  const { loading } = useAuthGuard()
  const group = findModuleGroup(grupo)

  if (loading) return null

  if (!group) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN]}>
        <div className="space-y-6">
          <PageHeader title="Módulo não encontrado" subtitle={grupo} />
          <div className="text-sm text-gray-600">
            O módulo solicitado não existe na lista atual.
          </div>
          <Link href="/modulos" className="text-sm text-gray-700 underline">
            Voltar para módulos
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader title={group.label} subtitle="Recursos disponíveis" />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {group.resources.map((r) => (
            <Link
              key={r.key}
              href={`/modulos/${group.key}/${r.key}`}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="text-sm font-semibold text-gray-900">{r.label}</div>
              <div className="mt-1 text-xs text-gray-500">{r.endpoint}</div>
            </Link>
          ))}
        </div>

        <div className="pt-2">
          <Link href="/modulos" className="text-sm text-gray-700 underline">
            Voltar
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
