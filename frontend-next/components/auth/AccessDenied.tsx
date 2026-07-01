"use client"

import Link from "next/link"
import { ArrowRight, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { SessionUser } from "@/lib/session"
import { getAccessibleWorkspaces } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

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
    <div className="mx-auto max-w-3xl space-y-2">

      {/* ── Hero ── */}
      <section className={`relative overflow-hidden ${GLASS}`}>
        <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
        <div className="flex items-center gap-2.5 px-3 py-2.5 pl-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
            <ShieldAlert size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-foreground">{title}</h1>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </section>

      {/* ── Requer / Seus grupos ── */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
          <div className="px-3 py-2 pl-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Requer</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {requiredGroups?.length ? requiredGroups.join(", ") : "—"}
            </div>
          </div>
        </section>

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          <div className="px-3 py-2 pl-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Seus grupos</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {user?.groups?.length ? user.groups.join(", ") : "—"}
            </div>
          </div>
        </section>
      </div>

      {/* ── Áreas disponíveis ── */}
      {workspaces.length ? (
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="px-3 py-2.5 pl-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Áreas disponíveis
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {workspaces.map((w) => (
                <Link
                  key={w.key}
                  href={w.href}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-emerald-300/50 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  {w.label}
                  <ArrowRight size={12} className="text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Ações ── */}
      <div className="flex flex-wrap items-center gap-2 px-1 pt-0.5">
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/40 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
        >
          <LayoutDashboard size={15} /> Ir para o painel
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90"
        >
          <LogOut size={15} /> Terminar sessão
        </button>
      </div>
    </div>
  )
}
