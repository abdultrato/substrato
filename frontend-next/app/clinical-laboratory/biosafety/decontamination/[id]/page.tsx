"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  Droplets,
  Edit2,
  FlaskConical,
  Loader2,
  MapPin,
  Settings,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

interface NamedRef { id: number; name: string }
interface DecontRecord {
  id: number;
  custom_id: string;
  version: string;
  area: string;
  equipment: string;
  disinfectant: string;
  concentration: string;
  reason: string;
  performed_at: string;
  performed_by: number;
  performed_by_detail: NamedRef | null;
  verified_by: number | null;
  verified_by_detail: NamedRef | null;
  created_at: string;
  updated_at: string;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

export default function DecontaminationDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [rec,     setRec]     = useState<DecontRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<DecontRecord>(`/clinical_laboratory/decontamination/${id}/`)
      .then(setRec)
      .catch(() => setError("Registo não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !rec) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar registo."}
      </div>
    </AppLayout>
  );

  const hasVerifier = rec.verified_by !== null;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${hasVerifier ? "bg-emerald-500" : "bg-cyan-500"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/20">
              <Droplets size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/decontamination" className="hover:underline">
                  Descontaminação
                </Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.area}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {hasVerifier ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle size={8} /> Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                    <Clock size={8} /> Por verificar
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                  <FlaskConical size={8} />
                  {rec.disinfectant}{rec.concentration ? ` · ${rec.concentration}` : ""}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{rec.custom_id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/decontamination/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-4 text-xs font-semibold text-white shadow-md shadow-cyan-500/30 transition hover:from-cyan-700 hover:to-sky-700">
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Localização */}
          <Card icon={MapPin} title="Área e equipamento" accent="bg-cyan-500">
            <div className="space-y-0.5">
              <Row label="Área"
                value={<span className="font-semibold">{rec.area}</span>}
              />
              <Row label="Equipamento / Superfície" value={rec.equipment || null} />
            </div>
          </Card>

          {/* Desinfectante */}
          <Card icon={FlaskConical} title="Produto desinfectante" accent="bg-sky-500">
            <div className="space-y-0.5">
              <Row label="Desinfectante"
                value={<span className="font-medium">{rec.disinfectant}</span>}
              />
              <Row label="Concentração / Diluição" value={rec.concentration || null} />
            </div>
          </Card>

          {/* Responsável */}
          <Card icon={User} title="Realizado por" accent="bg-indigo-500">
            <div className="space-y-0.5">
              <Row label="Responsável"
                value={<span className="font-medium">{rec.performed_by_detail?.name ?? `Utilizador #${rec.performed_by}`}</span>}
              />
              <Row label="Data e hora" value={fmtDateTime(rec.performed_at)} />
              <Row label="Motivo" value={rec.reason || null} />
            </div>
          </Card>

          {/* Verificação */}
          <Card icon={CheckCircle} title="Verificação" accent={hasVerifier ? "bg-emerald-500" : "bg-slate-300"}>
            <div className="space-y-0.5">
              {hasVerifier ? (
                <>
                  <Row label="Verificado por"
                    value={
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle size={11} />
                        {rec.verified_by_detail?.name ?? `Utilizador #${rec.verified_by}`}
                      </span>
                    }
                  />
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Aguarda verificação por supervisor.</p>
              )}
              <Row label="Criado em"           value={fmtDate(rec.created_at)} />
              <Row label="Última actualização" value={fmtDate(rec.updated_at)} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
