"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { MODULES } from "@/lib/modules"
import { GROUPS } from "@/lib/rbac"

export default function ModulosPage() {
  const { loading } = useAuthGuard()
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Módulos"
          subtitle="Acesso rápido a todos os apps do Django atualmente expostos na API v1."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
            <Link
              key={m.key}
              href={`/modulos/${m.key}`}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="text-sm font-semibold text-gray-900">{m.label}</div>
              <div className="mt-1 text-xs text-gray-500">
                {m.resources.length} recursos
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
