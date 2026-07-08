"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  BedDouble,
  CheckCircle2,
  Pencil,
  Pill,
  Plus,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";
import { GROUPS } from "@/lib/rbac";

type WardRecord = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BedRow = {
  id: number;
  custom_id?: string | null;
  number?: string | null;
  active?: boolean | null;
  ward?: number;
};

type AdmissionRow = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  bed_number?: string | null;
  admission_date?: string | null;
  expected_discharge_date?: string | null;
  discharged_at?: string | null;
  next_medication_at?: string | null;
  next_medication_description?: string | null;
  active?: boolean | null;
  ward?: number;
  bed?: number | null;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function isOpenAdmission(admission: AdmissionRow): boolean {
  return (admission.active ?? false) && !admission.discharged_at;
}

export default function NursingWardDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const wardId = Number(id);

  const [ward, setWard] = useState<WardRecord | null>(null);
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [wardData, bedsRes, admissionsRes] = await Promise.all([
        apiFetch<WardRecord>(`/nursing/ward/${id}/`, { clientCache: false }),
        apiFetchList<BedRow>("/nursing/ward_bed/", {
          page: 1,
          pageSize: 200,
          clientPaginate: true,
          clientCache: false,
        }),
        apiFetchList<AdmissionRow>("/nursing/ward_admission/", {
          page: 1,
          pageSize: 200,
          clientPaginate: true,
          clientCache: false,
        }),
      ]);
      setWard(wardData);
      setBeds((bedsRes.items || []).filter((bed) => bed.ward === wardData.id));
      setAdmissions((admissionsRes.items || []).filter((admission) => admission.ward === wardData.id));
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar a enfermaria.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdmissions = useMemo(() => admissions.filter(isOpenAdmission), [admissions]);

  const occupiedBedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const admission of openAdmissions) {
      if (admission.bed) ids.add(admission.bed);
    }
    return ids;
  }, [openAdmissions]);

  const admissionByBedId = useMemo(() => {
    const map = new Map<number, AdmissionRow>();
    for (const admission of openAdmissions) {
      if (admission.bed) map.set(admission.bed, admission);
    }
    return map;
  }, [openAdmissions]);

  const freeBeds = beds.filter((bed) => (bed.active ?? false) && !occupiedBedIds.has(bed.id)).length;
  const inactiveBeds = beds.filter((bed) => !(bed.active ?? false)).length;

  const headerStats = [
    {
      key: "camas",
      label: "Camas",
      value: beds.length,
      icon: BedDouble,
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "livres",
      label: "Livres",
      value: freeBeds,
      icon: CheckCircle2,
      chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    {
      key: "ocupadas",
      label: "Ocupadas",
      value: occupiedBedIds.size,
      icon: User,
      chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    {
      key: "internamentos",
      label: "Internamentos",
      value: openAdmissions.length,
      icon: Pill,
      chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-2 text-[0.9em]">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-emerald-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-emerald-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <BedDouble size={22} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate font-display text-xl font-bold text-foreground">
                    {ward?.name || "Enfermaria"}
                  </h1>
                  {ward ? (
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${ward.active
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}
                    >
                      {ward.active ? "Ativa" : "Inativa"}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {ward?.custom_id || "—"}
                  {ward?.description ? ` · ${ward.description}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/nursing/ward-admissions/new"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700"
              >
                <Plus size={13} /> Admitir paciente
              </Link>
              <Link
                href={`/nursing/ward/${wardId}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <Pencil size={13} /> Editar
              </Link>
              <Link
                href="/nursing/ward"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <ArrowLeft size={13} /> Voltar
              </Link>
            </div>
          </div>

          <div className="mt-2.5 flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-white/30 pt-2.5 dark:border-white/10">
            {headerStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <span
                  key={stat.key}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-white/30 bg-white/40 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${stat.chip}`}>
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className="font-display text-lg font-bold leading-none text-foreground tabular-nums">
                    {loading ? "..." : stat.value}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : ward ? (
          <>
            {/* Mapa de camas */}
            <section className="rounded-xl border border-white/25 bg-white/35 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Camas</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  {beds.length}
                </span>
                {inactiveBeds > 0 ? (
                  <span className="text-[10px] text-muted-foreground">{inactiveBeds} inativas</span>
                ) : null}
              </div>
              {beds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Sem camas cadastradas nesta enfermaria.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {beds.map((bed) => {
                    const admission = admissionByBedId.get(bed.id);
                    const isInactive = !(bed.active ?? false);
                    const tone = isInactive
                      ? "border-gray-200 bg-gray-50/60 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
                      : admission
                        ? "border-violet-200 bg-violet-50/70 dark:border-violet-800/40 dark:bg-violet-900/20"
                        : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-900/20";
                    return (
                      <div key={bed.id} className={`min-w-0 rounded-lg border px-2 py-1.5 ${tone}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-foreground">
                            <BedDouble size={12} className="shrink-0" />
                            <span className="truncate">Cama {bed.number || bed.id}</span>
                          </span>
                          {isInactive ? (
                            <Ban size={12} className="shrink-0 text-gray-400" aria-label="Inativa" />
                          ) : null}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {isInactive
                            ? "Inativa"
                            : admission
                              ? admission.patient_name || "Ocupada"
                              : "Livre"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Internamentos ativos */}
            <section className="rounded-xl border border-white/25 bg-white/35 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Internamentos ativos</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                  {openAdmissions.length}
                </span>
              </div>
              {openAdmissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Sem internamentos ativos nesta enfermaria.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                  {openAdmissions.map((admission) => (
                    <Link
                      key={admission.id}
                      href={`/nursing/ward-admissions/${admission.id}`}
                      className="min-w-0 rounded-lg border border-white/30 bg-white/40 px-2.5 py-2 shadow-sm backdrop-blur-sm transition hover:border-violet-300/60 hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/[0.08]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {admission.patient_name || "Paciente"}
                        </span>
                        {admission.bed_number ? (
                          <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                            Cama {admission.bed_number}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        Admitido: {formatDateTime(admission.admission_date)}
                        {admission.expected_discharge_date
                          ? ` · Alta prevista: ${formatDateTime(admission.expected_discharge_date)}`
                          : ""}
                      </div>
                      {admission.next_medication_at ? (
                        <div className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                          <Pill size={11} className="shrink-0" />
                          <span className="truncate">
                            {formatDateTime(admission.next_medication_at)}
                            {admission.next_medication_description ? ` — ${admission.next_medication_description}` : ""}
                          </span>
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            Enfermaria não encontrada.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
