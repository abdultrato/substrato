"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { GROUPS } from "@/lib/rbac"

export default function RecursosPage() {
  const { loading } = useAuthGuard()
  const { modules, isFetching, isError } = useModulesCatalog()
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Recursos da API v1"
          subtitle="Navegue pelos módulos expostos no backend (api/v1)."
        />

        {isFetching ? (
          <div className="text-xs text-[var(--gray-500)]">
            Atualizando recursos do backend...
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Falha ao sincronizar com o backend agora. Mostrando catálogo local.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.key}
              href={`/recursos/${m.key}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              <div className="text-sm font-semibold text-[var(--text)]">{m.label}</div>
              <div className="mt-1 text-xs text-[var(--gray-500)]">
                {m.resources.length} recursos
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
