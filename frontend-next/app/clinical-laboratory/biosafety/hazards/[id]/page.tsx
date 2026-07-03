"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Biohazard,
  CheckCircle2,
  FileText,
  Pencil,
  Shield,
  ShieldAlert,
  Wind,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Types ─────────────────────────────────────────────────────────────────────

type DetailItem = { id: number; name: string; category?: string };

type Hazard = {
  id: number;
  custom_id: string;
  name: string;
  hazard_type: string;
  risk_group: string;
  containment_level: string;
  containment_level_display: string;
  handling_notes: string;
  active: boolean;
  transmission_routes: number[];
  transmission_routes_detail: DetailItem[];
  required_ppe_items: number[];
  required_ppe_items_detail: DetailItem[];
};

// ── Lookup maps ───────────────────────────────────────────────────────────────

const HAZARD_TYPE_LABEL: Record<string, string> = {
  VIRUS: "Vírus", BACTERIA: "Bactéria", FUNGO: "Fungo",
  PARASITA: "Parasita", PRIAO: "Príon", OUTRO: "Outro",
};

const RG_META: Record<string, { label: string; desc: string; color: string; bar: string; badge: string }> = {
  RG1: {
    label: "Grupo de risco 1", desc: "Sem risco ou risco mínimo para o indivíduo e a comunidade.",
    color: "text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  RG2: {
    label: "Grupo de risco 2", desc: "Risco moderado para o indivíduo; baixo risco para a comunidade.",
    color: "text-amber-700 dark:text-amber-400",
    bar: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  },
  RG3: {
    label: "Grupo de risco 3", desc: "Risco elevado para o indivíduo; baixo risco comunitário.",
    color: "text-orange-700 dark:text-orange-400",
    bar: "bg-orange-500",
    badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  },
  RG4: {
    label: "Grupo de risco 4", desc: "Risco muito elevado. Sem tratamento disponível.",
    color: "text-red-700 dark:text-red-400",
    bar: "bg-red-600",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  },
};

const NB_META: Record<string, { color: string; bar: string }> = {
  NB1: { color: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  NB2: { color: "text-amber-700 dark:text-amber-400",   bar: "bg-amber-400"   },
  NB3: { color: "text-orange-700 dark:text-orange-400", bar: "bg-orange-500"  },
  NB4: { color: "text-red-700 dark:text-red-400",       bar: "bg-red-600"     },
};

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children, accent,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {/* Barra lateral colorida */}
      {accent && (
        <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />
      )}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-0 p-4 pl-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{children ?? "—"}</span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${color ?? "border-border bg-muted text-foreground"}`}>
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HazardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [hazard, setHazard] = useState<Hazard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Hazard>(`/clinical_laboratory/hazard/${id}/`)
      .then(setHazard)
      .catch((e) => setError(e?.message ?? "Erro ao carregar registo."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !hazard) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Registo não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const rg = RG_META[hazard.risk_group] ?? RG_META.RG2;
  const nb = NB_META[hazard.containment_level] ?? null;
  const htLabel = HAZARD_TYPE_LABEL[hazard.hazard_type] ?? hazard.hazard_type ?? "—";

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${rg.bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            {/* Ícone */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30">
              <Biohazard size={22} className="text-white" />
            </div>

            {/* Títulos */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/hazards" className="hover:underline">Perigos biológicos</Link>
                {" / "}
                <span className="font-mono text-[9px]">{hazard.custom_id}</span>
              </p>
              <h1 className="text-lg font-bold leading-tight text-foreground">{hazard.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Chip label={htLabel} color="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" />
                <Chip label={rg.label} color={rg.badge} />
                {hazard.containment_level && (
                  <Chip
                    label={hazard.containment_level_display ?? hazard.containment_level}
                    color={nb ? `border-border ${nb.color} bg-muted` : undefined}
                  />
                )}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${hazard.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}`}>
                  {hazard.active ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                  {hazard.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/hazards/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid principal ────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={Biohazard} title="Identificação" accent="bg-violet-500">
            <Row label="Agente / perigo">{hazard.name}</Row>
            <Row label="Tipo de perigo">{htLabel || "—"}</Row>
            <Row label="ID do sistema">
              <span className="font-mono text-[10px] text-muted-foreground">{hazard.custom_id}</span>
            </Row>
            <Row label="Estado">
              <span className={`inline-flex items-center gap-1 ${hazard.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {hazard.active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {hazard.active ? "Ativo" : "Inativo"}
              </span>
            </Row>
          </SectionCard>

          {/* Risco e contenção */}
          <SectionCard icon={AlertTriangle} title="Risco e contenção" accent={rg.bar}>
            <Row label="Grupo de risco">
              <span className={`font-semibold ${rg.color}`}>{rg.label}</span>
            </Row>
            <Row label="Descrição do risco">
              <span className="max-w-[240px] text-right text-[11px] leading-snug text-muted-foreground">{rg.desc}</span>
            </Row>
            <Row label="Nível de contenção">
              {hazard.containment_level ? (
                <span className={`font-semibold ${nb?.color ?? ""}`}>
                  {hazard.containment_level_display ?? hazard.containment_level}
                </span>
              ) : "—"}
            </Row>
          </SectionCard>

          {/* Vias de transmissão */}
          <SectionCard icon={Wind} title="Vias de transmissão" accent="bg-sky-500">
            {hazard.transmission_routes_detail.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhuma via registada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {hazard.transmission_routes_detail.map((r) => (
                  <span key={r.id}
                    className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* EPI requerido */}
          <SectionCard icon={ShieldAlert} title="EPI requerido" accent="bg-amber-400">
            {hazard.required_ppe_items_detail.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum EPI registado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {hazard.required_ppe_items_detail.map((p) => (
                  <span key={p.id}
                    className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                    {p.name}
                    {p.category ? <span className="ml-1 text-amber-500/70 dark:text-amber-400/60">· {p.category}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Notas de manipulação — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={FileText} title="Notas de manipulação" accent="bg-slate-400">
              {hazard.handling_notes?.trim() ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{hazard.handling_notes}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sem notas de manipulação registadas.</p>
              )}
            </SectionCard>
          </div>

          {/* Grupo de risco — card destacado full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Grupo de risco" accent={rg.bar}>
              <div className={`relative overflow-hidden rounded-lg border px-4 py-3 text-[11px] ${rg.badge}`}>
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${rg.bar}`} />
                <div className="flex items-start justify-between pl-2">
                  <div>
                    <p className={`text-sm font-bold ${rg.color}`}>{rg.label}</p>
                    <p className="mt-0.5 leading-snug text-current/70">{rg.desc}</p>
                  </div>
                  <CheckCircle2 size={16} className={`shrink-0 ml-3 mt-0.5 ${rg.color}`} />
                </div>
              </div>
            </SectionCard>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
