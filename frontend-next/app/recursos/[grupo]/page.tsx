"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { findModuleGroup } from "@/lib/modules"
import { GROUPS } from "@/lib/rbac"

export default function RecursosGrupoPage({
  params,
}: {
  params: { grupo: string }
}) {
  const { loading } = useAuthGuard()
  const group = findModuleGroup(params.grupo)
  const requiredGroups =
    params.grupo === "recursos_humanos"
      ? [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS]
      : [GROUPS.ADMIN]

  if (loading) return null

  if (!group) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="space-y-6">
          <PageHeader title="Módulo não encontrado" subtitle={params.grupo} />
          <div className="text-sm text-gray-600">
            O módulo solicitado não existe na lista atual.
          </div>
          <Link href="/recursos" className="text-sm text-gray-700 underline">
            Voltar para recursos
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader title={group.label} subtitle="Recursos disponíveis" />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {group.resources.map((r) => (
            <Link
              key={r.key}
              href={`/recursos/${group.key}/${r.key}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">
                {r.label}
              </div>
              <div className="mt-1 text-xs text-[var(--gray-500)]">{r.endpoint}</div>
            </Link>
          ))}
        </div>

        <div className="pt-2">
          <Link href="/recursos" className="text-sm text-[var(--gray-700)] underline">
            Voltar
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
