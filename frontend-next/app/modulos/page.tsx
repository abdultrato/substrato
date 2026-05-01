"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { GROUPS } from "@/lib/rbac"

export default function ModulosPage() {
  const { loading } = useAuthGuard()
  const { modules, isFetching, isError } = useModulesCatalog()
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Módulos"
          subtitle="Acesso rápido a todos os apps do Django disponíveis no sistema."
        />

        {isFetching ? (
          <div className="text-xs text-muted-foreground">
            Sincronizando catálogo com o backend...
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Não foi possível atualizar o catálogo em tempo real. Exibindo estrutura local.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.key}
              href={`/modulos/${m.key}`}
              className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-muted/40"
            >
              <div className="text-sm font-semibold text-foreground">{m.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {m.resources.length} recursos
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
