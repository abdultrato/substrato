"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Edit2,
  Loader2,
  Package,
  ShieldCheck,
  Tag,
  TrendingDown,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

interface PPEItem {
  id: number;
  custom_id: string;
  version: string;
  name: string;
  category: string;
  size: string;
  unit: string;
  stock_controlled: boolean;
  minimum_stock: number;
  current_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Category colours ──────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { bar: string; badge: string; glow: string }> = {
  "Proteção corporal":     { bar: "bg-blue-500",    glow: "from-blue-500 to-indigo-600",    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" },
  "Proteção respiratória": { bar: "bg-violet-500",  glow: "from-violet-500 to-purple-600",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
  "Proteção ocular":       { bar: "bg-sky-500",     glow: "from-sky-500 to-cyan-600",       badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300" },
  "Proteção das mãos":     { bar: "bg-teal-500",    glow: "from-teal-500 to-emerald-600",   badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300" },
  "Proteção dos pés":      { bar: "bg-emerald-500", glow: "from-emerald-500 to-green-600",  badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  "Proteção da cabeça":    { bar: "bg-amber-500",   glow: "from-amber-500 to-orange-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
};
const DEFAULT_CAT = { bar: "bg-slate-400", glow: "from-slate-500 to-slate-600", badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300" };
function catMeta(c: string) { return CAT_COLORS[c] ?? DEFAULT_CAT; }

function stockStatus(item: PPEItem): "ok" | "low" | "out" | "uncontrolled" {
  if (!item.stock_controlled) return "uncontrolled";
  if (item.current_stock <= 0) return "out";
  if (item.current_stock <= item.minimum_stock) return "low";
  return "ok";
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-36 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export default function PPEDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [item,    setItem]    = useState<PPEItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<PPEItem>(`/clinical_laboratory/ppe/${id}/`)
      .then(setItem)
      .catch(() => setError("EPI não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !item) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar EPI."}
      </div>
    </AppLayout>
  );

  const cm = catMeta(item.category);
  const ss = stockStatus(item);

  const pct = item.stock_controlled && item.minimum_stock > 0
    ? Math.min(100, Math.round((item.current_stock / (item.minimum_stock * 2)) * 100))
    : null;

  const stockBarColor = ss === "ok" ? "bg-emerald-500" : ss === "low" ? "bg-amber-400" : "bg-red-500";

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${cm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cm.glow} shadow-md shadow-blue-500/20`}>
              <ShieldCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/ppe" className="hover:underline">EPI</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{item.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{item.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cm.badge}`}>
                  {item.category}
                </span>
                {item.stock_controlled && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    ss === "ok"  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" :
                    ss === "low" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" :
                                   "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"
                  }`}>
                    {ss === "out" && <AlertTriangle size={8} />}
                    {ss === "low" && <TrendingDown size={8} />}
                    {ss === "ok"  && <Package size={8} />}
                    {ss === "out" ? "Sem stock" : ss === "low" ? "Stock baixo" : "Em stock"}
                  </span>
                )}
                {!item.active && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400">
                    Inactivo
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground">{item.custom_id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">v{item.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/ppe/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700">
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stock alert banner ────────────────────────────────── */}
        {item.stock_controlled && ss !== "ok" && (
          <div className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
            ss === "out"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/15 dark:text-amber-300"
          }`}>
            {ss === "out"
              ? `⚠ Stock esgotado — ${item.name} tem 0 unidades. Stock mínimo requerido: ${item.minimum_stock} ${item.unit || "unid."}.`
              : `⏰ Stock baixo — ${item.name} tem apenas ${item.current_stock} unidades (mínimo: ${item.minimum_stock} ${item.unit || "unid."}).`
            }
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={ShieldCheck} title="Identificação" accent={cm.bar}>
            <div className="space-y-0.5">
              <Row label="Nome" value={<span className="font-semibold">{item.name}</span>} />
              <Row label="Categoria"
                value={
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cm.badge}`}>
                    {item.category}
                  </span>
                }
              />
              <Row label="Tamanho"  value={item.size  || null} />
              <Row label="Unidade"  value={item.unit  || null} />
              <Row label="Estado"
                value={
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                    {item.active ? "Activo" : "Inactivo"}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Stock */}
          <Card icon={Package} title="Gestão de stock" accent={item.stock_controlled ? stockBarColor : "bg-slate-300"}>
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Row label="Controlo de stock"
                  value={
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.stock_controlled ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                      {item.stock_controlled ? "Controlado" : "Não controlado"}
                    </span>
                  }
                />
                {item.stock_controlled && (
                  <>
                    <Row label="Stock actual"   value={<span className="text-sm font-bold text-foreground">{item.current_stock} {item.unit || "unid."}</span>} />
                    <Row label="Stock mínimo"   value={`${item.minimum_stock} ${item.unit || "unid."}`} />
                  </>
                )}
              </div>

              {item.stock_controlled && pct !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Nível de stock</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/40">
                    <div className={`h-full rounded-full transition-all ${stockBarColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>0</span>
                    <span>{item.minimum_stock} mín.</span>
                    <span>{item.minimum_stock * 2} alvo</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas e controlo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Criado em"            value={fmtDate(item.created_at)} />
              <Row label="Última actualização"  value={fmtDate(item.updated_at)} />
            </div>
          </Card>

          {/* Quick actions */}
          <Card icon={Tag} title="Acções rápidas" accent="bg-indigo-500">
            <div className="flex flex-wrap gap-2">
              <Link href={`/clinical-laboratory/biosafety/ppe/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                <Edit2 size={11} /> Editar EPI
              </Link>
              <Link href="/clinical-laboratory/biosafety/ppe-distribution/new"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[11px] font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                <Package size={11} /> Registar distribuição
              </Link>
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
