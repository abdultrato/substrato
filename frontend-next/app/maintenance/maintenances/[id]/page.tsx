"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  FileText,
  History,
  Loader2,
  Pencil,
  RefreshCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

const RECURRENCE_META: Record<string, { label: string; chip: string }> = {
  DIARIA: {
    label: "Diária",
    chip: "border-sky-200/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
  },
  SEMANAL: {
    label: "Semanal",
    chip: "border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300",
  },
  MENSAL: {
    label: "Mensal",
    chip: "border-indigo-200/50 bg-indigo-100/30 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-300",
  },
  TRIMESTRAL: {
    label: "Trimestral",
    chip: "border-violet-200/50 bg-violet-100/30 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300",
  },
  SEMESTRAL: {
    label: "Semestral",
    chip: "border-purple-200/50 bg-purple-100/30 text-purple-700 dark:border-purple-700/30 dark:bg-purple-900/20 dark:text-purple-300",
  },
  ANUAL: {
    label: "Anual",
    chip: "border-fuchsia-200/50 bg-fuchsia-100/30 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300",
  },
};

type Row = Record<string, any>;

function fmtDate(value: any, withTime = false): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime
    ? d.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function str(value: any): string {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}

function isOverdue(m: Row): boolean {
  if (m.performed_date) return false;
  const scheduled = new Date(String(m.scheduled_date));
  if (Number.isNaN(scheduled.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return scheduled < now;
}

/** Cartão de secção com título característico. */
function Section({
  title,
  icon: Icon,
  bar,
  children,
}: {
  title: string;
  icon: typeof Wrench;
  bar: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} border-l-4 ${bar}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-1 p-2">{children}</div>
    </section>
  );
}

function Row_({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1 text-[11px]">
      <span className="shrink-0 font-semibold text-foreground">{label}</span>
      <span className="truncate text-right text-muted-foreground">{value}</span>
    </div>
  );
}

export default function MaintenancesDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    try {
      const result = await apiFetch<Row>(
        `/maintenance/maintenance/${encodeURIComponent(id)}/`,
        { clientCache: false },
      );
      setRow(result || null);
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar a manutenção.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, safeRefreshToken]);

  async function markPerformed() {
    if (!id || !row || marking || row.performed_date) return;
    setMarking(true);
    setErro(null);
    try {
      const updated = await apiFetch<Row>(
        `/maintenance/maintenance/${encodeURIComponent(id)}/realizar/`,
        { method: "POST", clientCache: false, body: JSON.stringify({}) },
      );
      setRow(updated || row);
    } catch (e: any) {
      setErro(e?.message || "Falha ao marcar a manutenção como executada.");
    } finally {
      setMarking(false);
    }
  }

  const recurrence = row ? RECURRENCE_META[String(row.type ?? "").toUpperCase()] : null;
  const corrective = Boolean(row?.incident) || row?.maintenance_type === "CORRECTIVA";
  const performed = Boolean(row?.performed_date);
  const overdue = row ? isOverdue(row) : false;
  const incident = row?.incident_context || null;

  const stateChip = performed
    ? "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
    : overdue
      ? "border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
      : "border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300";
  const headerBar = performed
    ? "border-l-emerald-500 dark:border-l-emerald-400"
    : overdue
      ? "border-l-rose-500 dark:border-l-rose-400"
      : "border-l-blue-500 dark:border-l-blue-400";

  return (
    <AppLayout>
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: identidade + estado + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/25 bg-gradient-to-br from-amber-100/[0.05] via-white/[0.015] to-orange-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-amber-800/20 dark:from-amber-950/[0.05] dark:via-white/[0.01] dark:to-orange-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
                <CalendarClock size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="line-clamp-1 text-base font-bold leading-tight text-foreground">
                  {row?.custom_id || "Manutenção"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {row
                    ? `${row.equipment_name || "Equipamento"} · prevista ${fmtDate(row.scheduled_date)}`
                    : "A carregar…"}
                </p>
              </div>
            </div>

            {row ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${stateChip}`}
                >
                  {performed ? "Executada" : overdue ? "Atrasada" : "Programada"}
                </span>
                {recurrence ? (
                  <span
                    className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${recurrence.chip}`}
                  >
                    {recurrence.label}
                  </span>
                ) : null}
                <span
                  className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${
                    corrective
                      ? "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                      : "border-teal-200/50 bg-teal-100/30 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300"
                  }`}
                >
                  {row.maintenance_type_display || (corrective ? "Correctiva" : "Preventiva")}
                </span>
                {row.incident_code ? (
                  <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-rose-200/50 bg-rose-100/30 px-2 text-[10px] font-semibold text-rose-700 backdrop-blur-xl dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                    <AlertTriangle size={11} />
                    Avaria {row.incident_code}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {row?.equipment ? (
                <Link
                  href={`/equipment/equipments/${row.equipment}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
                >
                  <ArrowLeft size={13} />
                  Equipamento
                </Link>
              ) : (
                <Link
                  href="/maintenance/maintenances"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
                >
                  <ArrowLeft size={13} />
                  Manutenções
                </Link>
              )}
              {row ? (
                <>
                  <Link
                    href={`/maintenance/maintenances/${row.id}/edit`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
                  >
                    <Pencil size={12} />
                    Editar
                  </Link>
                  {!performed ? (
                    <button
                      type="button"
                      onClick={() => void markPerformed()}
                      disabled={marking}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
                    >
                      {marking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Marcar executada
                    </button>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Actualizar"
                title="Actualizar"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/25 bg-white/[0.05] text-foreground backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {erro}
          </div>
        ) : null}

        {loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            A carregar manutenção...
          </div>
        ) : null}

        {!loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <ShieldAlert size={14} />
            Manutenção não encontrada ou sem permissão de acesso.
          </div>
        ) : null}

        {row ? (
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            <Section title="Planeamento" icon={CalendarClock} bar={headerBar}>
              <Row_
                label="Estado"
                value={
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${stateChip}`}>
                    {performed ? "Executada" : overdue ? "Atrasada" : "Programada"}
                  </span>
                }
              />
              <Row_ label="Recorrência" value={recurrence?.label || str(row.type)} />
              <Row_
                label="Tipo"
                value={row.maintenance_type_display || (corrective ? "Correctiva" : "Preventiva")}
              />
              <Row_ label="Data prevista" value={fmtDate(row.scheduled_date)} />
              <Row_ label="Data executada" value={fmtDate(row.performed_date)} />
            </Section>

            <Section title="Equipamento" icon={Wrench} bar="border-l-teal-500 dark:border-l-teal-400">
              <Row_
                label="Equipamento"
                value={
                  row.equipment ? (
                    <Link
                      href={`/equipment/equipments/${row.equipment}`}
                      className="text-[var(--primary-600)] hover:underline dark:text-[var(--primary-400)]"
                    >
                      {row.equipment_name || `#${row.equipment}`}
                    </Link>
                  ) : (
                    str(row.equipment_name)
                  )
                }
              />
              <Row_ label="Técnico (RH)" value={str(row.technician)} />
            </Section>

            <Section
              title="Avaria de origem"
              icon={AlertTriangle}
              bar={incident ? "border-l-rose-500 dark:border-l-rose-400" : "border-l-border"}
            >
              {incident ? (
                <>
                  <Row_
                    label="Ocorrência"
                    value={
                      <Link
                        href={`/incidents/incidents/${incident.id}`}
                        className="text-[var(--primary-600)] hover:underline dark:text-[var(--primary-400)]"
                      >
                        {incident.custom_id || `#${incident.id}`}
                      </Link>
                    }
                  />
                  <Row_ label="Tipo" value={str(incident.type_display || incident.type)} />
                  <Row_ label="Data" value={fmtDate(incident.date, true)} />
                </>
              ) : (
                <p className="px-1 py-2 text-[11px] text-muted-foreground">
                  Manutenção preventiva — sem ocorrência de origem.
                </p>
              )}
            </Section>

            <div className="md:col-span-2">
              <Section title="Descrição" icon={FileText} bar="border-l-indigo-500 dark:border-l-indigo-400">
                {String(row.description ?? "").trim() ? (
                  <p className="whitespace-pre-wrap px-1 py-1 text-[11px] leading-relaxed text-foreground">
                    {row.description}
                  </p>
                ) : (
                  <p className="px-1 py-2 text-[11px] text-muted-foreground">Sem descrição registada.</p>
                )}
              </Section>
            </div>

            <Section title="Registo" icon={History} bar="border-l-slate-400 dark:border-l-slate-500">
              <Row_ label="Criado em" value={fmtDate(row.created_at, true)} />
              <Row_ label="Actualizado em" value={fmtDate(row.updated_at, true)} />
              <Row_ label="Versão" value={str(row.version)} />
            </Section>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
