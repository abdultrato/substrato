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
  PackageCheck,
  Snowflake,
  Syringe,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

interface LotRecord {
  id: number;
  custom_id: string;
  version: string;
  vaccine: number;
  vaccine_name: string;
  lot_number: string;
  official_batch_code: string;
  status: string;
  expiration_date: string;
  received_at: string;
  doses_received: number;
  doses_available: number;
  reserved_doses: number;
  storage_location: string;
  storage_temperature_c: string | null;
  cold_chain_status: string;
  is_expired: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; emoji: string; bar: string; chip: string; grad: string; glow: string; btn: string; blob1: string; blob2: string }> = {
  RECEIVED:    { label: "Recebido",   emoji: "📦", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",  glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",       blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  ACTIVE:      { label: "Ativo",      emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30", blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"    },
  QUARANTINED: { label: "Quarentena", emoji: "🚧", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",   blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  DEPLETED:    { label: "Esgotado",   emoji: "🔻", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",         grad: "from-slate-400 to-slate-600",  glow: "shadow-slate-400/20",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/20",     blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"   },
  EXPIRED:     { label: "Expirado",   emoji: "⌛", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                 grad: "from-red-500 to-rose-600",     glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"    },
  RECALLED:    { label: "Recolhido",  emoji: "↩️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",             grad: "from-rose-500 to-red-600",     glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",             blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"     },
};

const COLD_CHAIN_META: Record<string, { label: string; emoji: string; chip: string }> = {
  OK:      { label: "Conforme",     emoji: "❄️", chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300"           },
  WARNING: { label: "Atenção",      emoji: "⚠️", chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  BREACH:  { label: "Quebra",       emoji: "🔥", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"             },
  UNKNOWN: { label: "Desconhecido", emoji: "❓", chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300" },
};

// ciclo de vida principal
const LIFECYCLE = ["RECEIVED", "ACTIVE", "DEPLETED"];
const OFF_PATH = ["QUARANTINED", "EXPIRED", "RECALLED"];

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function daysToExpiry(s: string): number | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
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

export default function LotDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec] = useState<LotRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<LotRecord>(`/public_health/lot/${id}/`)
      .then(setRec)
      .catch(() => setError("Lote não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !rec) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar lote."}
      </div>
    </AppLayout>
  );

  const sm = STATUS_META[rec.status] ?? STATUS_META["RECEIVED"];
  const cm = COLD_CHAIN_META[rec.cold_chain_status] ?? COLD_CHAIN_META["UNKNOWN"];
  const expired = rec.is_expired || rec.status === "EXPIRED";
  const days = daysToExpiry(rec.expiration_date);
  const soon = !expired && days !== null && days <= 30;
  const isOffPath = OFF_PATH.includes(rec.status);
  const currentStep = LIFECYCLE.indexOf(rec.status);
  const breach = rec.cold_chain_status === "BREACH";

  const received = rec.doses_received || 0;
  const available = rec.doses_available || 0;
  const usedPct = received > 0 ? Math.round(((received - available) / received) * 100) : 0;
  const availPct = received > 0 ? Math.round((available / received) * 100) : 0;

  return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${sm.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${sm.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sm.grad} shadow-md ${sm.glow}`}>
              <PackageCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/lots" className="hover:underline">Lotes</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {rec.vaccine_name || "Vacina"} · <span className="font-mono">{rec.lot_number}</span>
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                  {sm.emoji} {sm.label}
                </span>
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cm.chip}`}>
                  {cm.emoji} {cm.label}
                </span>
                {expired ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-700/40 dark:bg-red-900/30 dark:text-red-300">
                    <AlertTriangle size={8} /> Expirado
                  </span>
                ) : soon ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-300">
                    <AlertTriangle size={8} /> Validade em {days}d
                  </span>
                ) : null}
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/lots/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${sm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Alertas ───────────────────────────────────────────── */}
        {(expired || breach) && (
          <div className="flex flex-wrap gap-2">
            {expired && (
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                <AlertTriangle size={13} className="shrink-0" />
                Lote expirado em {fmtDate(rec.expiration_date)} — não administrar. Considere recolha ou descarte.
              </div>
            )}
            {breach && (
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                <Snowflake size={13} className="shrink-0" />
                Quebra de cadeia fria detetada — avaliar viabilidade das doses antes de uso.
              </div>
            )}
          </div>
        )}

        {/* ── Ciclo de vida ─────────────────────────────────────── */}
        <div className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          {isOffPath ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                {sm.emoji} {sm.label}
              </span>
              <span className="text-muted-foreground">
                Lote fora do ciclo normal (recebido → ativo → esgotado).
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {LIFECYCLE.map((step, idx) => {
                const sm2 = STATUS_META[step];
                const done = currentStep > idx;
                const active = currentStep === idx;
                const isLast = idx === LIFECYCLE.length - 1;
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex min-w-0 flex-col items-center gap-1">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        active ? `${sm2.bar} text-white shadow-sm` :
                        done ? "bg-emerald-500 text-white" :
                        "bg-border text-muted-foreground"
                      }`}>
                        {done ? "✓" : idx + 1}
                      </div>
                      <span className={`text-center text-[9px] leading-tight ${active ? "font-semibold text-foreground" : done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {sm2.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`mx-1 h-0.5 flex-1 rounded-full ${done ? "bg-emerald-400" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Vacina e lote */}
          <Card icon={Syringe} title="Vacina e lote" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Vacina" value={<span className="font-semibold">{rec.vaccine_name || `#${rec.vaccine}`}</span>} />
              <Row label="Número do lote" value={<span className="font-mono">{rec.lot_number}</span>} />
              <Row label="Código oficial" value={rec.official_batch_code ? <span className="font-mono">{rec.official_batch_code}</span> : null} />
              <Row label="Estado" value={<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.chip}`}>{sm.emoji} {sm.label}</span>} />
            </div>
          </Card>

          {/* Validade e cadeia fria */}
          <Card icon={Snowflake} title="Validade e cadeia fria" accent={expired ? "bg-red-500" : soon ? "bg-amber-500" : "bg-sky-500"}>
            <div className="space-y-0.5">
              <Row label="Validade" value={
                <span className={expired ? "font-semibold text-red-600 dark:text-red-400" : soon ? "font-semibold text-amber-600 dark:text-amber-400" : undefined}>
                  {fmtDate(rec.expiration_date)}{!expired && days !== null ? ` · faltam ${days}d` : ""}
                </span>
              } />
              <Row label="Recebido em" value={fmtDate(rec.received_at)} />
              <Row label="Cadeia fria" value={<span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9px] font-medium ${cm.chip}`}>{cm.emoji} {cm.label}</span>} />
              <Row label="Temperatura atual" value={rec.storage_temperature_c != null ? `${rec.storage_temperature_c} °C` : null} />
              <Row label="Local" value={rec.storage_location || null} />
            </div>
          </Card>

          {/* Doses */}
          <Card icon={PackageCheck} title="Doses" accent="bg-indigo-500">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/50 bg-background/50 py-1.5">
                  <div className="text-sm font-bold text-foreground">{received}</div>
                  <div className="text-[9px] text-muted-foreground">Recebidas</div>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 py-1.5">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{available}</div>
                  <div className="text-[9px] text-muted-foreground">Disponíveis</div>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 py-1.5">
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{rec.reserved_doses || 0}</div>
                  <div className="text-[9px] text-muted-foreground">Reservadas</div>
                </div>
              </div>
              {received > 0 && (
                <div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-border">
                    <div className="bg-emerald-500" style={{ width: `${availPct}%` }} />
                    <div className="bg-slate-400" style={{ width: `${usedPct}%` }} />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
                    <span>{availPct}% disponível</span>
                    <span>{usedPct}% utilizado</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Registo */}
          <Card icon={CalendarDays} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Referência" value={<span className="font-mono">{rec.custom_id}</span>} />
              <Row label="Versão" value={`v${rec.version}`} />
              <Row label="Criado em" value={fmtDate(rec.created_at)} />
              <Row label="Actualizado" value={fmtDate(rec.updated_at)} />
              <Row label="Observações" value={rec.notes || null} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
