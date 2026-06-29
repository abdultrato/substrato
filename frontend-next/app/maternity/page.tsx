"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Baby, BedDouble, ClipboardList, Heart, Loader2, PackageSearch, PlusCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function MetricGlass({
  label, value, hint, icon: Icon, accent,
}: {
  label: string; value: string | number; hint?: string; icon: React.ElementType; accent: string
}) {
  return (
    <div className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="flex items-center gap-2 mb-1">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.replace("bg-", "bg-").replace("-500", "-500/10")} text-foreground/60`}>
            <Icon size={13} />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function ActionCard({
  title, href, icon: Icon, accent = "from-violet-600 to-purple-600",
}: {
  title: string; href: string; icon: React.ElementType; accent?: string
}) {
  return (
    <Link href={href}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-violet-500" />
      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}>
          <Icon size={15} />
        </span>
        <span className="text-sm font-semibold text-foreground group-hover:text-violet-500 transition">{title}</span>
      </div>
    </Link>
  )
}

export default function MaternidadePage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [gestacoes, setGestacoes] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await apiFetch<any>("/maternity/gestacao/", { clientCache: safeRefreshToken === 0 })
        if (!mounted) return
        setGestacoes(extractTotalCount(res))
      } catch { /* silent */ }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [safeRefreshToken])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-pink-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20">
                <Baby size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Maternidade</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${gestacoes} ${gestacoes !== 1 ? "gestações" : "gestação"} registada${gestacoes !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {podeVerAdmin && (
              <Link href="/admin/maternity/pregnancy/"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                Abrir na Administração
              </Link>
            )}
          </div>
        </section>

        {/* ── Métricas ── */}
        {loading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <MetricGlass label="Gestações" value={gestacoes} icon={Baby} accent="bg-pink-500" />
            <MetricGlass label="Berçário" value="—" hint="Campos na gestação" icon={Heart} accent="bg-rose-500" />
            <MetricGlass label="Camas" value="—" hint="Campos na gestação" icon={BedDouble} accent="bg-violet-500" />
            <MetricGlass label="Partos" value="—" hint="Normal / cesariana" icon={ClipboardList} accent="bg-indigo-500" />
          </div>
        )}

        {/* ── Ações ── */}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <ActionCard title="Gestações" href="/maternity/pregnancies" icon={Baby} accent="from-pink-500 to-rose-600" />
          <ActionCard title="Nova gestação" href="/maternity/pregnancies/new" icon={PlusCircle} accent="from-violet-600 to-purple-600" />
          <ActionCard title="Registos (CRUD)" href="/maternity/pregnancies" icon={ClipboardList} accent="from-slate-600 to-slate-700" />
          <ActionCard title="Requisição de materiais" href="/pharmacy/material-requests/new" icon={PackageSearch} accent="from-indigo-600 to-blue-600" />
        </div>

      </div>
    </AppLayout>
  )
}
