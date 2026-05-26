"use client"

import Link from "next/link"

import { useAuth } from "@/hooks/useAuth"
import { SessionUser } from "@/lib/session"
import { getAccessibleWorkspaces } from "@/lib/rbac"

export default function AccessDenied({
  requiredGroups,
  user,
  title = "Acesso restrito",
  subtitle = "A sua conta não tem permissão para abrir esta página.",
}: {
  requiredGroups?: string[]
  user: SessionUser | null
  title?: string
  subtitle?: string
}) {
  const { signOut } = useAuth()
  const workspaces = getAccessibleWorkspaces(user).filter((w) => w.key !== "dashboard")

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="font-display text-lg font-semibold text-slate-900">
          {title}
        </div>
        <div className="mt-1 text-sm text-slate-600">{subtitle}</div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Requer
            </div>
            <div className="mt-2 text-sm text-slate-800">
              {requiredGroups?.length ? requiredGroups.join(", ") : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Seus grupos
            </div>
            <div className="mt-2 text-sm text-slate-800">
              {user?.groups?.length ? user.groups.join(", ") : "—"}
            </div>
          </div>
        </div>

        {workspaces.length ? (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Áreas disponíveis
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaces.map((w) => (
                <Link
                  key={w.key}
                  href={w.href}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  {w.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Ir para o painel
          </Link>

          <button
            onClick={signOut}
            className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Terminar sessão
          </button>
        </div>
      </div>
    </div>
  )
}

