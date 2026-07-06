"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Edit2,
  Loader2,
  Shield,
  Syringe,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

interface AEFIRecord {
  id: number;
  custom_id: string;
  immunization_record: number;
  record_label: string;
  patient: number;
  patient_name: string;
  vaccine: number;
  vaccine_name: string;
  lot: number | null;
  lot_number: string | null;
  reported_by: number | null;
  reported_by_name: string | null;
  investigated_by: number | null;
  investigated_by_name: string | null;
  severity: string;
  status: string;
  onset_at: string;
  reported_at: string;
  investigation_due_at: string | null;
  symptoms: string;
  serious: boolean;
  outcome: string;
  causality_assessment: string;
  official_notification_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, {
  label: string; emoji: string; bar: string; chip: string;
  grad: string; glow: string; btn: string; blob1: string; blob2: string;
}> = {
  REPORTED:            { label: "Reportado",           emoji: "🔔", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",           grad: "from-amber-500 to-orange-600",   glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",     blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"   },
  UNDER_INVESTIGATION: { label: "Em investigação",     emoji: "🔍", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",                 grad: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",         blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"   },
  RESOLVED:            { label: "Resolvido",           emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30",   blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"     },
  DISCARDED:           { label: "Descartado",          emoji: "✖️", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400",           grad: "from-slate-400 to-slate-500",   glow: "shadow-slate-400/30",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/30",       blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"    },
  SENT_TO_AUTHORITY:   { label: "Enviado à autoridade",emoji: "📤", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",     grad: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30",  btn: "from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30",   blob1: "bg-violet-500/10",  blob2: "bg-purple-500/10"   },
};

const SEVERITY_META: Record<string, { label: string; chip: string }> = {
  MILD:     { label: "Leve",     chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  MODERATE: { label: "Moderado", chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"             },
  SEVERE:   { label: "Grave",    chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300"       },
  CRITICAL: { label: "Crítico",  chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"                         },
};

const OUTCOME_LABELS: Record<string, string> = {
  RECOVERED: "Recuperado", RECOVERING: "Em recuperação",
  HOSPITALIZED: "Hospitalizado", DEATH: "Óbito", UNKNOWN: "Desconhecido",
};

function fmtDatetime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
      <span className="w-44 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export default function AEFIDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec]       = useState<AEFIRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<AEFIRecord>(`/public_health/adverse_event/${id}/`)
      .then(setRec)
      .catch(() => setError("Evento adverso não encontrado."))
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
        {error ?? "Erro ao carregar evento adverso."}
      </div>
    </AppLayout>
  );

  const sm = STATUS_META[rec.status] ?? STATUS_META["REPORTED"];
  const sv = SEVERITY_META[rec.severity] ?? { label: rec.severity, chip: "border-slate-200 bg-slate-50 text-slate-700" };

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
              <AlertTriangle size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/adverse-events" className="hover:underline">Eventos Adversos</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.patient_name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                  {sm.emoji} {sm.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sv.chip}`}>
                  {sv.label}
                </span>
                {rec.serious && (
                  <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:border-red-600/40 dark:bg-red-900/30 dark:text-red-300">
                    ⚠ Grave
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/adverse-events/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${sm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Paciente */}
          <Card icon={User} title="Paciente e vacina" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Paciente" value={<span className="font-semibold">{rec.patient_name}</span>} />
              <Row label="Vacina" value={rec.vaccine_name} />
              <Row label="Lote" value={rec.lot_number ? <span className="font-mono">{rec.lot_number}</span> : null} />
              <Row label="Registo de imunização" value={rec.record_label
                ? <Link href={`/public-health/immunizations/${rec.immunization_record}`} className="text-blue-600 hover:underline dark:text-blue-400">{rec.record_label}</Link>
                : null} />
            </div>
          </Card>

          {/* Clínico */}
          <Card icon={AlertTriangle} title="Dados clínicos" accent="bg-orange-500">
            <div className="space-y-0.5">
              <Row label="Sintomas" value={<span className="whitespace-pre-wrap">{rec.symptoms}</span>} />
              <Row label="Gravidade" value={
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sv.chip}`}>{sv.label}</span>
              } />
              <Row label="Evento grave" value={rec.serious ? <span className="font-semibold text-red-600 dark:text-red-400">⚠ Sim</span> : "Não"} />
              <Row label="Desfecho" value={OUTCOME_LABELS[rec.outcome] ?? rec.outcome} />
            </div>
          </Card>

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas" accent="bg-blue-500">
            <div className="space-y-0.5">
              <Row label="Início dos sintomas" value={fmtDatetime(rec.onset_at)} />
              <Row label="Reportado em" value={fmtDatetime(rec.reported_at)} />
              <Row label="Investigação até" value={rec.investigation_due_at
                ? <span className="font-medium text-orange-600 dark:text-orange-400">{fmtDatetime(rec.investigation_due_at)}</span>
                : null} />
            </div>
          </Card>

          {/* Profissionais */}
          <Card icon={User} title="Profissionais" accent="bg-teal-500">
            <div className="space-y-0.5">
              <Row label="Reportado por" value={rec.reported_by_name || null} />
              <Row label="Investigado por" value={rec.investigated_by_name || null} />
            </div>
          </Card>

          {/* Causalidade e notificação */}
          <Card icon={Shield} title="Causalidade e notificação" accent="bg-violet-500">
            <div className="space-y-0.5">
              <Row label="Avaliação de causalidade" value={rec.causality_assessment || null} />
              <Row label="ID oficial AEFI" value={rec.official_notification_id
                ? <span className="font-mono text-[10px]">{rec.official_notification_id}</span>
                : null} />
            </div>
          </Card>

          {/* Registo */}
          <Card icon={ClipboardList} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Referência" value={<span className="font-mono text-[10px]">{rec.custom_id}</span>} />
              <Row label="Criado em" value={fmtDatetime(rec.created_at)} />
              <Row label="Actualizado" value={fmtDatetime(rec.updated_at)} />
              <Row label="Observações" value={rec.notes || null} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
