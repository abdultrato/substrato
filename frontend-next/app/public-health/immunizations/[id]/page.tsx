"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
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
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

interface ImmunizationRecord {
  id: number;
  custom_id: string;
  patient: number;
  patient_name: string;
  vaccine: number;
  vaccine_name: string;
  lot: number | null;
  lot_number: string | null;
  campaign: number | null;
  campaign_name: string | null;
  target_group: number | null;
  target_group_label: string | null;
  administered_by: number | null;
  administered_by_name: string | null;
  status: string;
  source: string;
  dose_number: number;
  administered_at: string;
  next_due_date: string | null;
  route: string;
  body_site: string;
  consent_confirmed: boolean;
  contraindication_reason: string;
  official_notification_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, {
  label: string; emoji: string; bar: string; chip: string;
  grad: string; glow: string; btn: string; blob1: string; blob2: string;
}> = {
  ADMINISTERED: { label: "Aplicada",   emoji: "💉", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-green-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/30",     blob1: "bg-emerald-500/10", blob2: "bg-green-500/10"   },
  REPORTED:     { label: "Notificada", emoji: "📋", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",         blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  SCHEDULED:    { label: "Agendada",   emoji: "📅", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", grad: "from-violet-500 to-fuchsia-600", glow: "shadow-violet-500/30",  btn: "from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/30", blob1: "bg-violet-500/10",  blob2: "bg-fuchsia-500/10" },
  EXEMPT:       { label: "Isenta",     emoji: "🛡️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",       grad: "from-amber-500 to-orange-600",  glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",       blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  CANCELLED:    { label: "Cancelada",  emoji: "✖️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",             grad: "from-rose-500 to-red-600",      glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",               blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"     },
};

const SOURCE_LABELS: Record<string, string> = {
  ROUTINE: "🩺 Rotina",
  CAMPAIGN: "📣 Campanha",
  CATCH_UP: "🔁 Recuperação",
  OFFICIAL_IMPORT: "📥 Importação oficial",
};

const ROUTE_LABELS: Record<string, string> = {
  IM: "Intramuscular (IM)",
  SC: "Subcutânea (SC)",
  ID: "Intradérmica (ID)",
  ORAL: "Oral",
  IN: "Intranasal",
  OTHER: "Outra",
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

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
  if (value === null || value === undefined || value === "" || value === false) return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-40 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export default function ImmunizationDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec] = useState<ImmunizationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<ImmunizationRecord>(`/public_health/immunization/${id}/`)
      .then(setRec)
      .catch(() => setError("Registo não encontrado."))
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
        {error ?? "Erro ao carregar registo."}
      </div>
    </AppLayout>
  );

  const sm = STATUS_META[rec.status] ?? STATUS_META["ADMINISTERED"];

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
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/immunizations" className="hover:underline">Imunizações</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.patient_name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                  {sm.emoji} {sm.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {SOURCE_LABELS[rec.source] ?? rec.source}
                </span>
                <span className="text-[10px] text-muted-foreground">Dose {rec.dose_number}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/immunizations/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${sm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Paciente */}
          <Card icon={User} title="Paciente" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Nome" value={<span className="font-semibold">{rec.patient_name}</span>} />
              <Row label="ID do paciente" value={rec.patient ? <span className="font-mono text-[10px]">{rec.patient}</span> : null} />
              <Row label="Aplicada por" value={rec.administered_by_name || null} />
            </div>
          </Card>

          {/* Vacina e lote */}
          <Card icon={Syringe} title="Vacina e lote" accent="bg-teal-500">
            <div className="space-y-0.5">
              <Row label="Vacina" value={<span className="font-semibold">{rec.vaccine_name}</span>} />
              <Row label="Número de dose" value={`Dose ${rec.dose_number}`} />
              <Row label="Lote" value={rec.lot_number ? <span className="font-mono">{rec.lot_number}</span> : null} />
              <Row label="Via de administração" value={ROUTE_LABELS[rec.route] ?? rec.route} />
              <Row label="Local anatómico" value={rec.body_site || null} />
            </div>
          </Card>

          {/* Calendário */}
          <Card icon={CalendarDays} title="Datas" accent="bg-blue-500">
            <div className="space-y-0.5">
              <Row label="Aplicada em" value={fmtDatetime(rec.administered_at)} />
              <Row label="Próxima dose / reforço" value={rec.next_due_date
                ? <span className="font-medium text-violet-600 dark:text-violet-400">{fmtDate(rec.next_due_date)}</span>
                : null} />
            </div>
          </Card>

          {/* Campanha */}
          {(rec.campaign || rec.target_group) && (
            <Card icon={ClipboardCheck} title="Campanha" accent="bg-indigo-500">
              <div className="space-y-0.5">
                <Row label="Campanha" value={rec.campaign_name
                  ? <Link href={`/public-health/campaigns/${rec.campaign}`} className="text-blue-600 hover:underline dark:text-blue-400">{rec.campaign_name}</Link>
                  : null} />
                <Row label="Meta da campanha" value={rec.target_group_label || null} />
              </div>
            </Card>
          )}

          {/* Consentimento e contraindicação */}
          <Card icon={Shield} title="Consentimento e isenção" accent="bg-amber-500">
            <div className="space-y-0.5">
              <Row label="Consentimento confirmado" value={
                <span className={rec.consent_confirmed
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"}>
                  {rec.consent_confirmed ? "✓ Sim" : "✗ Não"}
                </span>
              } />
              <Row label="Motivo de contraindicação" value={rec.contraindication_reason || null} />
              <Row label="ID notificação oficial" value={rec.official_notification_id
                ? <span className="font-mono text-[10px]">{rec.official_notification_id}</span>
                : null} />
            </div>
          </Card>

          {/* Registo */}
          <Card icon={ClipboardCheck} title="Registo" accent="bg-slate-400">
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
