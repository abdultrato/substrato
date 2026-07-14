"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

const INPUT =
  "rounded-lg border border-border bg-background/70 px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40";

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(value: any): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(m: Record<string, any>): boolean {
  if (m.performed_date) return false;
  const scheduled = new Date(String(m.scheduled_date));
  if (Number.isNaN(scheduled.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return scheduled < now;
}

function maintenanceBar(m: Record<string, any>): string {
  if (m.performed_date) return "border-l-emerald-500 dark:border-l-emerald-400";
  if (isOverdue(m)) return "border-l-rose-500 dark:border-l-rose-400";
  return "border-l-blue-500 dark:border-l-blue-400";
}

/**
 * Estado de manutenção do equipamento: resumo programadas/atrasadas/executadas,
 * contagens por recorrência herdada (diária…anual) e por avaria, e lista das
 * manutenções. Com `editable`, permite agendar manutenções inline (incluindo
 * correctivas ligadas a uma ocorrência/avaria), marcá-las como executadas e
 * removê-las — tudo sem sair do cartão.
 */
export default function EquipmentMaintenanceSection({
  equipmentId,
  editable = false,
}: {
  equipmentId: string;
  editable?: boolean;
}) {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [maintenances, setMaintenances] = useState<Record<string, any>[]>([]);
  const [incidents, setIncidents] = useState<Record<string, any>[]>([]);
  const [employees, setEmployees] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    type: "MENSAL",
    maintenance_type: "PREVENTIVA",
    incident: "",
    scheduled_date: today(),
    technician: "",
  });

  useEffect(() => {
    if (!equipmentId) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [maint, incs, staff] = await Promise.allSettled([
          apiFetchList<Record<string, any>>("/maintenance/maintenance/", {
            page: 1,
            pageSize: 200,
            query: { equipment: equipmentId, ordering: "-scheduled_date" },
            clientCache: false,
          }),
          editable
            ? apiFetchList<Record<string, any>>("/equipment/incident/", {
                page: 1,
                pageSize: 100,
                query: { equipment: equipmentId, ordering: "-date" },
                clientCache: false,
              })
            : Promise.resolve({ items: [] as Record<string, any>[] }),
          editable
            ? apiFetchList<Record<string, any>>("/human_resources/employee/", {
                page: 1,
                pageSize: 300,
                query: { ordering: "name" },
                clientCache: false,
              })
            : Promise.resolve({ items: [] as Record<string, any>[] }),
        ]);
        if (!mounted) return;
        setMaintenances(maint.status === "fulfilled" ? maint.value.items : []);
        setIncidents(incs.status === "fulfilled" ? (incs.value as any).items : []);
        setEmployees(staff.status === "fulfilled" ? (staff.value as any).items : []);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [equipmentId, editable, safeRefreshToken]);

  async function schedule() {
    if (saving || !equipmentId || !draft.scheduled_date) return;
    setSaving(true);
    setErro(null);
    try {
      const created = await apiFetch<Record<string, any>>("/maintenance/maintenance/", {
        method: "POST",
        clientCache: false,
        body: JSON.stringify({
          equipment: Number(equipmentId),
          type: draft.type,
          maintenance_type: draft.maintenance_type,
          incident:
            draft.maintenance_type === "CORRECTIVA" && draft.incident
              ? Number(draft.incident)
              : null,
          scheduled_date: draft.scheduled_date,
          technician: draft.technician,
        }),
      });
      setMaintenances((current) => [created, ...current]);
      setDraft((current) => ({ ...current, incident: "", technician: "" }));
    } catch (e: any) {
      setErro(e?.message || "Falha ao agendar a manutenção.");
    } finally {
      setSaving(false);
    }
  }

  async function markPerformed(m: Record<string, any>) {
    if (busyId) return;
    setBusyId(m.id);
    setErro(null);
    try {
      const updated = await apiFetch<Record<string, any>>(
        `/maintenance/maintenance/${m.id}/realizar/`,
        { method: "POST", clientCache: false, body: JSON.stringify({}) },
      );
      setMaintenances((current) =>
        current.map((item) => (item.id === m.id ? updated : item)),
      );
    } catch (e: any) {
      setErro(e?.message || "Falha ao marcar a manutenção como executada.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: Record<string, any>) {
    if (busyId) return;
    setBusyId(m.id);
    setErro(null);
    try {
      await apiFetch(`/maintenance/maintenance/${m.id}/`, {
        method: "DELETE",
        clientCache: false,
      });
      setMaintenances((current) => current.filter((item) => item.id !== m.id));
    } catch (e: any) {
      setErro(e?.message || "Falha ao remover a manutenção.");
    } finally {
      setBusyId(null);
    }
  }

  const byIncident = maintenances.filter(
    (m) => m.incident || m.maintenance_type === "CORRECTIVA",
  ).length;

  return (
    <section className={`${GLASS} border-l-4 border-l-amber-500 dark:border-l-amber-400`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <CalendarClock size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Manutenções</span>
        {loading ? (
          <Loader2 size={11} className="animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className="inline-flex items-center rounded-full border border-blue-200/50 bg-blue-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
              Programadas {maintenances.filter((m) => !m.performed_date && !isOverdue(m)).length}
            </span>
            <span className="inline-flex items-center rounded-full border border-rose-200/50 bg-rose-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
              Atrasadas {maintenances.filter((m) => isOverdue(m)).length}
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200/50 bg-emerald-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
              Executadas {maintenances.filter((m) => Boolean(m.performed_date)).length}
            </span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
              {maintenances.length}
            </span>
          </>
        )}
      </div>

      {editable ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 px-3 py-1.5">
          <select
            value={draft.type}
            onChange={(e) => setDraft((c) => ({ ...c, type: e.target.value }))}
            className={`${INPUT} [&>option]:bg-background`}
            aria-label="Recorrência"
          >
            {Object.entries(RECURRENCE_META).map(([code, meta]) => (
              <option key={code} value={code}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            value={draft.maintenance_type}
            onChange={(e) =>
              setDraft((c) => ({
                ...c,
                maintenance_type: e.target.value,
                incident: e.target.value === "CORRECTIVA" ? c.incident : "",
              }))
            }
            className={`${INPUT} [&>option]:bg-background`}
            aria-label="Tipo de manutenção"
          >
            <option value="PREVENTIVA">Preventiva</option>
            <option value="CORRECTIVA">Correctiva (avaria)</option>
          </select>
          {draft.maintenance_type === "CORRECTIVA" ? (
            <select
              value={draft.incident}
              onChange={(e) => setDraft((c) => ({ ...c, incident: e.target.value }))}
              className={`${INPUT} max-w-[12rem] [&>option]:bg-background`}
              aria-label="Ocorrência de origem"
            >
              <option value="">Sem ocorrência ligada</option>
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {incident.custom_id || `#${incident.id}`}
                  {incident.resolved ? " (resolvida)" : ""}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="date"
            value={draft.scheduled_date}
            onChange={(e) => setDraft((c) => ({ ...c, scheduled_date: e.target.value }))}
            className={INPUT}
            aria-label="Data prevista"
          />
          <select
            value={draft.technician}
            onChange={(e) => setDraft((c) => ({ ...c, technician: e.target.value }))}
            className={`${INPUT} max-w-[13rem] [&>option]:bg-background`}
            aria-label="Técnico (herdado de RH)"
          >
            <option value="">Técnico (opcional)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={String(employee.name ?? "")}>
                {employee.name}
                {employee.role_name ? ` — ${employee.role_name}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void schedule()}
            disabled={saving}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-2 text-[10px] font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Agendar
          </button>
        </div>
      ) : null}

      {erro ? (
        <p className="border-b border-border/40 px-3 py-1.5 text-[10px] text-rose-600 dark:text-rose-400">
          {erro}
        </p>
      ) : null}

      {!loading && maintenances.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-border/40 px-3 py-1.5">
          {Object.entries(RECURRENCE_META).map(([code, meta]) => {
            const count = maintenances.filter(
              (m) => String(m.type ?? "").toUpperCase() === code,
            ).length;
            return (
              <span
                key={code}
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${count ? meta.chip : "border-white/20 bg-white/[0.03] text-muted-foreground/60 dark:border-white/10"}`}
              >
                {meta.label} {count}
              </span>
            );
          })}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
              byIncident
                ? "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                : "border-white/20 bg-white/[0.03] text-muted-foreground/60 dark:border-white/10"
            }`}
          >
            Por avaria {byIncident}
          </span>
        </div>
      ) : null}

      <div className="max-h-72 space-y-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {loading ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">A carregar manutenções...</p>
        ) : maintenances.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            Sem manutenções registadas para este equipamento.
            {editable ? " Agende a primeira na linha acima." : ""}
          </p>
        ) : (
          maintenances.map((m) => {
            const recurrence = RECURRENCE_META[String(m.type ?? "").toUpperCase()];
            const corrective = Boolean(m.incident) || m.maintenance_type === "CORRECTIVA";
            const inner = (
              <>
                <span className="text-[10px] font-semibold text-foreground">
                  {m.custom_id || `#${m.id}`}
                </span>
                {recurrence ? (
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${recurrence.chip}`}>
                    {recurrence.label}
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                    corrective
                      ? "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                      : "border-teal-200/50 bg-teal-100/30 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300"
                  }`}
                >
                  {m.maintenance_type_display || (corrective ? "Correctiva" : "Preventiva")}
                </span>
                {m.incident_code ? (
                  <span className="inline-flex items-center rounded-full border border-rose-200/50 bg-rose-100/30 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300">
                    Avaria {m.incident_code}
                  </span>
                ) : null}
                <span className="ml-auto flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                  <span>Prevista: {fmtDate(m.scheduled_date)}</span>
                  <span
                    className={
                      m.performed_date
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isOverdue(m)
                          ? "font-semibold text-rose-600 dark:text-rose-400"
                          : ""
                    }
                  >
                    {m.performed_date
                      ? `Executada: ${fmtDate(m.performed_date)}`
                      : isOverdue(m)
                        ? "Atrasada"
                        : "Programada"}
                  </span>
                  {m.technician ? <span>{m.technician}</span> : null}
                </span>
              </>
            );
            const rowClass = `flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-l-4 border-white/20 bg-white/20 px-2 py-1.5 transition dark:border-white/10 dark:bg-white/5 ${maintenanceBar(m)}`;

            if (!editable) {
              return (
                <Link
                  key={m.id}
                  href={`/maintenance/maintenances/${m.id}`}
                  className={`${rowClass} hover:bg-white/40 dark:hover:bg-white/10`}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <div key={m.id} className={rowClass}>
                {inner}
                <span className="flex shrink-0 items-center gap-1">
                  {!m.performed_date ? (
                    <button
                      type="button"
                      onClick={() => void markPerformed(m)}
                      disabled={busyId === m.id}
                      title="Marcar executada"
                      aria-label="Marcar executada"
                      className="grid h-6 w-6 place-items-center rounded-md border border-emerald-200/50 bg-emerald-100/30 text-emerald-700 transition hover:brightness-110 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                    >
                      {busyId === m.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(m)}
                    disabled={busyId === m.id}
                    title="Remover"
                    aria-label="Remover"
                    className="grid h-6 w-6 place-items-center rounded-md border border-rose-200/50 bg-rose-100/30 text-rose-700 transition hover:brightness-110 disabled:opacity-50 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"
                  >
                    <Trash2 size={11} />
                  </button>
                  <Link
                    href={`/maintenance/maintenances/${m.id}`}
                    title="Abrir detalhe"
                    aria-label="Abrir detalhe"
                    className="grid h-6 w-6 place-items-center rounded-md border border-white/25 bg-white/[0.05] text-muted-foreground transition hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <ExternalLink size={11} />
                  </Link>
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
