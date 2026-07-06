"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Copy,
  MessageSquare,
  User,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Types ─────────────────────────────────────────────────────────────────────

type Replication = {
  id: number;
  custom_id: string;
  original: number;
  replicator: number;
  replicator_display?: string;
  participants_display?: { id: number; label: string }[];
  replication_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

type Training = {
  id: number;
  custom_id: string;
  title: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4 pl-5">{children}</div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rep, setRep] = useState<Replication | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Replication>(`/clinical_laboratory/training_replication/${id}/`)
      .then(async (data) => {
        setRep(data);
        if (data.original) {
          apiFetch<Training>(`/clinical_laboratory/training_record/${data.original}/`)
            .then(setTraining)
            .catch(() => {});
        }
      })
      .catch((e) => setError(e?.message ?? "Erro ao carregar réplica."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rep) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Réplica não encontrada."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-violet-500" />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
              <Copy size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/trainings" className="hover:underline">
                  Registos de formação
                </Link>
                {training && (
                  <>
                    <span>/</span>
                    <Link
                      href={`/clinical-laboratory/quality-management/trainings/${rep.original}`}
                      className="hover:underline">
                      {training.title}
                    </Link>
                  </>
                )}
                <span>/</span>
                <span className="font-mono text-[9px]">Réplica {rep.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">
                Réplica de formação
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <CheckCircle2 size={9} /> Concluída
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[9px] text-slate-600 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-400">
                  {rep.custom_id}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              {training && (
                <Link
                  href={`/clinical-laboratory/quality-management/trainings/${rep.original}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                  <BookOpen size={13} /> Ver formação original
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Formação original */}
          {training && (
            <SectionCard icon={BookOpen} title="Formação original" accent="bg-indigo-500">
              <Row label="Código">{training.custom_id}</Row>
              <Row label="Título">{training.title}</Row>
            </SectionCard>
          )}

          {/* Replicante */}
          <SectionCard icon={User} title="Replicante" accent="bg-violet-500">
            <Row label="Replicante">
              {rep.replicator_display ?? `Utilizador #${rep.replicator}`}
            </Row>
          </SectionCard>

          {/* Datas */}
          <SectionCard icon={CalendarDays} title="Datas" accent="bg-teal-500">
            <Row label="Data da réplica">{fmtDate(rep.replication_date) ?? "—"}</Row>
            <Row label="Registada em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rep.created_at)}</span>
            </Row>
            <Row label="Última atualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rep.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Participantes */}
          <SectionCard icon={Users} title="Participantes da réplica" accent="bg-purple-500">
            {(rep.participants_display ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum participante registado.</p>
            ) : (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {(rep.participants_display ?? []).map((p) => (
                  <span key={p.id}
                    className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Observações */}
          {rep.notes && (
            <div className="lg:col-span-2">
              <SectionCard icon={MessageSquare} title="Observações" accent="bg-slate-400">
                <p className="whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">{rep.notes}</p>
              </SectionCard>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
