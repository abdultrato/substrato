"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Loader2,
  Save,
  ShieldAlert,
  UserCog,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

const INPUT =
  "w-full rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40";

const RECURRENCES: Array<[string, string]> = [
  ["DIARIA", "Diária"],
  ["SEMANAL", "Semanal"],
  ["MENSAL", "Mensal"],
  ["TRIMESTRAL", "Trimestral"],
  ["SEMESTRAL", "Semestral"],
  ["ANUAL", "Anual"],
];

/** Cartão de secção do formulário, separado por função. */
function FormSection({
  title,
  icon: Icon,
  bar,
  children,
}: {
  title: string;
  icon: typeof CalendarClock;
  bar: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} border-l-4 ${bar}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="grid gap-2 p-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

type FormState = {
  type: string;
  maintenance_type: string;
  incident: string;
  scheduled_date: string;
  performed_date: string;
  technician: string;
  description: string;
};

export default function MaintenancesEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [row, setRow] = useState<Record<string, any> | null>(null);
  const [incidents, setIncidents] = useState<Record<string, any>[]>([]);
  const [employees, setEmployees] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState<FormState>({
    type: "MENSAL",
    maintenance_type: "PREVENTIVA",
    incident: "",
    scheduled_date: "",
    performed_date: "",
    technician: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    try {
      const result = await apiFetch<Record<string, any>>(
        `/maintenance/maintenance/${encodeURIComponent(id)}/`,
        { clientCache: false },
      );
      setRow(result || null);
      if (result) {
        setForm({
          type: String(result.type ?? "MENSAL"),
          maintenance_type: String(result.maintenance_type ?? "PREVENTIVA"),
          incident: result.incident ? String(result.incident) : "",
          scheduled_date: String(result.scheduled_date ?? "").slice(0, 10),
          performed_date: String(result.performed_date ?? "").slice(0, 10),
          technician: String(result.technician ?? ""),
          description: String(result.description ?? ""),
        });
        const [incs, staff] = await Promise.allSettled([
          result.equipment
            ? apiFetchList<Record<string, any>>("/equipment/incident/", {
                page: 1,
                pageSize: 100,
                query: { equipment: result.equipment, ordering: "-date" },
                clientCache: false,
              })
            : Promise.resolve({ items: [] as Record<string, any>[] }),
          apiFetchList<Record<string, any>>("/human_resources/employee/", {
            page: 1,
            pageSize: 300,
            query: { ordering: "name" },
            clientCache: false,
          }),
        ]);
        setIncidents(incs.status === "fulfilled" ? (incs.value as any).items : []);
        setEmployees(staff.status === "fulfilled" ? (staff.value as any).items : []);
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar a manutenção.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, safeRefreshToken]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    setErro(null);
    try {
      await apiFetch(`/maintenance/maintenance/${encodeURIComponent(id)}/`, {
        method: "PATCH",
        clientCache: false,
        body: JSON.stringify({
          type: form.type,
          maintenance_type: form.maintenance_type,
          incident:
            form.maintenance_type === "CORRECTIVA" && form.incident
              ? Number(form.incident)
              : null,
          scheduled_date: form.scheduled_date || null,
          performed_date: form.performed_date || null,
          technician: form.technician,
          description: form.description,
        }),
      });
      router.push(`/maintenance/maintenances/${id}`);
    } catch (e: any) {
      setErro(e?.message || "Falha ao guardar a manutenção.");
      setSaving(false);
    }
  }

  // O técnico actual pode não existir em RH (texto legado): mantém-no como opção.
  const technicianOptions = [...employees];
  if (
    form.technician &&
    !employees.some((employee) => String(employee.name ?? "") === form.technician)
  ) {
    technicianOptions.unshift({ id: "legacy", name: form.technician });
  }

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-1.5">
        {/* Cabeçalho fundido: identidade + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/25 bg-gradient-to-br from-amber-100/[0.05] via-white/[0.015] to-orange-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-amber-800/20 dark:from-amber-950/[0.05] dark:via-white/[0.01] dark:to-orange-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
                <CalendarClock size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="line-clamp-1 text-base font-bold leading-tight text-foreground">
                  {row?.custom_id ? `Editar · ${row.custom_id}` : "Editar manutenção"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {row ? row.equipment_name || "—" : "A carregar…"}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href={id ? `/maintenance/maintenances/${id}` : "/maintenance/maintenances"}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving || loading || !row}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-amber-700 hover:to-orange-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
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
          <div className="grid grid-cols-2 gap-1.5">
            <FormSection
              title="Planeamento"
              icon={CalendarClock}
              bar="border-l-blue-500 dark:border-l-blue-400"
            >
              <Field label="Recorrência">
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className={`${INPUT} [&>option]:bg-background`}
                >
                  {RECURRENCES.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de manutenção">
                <select
                  value={form.maintenance_type}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((current) => ({
                      ...current,
                      maintenance_type: value,
                      incident: value === "CORRECTIVA" ? current.incident : "",
                    }));
                  }}
                  className={`${INPUT} [&>option]:bg-background`}
                >
                  <option value="PREVENTIVA">Preventiva</option>
                  <option value="CORRECTIVA">Correctiva (avaria)</option>
                </select>
              </Field>
              <Field label="Data prevista">
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => set("scheduled_date", e.target.value)}
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Data executada">
                <input
                  type="date"
                  value={form.performed_date}
                  onChange={(e) => set("performed_date", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Avaria de origem"
              icon={AlertTriangle}
              bar="border-l-rose-500 dark:border-l-rose-400"
            >
              {form.maintenance_type === "CORRECTIVA" ? (
                <Field label="Ocorrência ligada" full>
                  <select
                    value={form.incident}
                    onChange={(e) => set("incident", e.target.value)}
                    className={`${INPUT} [&>option]:bg-background`}
                  >
                    <option value="">Sem ocorrência ligada</option>
                    {incidents.map((incident) => (
                      <option key={incident.id} value={String(incident.id)}>
                        {incident.custom_id || `#${incident.id}`}
                        {incident.resolved ? " (resolvida)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="px-1 py-2 text-[11px] text-muted-foreground sm:col-span-2">
                  Manutenção preventiva — mude o tipo para Correctiva para ligar
                  uma ocorrência/avaria.
                </p>
              )}
            </FormSection>

            <FormSection
              title="Execução"
              icon={UserCog}
              bar="border-l-teal-500 dark:border-l-teal-400"
            >
              <Field label="Técnico (herdado de RH)" full>
                <select
                  value={form.technician}
                  onChange={(e) => set("technician", e.target.value)}
                  className={`${INPUT} [&>option]:bg-background`}
                >
                  <option value="">Sem técnico atribuído</option>
                  {technicianOptions.map((employee) => (
                    <option key={employee.id} value={String(employee.name ?? "")}>
                      {employee.name}
                      {employee.role_name ? ` — ${employee.role_name}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </FormSection>

            <FormSection
              title="Descrição"
              icon={FileText}
              bar="border-l-indigo-500 dark:border-l-indigo-400"
            >
              <Field label="Detalhes da manutenção" full>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className={`${INPUT} resize-none`}
                />
              </Field>
            </FormSection>
          </div>
        ) : null}
      </form>
    </AppLayout>
  );
}
