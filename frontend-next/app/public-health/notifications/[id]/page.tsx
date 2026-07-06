"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ClipboardList,
  Edit2,
  Loader2,
  RefreshCw,
  Zap,
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
  GROUPS.SAUDE_PUBLICA,
];

interface NotificationRecord {
  id: number;
  custom_id: string;
  official_system: string;
  event_type: string;
  status: string;
  campaign: number | null;
  campaign_name: string | null;
  immunization_record: number | null;
  immunization_record_label: string | null;
  adverse_event: number | null;
  adverse_event_label: string | null;
  external_reference: string;
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  sent_at: string | null;
  error_message: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, {
  label: string; emoji: string; bar: string; chip: string;
  grad: string; glow: string; btn: string; blob1: string; blob2: string;
}> = {
  PENDING:  { label: "Pendente",  emoji: "⏳", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400",           grad: "from-slate-400 to-slate-500",    glow: "shadow-slate-400/30",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/30",       blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"    },
  SENDING:  { label: "Enviando",  emoji: "📡", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",                 grad: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",         blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"   },
  SENT:     { label: "Enviado",   emoji: "📤", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",                 grad: "from-teal-500 to-cyan-600",      glow: "shadow-teal-500/30",    btn: "from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-500/30",             blob1: "bg-teal-500/10",    blob2: "bg-cyan-500/10"     },
  ACCEPTED: { label: "Aceito",    emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",   glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30",     blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"     },
  REJECTED: { label: "Rejeitado", emoji: "✖️", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                       grad: "from-red-500 to-rose-600",       glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",               blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"     },
  FAILED:   { label: "Falhou",    emoji: "⚠️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",                 grad: "from-rose-500 to-red-600",       glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",               blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"      },
};

const EVENT_TYPE_META: Record<string, { label: string; icon: string }> = {
  IMMUNIZATION:      { label: "Imunização",           icon: "💉" },
  AEFI:              { label: "Evento adverso",        icon: "⚠️" },
  CAMPAIGN_COVERAGE: { label: "Cobertura de campanha", icon: "📣" },
};

const SYSTEM_LABELS: Record<string, string> = {
  E_SUS: "e-SUS", SIPNI: "SIPNI", DHIS2: "DHIS2", CUSTOM: "Outro",
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

export default function NotificationDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec]         = useState<NotificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<NotificationRecord>(`/public_health/notification/${id}/`)
      .then(setRec)
      .catch(() => setError("Notificação não encontrada."))
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
        {error ?? "Erro ao carregar notificação."}
      </div>
    </AppLayout>
  );

  const sm = STATUS_META[rec.status] ?? STATUS_META["PENDING"];
  const ev = EVENT_TYPE_META[rec.event_type] ?? { label: rec.event_type, icon: "📋" };

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
              <Bell size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/notifications" className="hover:underline">Notificações</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {ev.icon} {ev.label} — {SYSTEM_LABELS[rec.official_system] ?? rec.official_system}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                  {sm.emoji} {sm.label}
                </span>
                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  {SYSTEM_LABELS[rec.official_system] ?? rec.official_system}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/notifications/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${sm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Evento */}
          <Card icon={Zap} title="Evento notificado" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Tipo de evento" value={<span className="font-semibold">{ev.icon} {ev.label}</span>} />
              <Row label="Sistema oficial" value={
                <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  {SYSTEM_LABELS[rec.official_system] ?? rec.official_system}
                </span>
              } />
              {rec.campaign_name && (
                <Row label="Campanha" value={
                  <Link href={`/public-health/campaigns/${rec.campaign}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    📣 {rec.campaign_name}
                  </Link>
                } />
              )}
              {rec.immunization_record_label && (
                <Row label="Registo de imunização" value={
                  <Link href={`/public-health/immunizations/${rec.immunization_record}`} className="font-mono text-[10px] text-blue-600 hover:underline dark:text-blue-400">
                    💉 {rec.immunization_record_label}
                  </Link>
                } />
              )}
              {rec.adverse_event_label && (
                <Row label="Evento adverso" value={
                  <Link href={`/public-health/adverse-events/${rec.adverse_event}`} className="font-mono text-[10px] text-blue-600 hover:underline dark:text-blue-400">
                    ⚠️ {rec.adverse_event_label}
                  </Link>
                } />
              )}
            </div>
          </Card>

          {/* Envio */}
          <Card icon={CalendarDays} title="Envio e tentativas" accent="bg-blue-500">
            <div className="space-y-0.5">
              <Row label="Enviado em" value={fmtDatetime(rec.sent_at)} />
              <Row label="Última tentativa" value={fmtDatetime(rec.last_attempt_at)} />
              <Row label="Próxima tentativa" value={rec.next_retry_at
                ? <span className="text-amber-600 dark:text-amber-400">{fmtDatetime(rec.next_retry_at)}</span>
                : null} />
              <Row label="Tentativas" value={
                <span className={rec.attempt_count > 3 ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>
                  {rec.attempt_count}
                </span>
              } />
              <Row label="Referência externa" value={rec.external_reference
                ? <span className="font-mono text-[10px]">{rec.external_reference}</span>
                : null} />
            </div>
          </Card>

          {/* Erro */}
          {rec.error_message && (
            <Card icon={RefreshCw} title="Erro de envio" accent="bg-rose-500">
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">{rec.error_message}</p>
            </Card>
          )}

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
