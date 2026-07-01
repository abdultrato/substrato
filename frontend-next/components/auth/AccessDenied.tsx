"use client"

import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Baby,
  Banknote,
  Bone,
  Brain,
  Calculator,
  Cat,
  Droplets,
  Eye,
  FlaskConical,
  GraduationCap,
  Heart,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Pill,
  Radiation,
  ScanLine,
  ShieldAlert,
  Stethoscope,
  Truck,
  Users,
  UserSquare,
  Video,
  Warehouse,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { SessionUser } from "@/lib/session"
import { getAccessibleWorkspaces } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

// Ícone + cor fantasia por módulo (chave do workspace). `tone` é a classe de
// fundo/texto do chip do ícone; `bar` é a barra de acento à esquerda.
const WORKSPACE_STYLE: Record<string, { icon: LucideIcon; tone: string; bar: string }> = {
  healthcare: { icon: Stethoscope, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300", bar: "bg-sky-500" },
  reception: { icon: Users, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-300", bar: "bg-teal-500" },
  laboratory: { icon: FlaskConical, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300", bar: "bg-violet-500" },
  "blood-bank": { icon: Droplets, tone: "bg-red-500/15 text-red-600 dark:text-red-300", bar: "bg-red-500" },
  nursing: { icon: HeartPulse, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-300", bar: "bg-rose-500" },
  education: { icon: GraduationCap, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", bar: "bg-indigo-500" },
  "education-teacher": { icon: GraduationCap, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", bar: "bg-indigo-500" },
  "education-directoria": { icon: UserSquare, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-300", bar: "bg-blue-500" },
  "education-student": { icon: GraduationCap, tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", bar: "bg-cyan-500" },
  medicine: { icon: Stethoscope, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" },
  "clinical-pharmacy": { icon: Pill, tone: "bg-green-500/15 text-green-600 dark:text-green-300", bar: "bg-green-500" },
  "credit-financing": { icon: Banknote, tone: "bg-lime-500/15 text-lime-600 dark:text-lime-300", bar: "bg-lime-500" },
  telemedicine: { icon: Video, tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300", bar: "bg-fuchsia-500" },
  "public-health": { icon: HeartHandshake, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" },
  dental: { icon: Bone, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300", bar: "bg-sky-500" },
  veterinary: { icon: Cat, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300", bar: "bg-amber-500" },
  physiotherapy: { icon: Activity, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-300", bar: "bg-orange-500" },
  radiology: { icon: ScanLine, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300", bar: "bg-slate-500" },
  cardiology: { icon: Heart, tone: "bg-red-500/15 text-red-600 dark:text-red-300", bar: "bg-red-500" },
  neurology: { icon: Brain, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-300", bar: "bg-purple-500" },
  ophthalmology: { icon: Eye, tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", bar: "bg-cyan-500" },
  "occupational-therapy": { icon: HeartHandshake, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-300", bar: "bg-pink-500" },
  "physical-therapy": { icon: Activity, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-300", bar: "bg-orange-500" },
  transportation: { icon: Truck, tone: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300", bar: "bg-yellow-500" },
  pharmacy: { icon: Pill, tone: "bg-green-500/15 text-green-600 dark:text-green-300", bar: "bg-green-500" },
  "erp-wms": { icon: Warehouse, tone: "bg-stone-500/15 text-stone-600 dark:text-stone-300", bar: "bg-stone-500" },
  "occupational-medicine": { icon: Stethoscope, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-300", bar: "bg-teal-500" },
  accounting: { icon: Calculator, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-300", bar: "bg-blue-500" },
  "resources-human-resources": { icon: Users, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", bar: "bg-indigo-500" },
  maternity: { icon: Baby, tone: "bg-pink-500/15 text-pink-600 dark:text-pink-300", bar: "bg-pink-500" },
  payments: { icon: Wallet, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500" },
  radiotherapy: { icon: Radiation, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300", bar: "bg-amber-500" },
}

const WORKSPACE_FALLBACK = { icon: LayoutDashboard, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300", bar: "bg-slate-400" }

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
            <div className="mt-2 columns-2 gap-1.5 sm:columns-3 lg:columns-4 [&>*]:mb-1.5 [&>*]:break-inside-avoid">
              {workspaces.map((w) => {
                const style = WORKSPACE_STYLE[w.key] ?? WORKSPACE_FALLBACK
                const Icon = style.icon
                return (
                  <Link
                    key={w.key}
                    href={w.href}
                    className={`group relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/20 bg-white/40 py-1.5 pl-3 pr-2.5 text-xs font-medium text-foreground transition hover:bg-white/70 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]`}
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} />
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${style.tone}`}>
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{w.label}</span>
                    <ArrowRight size={12} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Ações ── */}
      <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
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
