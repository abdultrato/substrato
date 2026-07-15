"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Baby, BedDouble, ClipboardList, Heart, Loader2, PackageSearch } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS } from "@/lib/rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

function MetricGlass({
  label, value, hint, icon: Icon, accent, href,
}: {
  label: string; value: string | number; hint?: string; icon: React.ElementType; accent: string; href?: string
}) {
  const content = (
    <>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-2.5 py-1.5 pl-3.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${accent.replace("bg-", "bg-").replace("-500", "-500/10")} text-foreground/60`}>
            <Icon size={11} />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        </div>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{hint}</p>}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`group relative block ${GLASS} transition hover:border-pink-500/30 hover:shadow-md`}>
        {content}
      </Link>
    )
  }

  return (
    <div className={`relative ${GLASS}`}>
      {content}
    </div>
  )
}

function ActionCard({
  title, href, icon: Icon, accent = "from-violet-600 to-purple-600", secondaryHref, secondaryLabel,
}: {
  title: string; href: string; icon: React.ElementType; accent?: string; secondaryHref?: string; secondaryLabel?: string
}) {
  return (
    <div className={`group relative ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <Link href={href} aria-label={title} className="absolute inset-0 rounded-xl" />
      <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-violet-500" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}>
            <Icon size={15} />
          </span>
          <span className="relative z-10 text-sm font-semibold text-foreground transition group-hover:text-violet-500">{title}</span>
        </div>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="relative z-10 inline-flex items-center rounded-lg border border-white/20 bg-white/20 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-pink-500/30 hover:bg-white/30 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export default function MaternidadePage() {
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
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
          </div>
        </section>

        {/* ── Métricas ── */}
        {loading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            <MetricGlass label="Gestações" value={gestacoes} icon={Baby} accent="bg-pink-500" href="/maternity/pregnancies" />
            <MetricGlass label="Berçário" value="—" hint="Campos na gestação" icon={Heart} accent="bg-rose-500" href="/maternity/pregnancies" />
            <MetricGlass label="Camas" value="—" hint="Campos na gestação" icon={BedDouble} accent="bg-violet-500" href="/maternity/pregnancies" />
            <MetricGlass label="Partos" value="—" hint="Normal / cesariana" icon={ClipboardList} accent="bg-indigo-500" href="/maternity/pregnancies" />
          </div>
        )}

        {/* ── Ações ── */}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <ActionCard
            title="Gestações"
            href="/maternity/pregnancies"
            icon={Baby}
            accent="from-pink-500 to-rose-600"
            secondaryHref="/maternity/pregnancies/new"
            secondaryLabel="Criar"
          />
          <div className="col-span-2 xl:col-span-1">
            <ActionCard title="Requisição de materiais" href="/pharmacy/material-requests/new" icon={PackageSearch} accent="from-indigo-600 to-blue-600" />
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
