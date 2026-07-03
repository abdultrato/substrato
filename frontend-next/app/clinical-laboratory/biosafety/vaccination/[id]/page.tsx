"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Edit2,
  FileText,
  Hash,
  Loader2,
  Shield,
  Syringe,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; badge: string; bar: string; glow: string }> = {
  EM_DIA:   { label: "Em dia",   bar: "bg-emerald-500", glow: "from-teal-500 to-emerald-600",    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  A_VENCER: { label: "A vencer", bar: "bg-amber-400",   glow: "from-amber-500 to-orange-500",    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  VENCIDA:  { label: "Vencida",  bar: "bg-red-500",     glow: "from-red-500 to-rose-600",        badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedRef { id: number; name: string }
interface VaccRecord {
  id: number;
  custom_id: string;
  version: string;
  vaccine: string;
  dose_number: number;
  vaccination_date: string;
  next_dose_due: string | null;
  document: string;
  status: string;
  staff: number;
  staff_detail: NamedRef | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function daysUntil(s: string | null | undefined): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
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
      <span className="w-32 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VaccinationDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [rec,     setRec]     = useState<VaccRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<VaccRecord>(`/clinical_laboratory/vaccination/${id}/`)
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error ?? "Erro ao carregar registo."}
      </div>
    </AppLayout>
  );

  const sm   = STATUS_META[rec.status] ?? STATUS_META.EM_DIA;
  const dtu  = daysUntil(rec.next_dose_due);
  const isUrgent  = dtu !== null && dtu >= 0 && dtu <= 30;
  const isOverdue = rec.status === "VENCIDA";

  // next dose label
  let nextDoseLabel: React.ReactNode = fmtDate(rec.next_dose_due);
  if (rec.next_dose_due) {
    if (isOverdue) {
      nextDoseLabel = (
        <span className="text-red-600 dark:text-red-400 font-semibold">
          {fmtDate(rec.next_dose_due)} <span className="text-[10px] font-normal">(vencida)</span>
        </span>
      );
    } else if (isUrgent) {
      nextDoseLabel = (
        <span className="text-amber-600 dark:text-amber-400 font-semibold">
          {fmtDate(rec.next_dose_due)}{" "}
          <span className="text-[10px] font-normal">
            ({dtu === 0 ? "hoje" : `em ${dtu} dia${dtu !== 1 ? "s" : ""}`})
          </span>
        </span>
      );
    }
  }

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sm.glow} shadow-md shadow-teal-500/20`}>
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/vaccination" className="hover:underline">
                  Vacinação
                </Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.vaccine}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.badge}`}>
                  <Shield size={8} />{sm.label}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                  <Hash size={8} />Dose {rec.dose_number}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{rec.custom_id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
                {isUrgent && !isOverdue && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                    Próxima dose em {dtu === 0 ? "hoje" : `${dtu}d`}
                  </span>
                )}
                {isOverdue && (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    Vacinação vencida
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/vaccination/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-emerald-700">
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Colaborador */}
          <Card icon={User} title="Colaborador vacinado" accent="bg-teal-500">
            <div className="space-y-0.5">
              <Row label="Nome"
                value={
                  <span className="font-medium">{rec.staff_detail?.name ?? `Utilizador #${rec.staff}`}</span>
                }
              />
            </div>
          </Card>

          {/* Estado */}
          <Card icon={Shield} title="Estado da vacinação" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Estado"
                value={
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${sm.badge}`}>
                    <Shield size={9} />{sm.label}
                  </span>
                }
              />
              <Row label="Número de dose"
                value={
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                    <Hash size={8} />Dose {rec.dose_number}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Vacina */}
          <Card icon={Syringe} title="Vacina" accent="bg-cyan-500">
            <div className="space-y-0.5">
              <Row label="Nome da vacina"
                value={<span className="font-semibold text-foreground">{rec.vaccine}</span>}
              />
              {rec.document && (
                <Row label="Comprovativo / Lote"
                  value={
                    <span className="flex items-center gap-1">
                      <FileText size={10} className="text-muted-foreground" />
                      <span className="font-mono text-[10px]">{rec.document}</span>
                    </span>
                  }
                />
              )}
            </div>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas" accent="bg-sky-500">
            <div className="space-y-0.5">
              <Row label="Data de vacinação"   value={fmtDate(rec.vaccination_date)} />
              <Row label="Próxima dose"         value={rec.next_dose_due ? nextDoseLabel : "—"} />
              <Row label="Criado em"            value={fmtDate(rec.created_at)} />
              <Row label="Última actualização"  value={fmtDate(rec.updated_at)} />
            </div>
          </Card>

          {/* Alert banner for urgent / overdue */}
          {(isUrgent || isOverdue) && (
            <div className="lg:col-span-2">
              <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${isOverdue ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/15 dark:text-amber-300"}`}>
                {isOverdue
                  ? `⚠ A vacinação de ${rec.vaccine} (dose ${rec.dose_number}) está vencida${rec.next_dose_due ? ` desde ${fmtDate(rec.next_dose_due)}` : ""}. Recomenda-se agendamento de nova dose.`
                  : `⏰ A próxima dose de ${rec.vaccine} está prevista para ${fmtDate(rec.next_dose_due)} (${dtu === 0 ? "hoje" : `em ${dtu} dia${dtu !== 1 ? "s" : ""}`}). Agende a vacinação com antecedência.`
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
