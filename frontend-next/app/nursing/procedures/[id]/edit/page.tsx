"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, HeartPulse, Layers, Loader2, Stethoscope, User } from "lucide-react";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type Procedure = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  ward_name?: string | null;
  professional_name?: string | null;
  professional_names?: string[] | string | null;
  performed_date?: string | null;
  workflow_status_display?: string | null;
  selected_catalogs?: Array<number | string> | null;
  selected_materials?: Array<number | string> | null;
  [key: string]: unknown;
};

const ENDPOINT = "/nursing/procedure/";

function formatDateTime(value?: string | null) {
  if (!value) return "Não definida";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
}

function professionalLabel(procedure: Procedure | null) {
  if (!procedure) return "Não definido";
  if (Array.isArray(procedure.professional_names) && procedure.professional_names.length) {
    return procedure.professional_names.join(", ");
  }
  if (typeof procedure.professional_names === "string" && procedure.professional_names.trim()) {
    return procedure.professional_names;
  }
  return procedure.professional_name || "Não definido";
}

export default function EditProcedurePage() {
  const params = useParams();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = routeParamToString((params as { id?: string | string[] })?.id);
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const config = useMemo(() => getResourceFormConfig("nursing", "procedure", ENDPOINT), []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setProcedure(await apiFetch<Procedure>(`${ENDPOINT}${id}/`, { clientCache: safeRefreshToken === 0 }));
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar o procedimento.");
    } finally {
      setLoading(false);
    }
  }, [id, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = [
    {
      label: "Realização",
      value: formatDateTime(procedure?.performed_date),
      icon: CalendarClock,
      tone: "from-sky-500 to-cyan-500",
    },
    {
      label: "Profissional",
      value: professionalLabel(procedure),
      icon: User,
      tone: "from-violet-500 to-indigo-500",
    },
    {
      label: "Catálogos",
      value: `${procedure?.selected_catalogs?.length || 0} selecionado(s)`,
      icon: Stethoscope,
      tone: "from-emerald-500 to-teal-500",
    },
    {
      label: "Materiais",
      value: `${procedure?.selected_materials?.length || 0} selecionado(s)`,
      icon: Layers,
      tone: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <header className="relative overflow-hidden rounded-2xl border border-white/35 bg-gradient-to-br from-white/30 via-white/12 to-violet-100/20 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.025] dark:to-violet-950/15">
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
                <HeartPulse size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">Procedimento de enfermagem</p>
                <h1 className="truncate text-xl font-bold text-foreground">Editar {procedure?.custom_id || `procedimento ${id}`}</h1>
                <p className="truncate text-xs text-muted-foreground">{procedure?.patient_name || "Paciente"}{procedure?.ward_name ? ` · ${procedure.ward_name}` : ""}</p>
              </div>
            </div>
            <Link href={`/nursing/procedures/${id}`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/40 bg-white/25 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-lg transition hover:bg-white/45 dark:border-white/10 dark:bg-white/5">
              <ArrowLeft size={13} /> Voltar aos detalhes
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/20 text-sm text-muted-foreground shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.03]">
            <Loader2 size={16} className="animate-spin" /> A carregar procedimento…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200/50 bg-red-50/35 p-4 text-sm text-red-700 backdrop-blur-xl dark:border-red-800/30 dark:bg-red-950/15 dark:text-red-300">{error}</div>
        ) : procedure ? (
          <>
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {summary.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/35 bg-white/20 p-3 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.tone} text-white shadow-sm`}><Icon size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className="truncate text-xs font-semibold text-foreground">{item.value}</p>
                    </div>
                  </article>
                );
              })}
            </section>

            <AutoForm
              endpoint={`${ENDPOINT}${procedure.id}/`}
              method="put"
              initialValues={procedure}
              submitLabel="Guardar alterações"
              config={config}
              onSuccess={() => router.push(`/nursing/procedures/${procedure.id}`)}
            />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
