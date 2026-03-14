"use client"

import Link from "next/link"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { MODULES } from "@/lib/modules"
import { GROUPS } from "@/lib/rbac"

export default function RecursosPage() {
  const { loading } = useAuthGuard()
  if (loading) return null

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title="Recursos da API v1"
          subtitle="Navegue pelos módulos expostos no backend (api/v1)."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
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
