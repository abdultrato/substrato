"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Loader2,
  Lock,
  Plus,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/ui/MetricCard";
import { useLanguage } from "@/hooks/useLanguage";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type WardBedDetail = {
  id: number;
  custom_id?: string | null;
  ward?: number | null;
  ward_name?: string | null;
  number?: string | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type WardAdmissionRow = {
  id: number;
  custom_id?: string | null;
  patient?: number | null;
  patient_name?: string | null;
  admission_date?: string | null;
  expected_discharge_date?: string | null;
  next_medication_at?: string | null;
  next_medication_description?: string | null;
  active?: boolean | null;
};

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function formatDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function statusLabel(active: boolean | null | undefined, hasActiveAdmission: boolean, t: (pt: string, en: string) => string) {
  if (hasActiveAdmission) return t("Ocupada", "Occupied");
  return active ?? false ? t("Disponível", "Available") : t("Bloqueada", "Blocked");
}

function statusClasses(active: boolean | null | undefined, hasActiveAdmission: boolean) {
  if (hasActiveAdmission) {
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-400";
  }
  return active ?? false
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400";
}

export default function WardBedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const id = String((params as any)?.id || "");
  const [bed, setBed] = useState<WardBedDetail | null>(null);
  const [admissions, setAdmissions] = useState<WardAdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"available" | "block" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const bedRow = await apiFetch<WardBedDetail>(`/nursing/ward_bed/${id}/`, { clientCache: false });
      const admissionResponse = await apiFetchList<WardAdmissionRow>("/nursing/ward_admission/", {
        page: 1,
        pageSize: 20,
        query: { bed: id, active: true },
        clientCache: false,
      });
      setBed(bedRow);
      setAdmissions(admissionResponse.items || []);
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar cama.", "Failed to load bed."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAction(action: "available" | "block") {
    if (!bed) return;
    setActionLoading(action);
    setError(null);
    try {
      const path = action === "available" ? "marcar-disponivel" : "bloquear";
      const updated = await apiFetch<WardBedDetail>(`/nursing/ward_bed/${bed.id}/${path}/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setBed(updated);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || t("Falha ao atualizar cama.", "Failed to update bed."));
    } finally {
      setActionLoading(null);
    }
  }

  const activeAdmission = admissions.find((row) => row.active) || null;
  const hasActiveAdmission = Boolean(activeAdmission);
  const displayNumber = bed?.number || bed?.id || id;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <BedDouble size={18} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {t("Cama", "Bed")} {loading ? "..." : displayNumber}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {bed?.custom_id || t("Detalhe da cama de enfermaria", "Ward bed detail")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/nursing/ward-beds"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={13} />
                {t("Voltar", "Back")}
              </Link>
              {bed ? (
                <Link
                  href={`/nursing/ward-beds/${bed.id}/edit`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400"
                >
                  <Edit3 size={13} />
                  {t("Editar", "Edit")}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            {t("A carregar cama...", "Loading bed...")}
          </div>
        ) : !bed ? (
          <SectionCard icon={BedDouble} title={t("Cama não encontrada", "Bed not found")}>
            <p className="text-sm text-muted-foreground">{t("Não foi possível encontrar esta cama.", "This bed could not be found.")}</p>
          </SectionCard>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricCard
                label={t("Estado", "Status")}
                value={statusLabel(bed.active, hasActiveAdmission, t)}
                accentClass={hasActiveAdmission ? "border-l-blue-500" : bed.active ? "border-l-emerald-500" : "border-l-amber-500"}
              />
              <MetricCard label={t("Enfermaria", "Ward")} value={bed.ward_name || "-"} accentClass="border-l-violet-500" />
              <MetricCard label={t("Internamentos ativos", "Active admissions")} value={admissions.length} accentClass="border-l-blue-500" />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <SectionCard icon={BedDouble} title={t("Resumo da cama", "Bed summary")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Número", "Number")}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{bed.number || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Código", "Code")}</p>
                    <p className="mt-1 font-mono text-sm text-foreground">{bed.custom_id || `CAMA-${bed.id}`}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Enfermaria", "Ward")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{bed.ward_name || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Atualizada", "Updated")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(bed.updated_at || bed.created_at, true)}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={CheckCircle2} title={t("Operação", "Operations")}>
                <div className="space-y-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(bed.active, hasActiveAdmission)}`}>
                    <CheckCircle2 size={13} />
                    {statusLabel(bed.active, hasActiveAdmission, t)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {hasActiveAdmission
                      ? t("Existe um internamento ativo associado a esta cama.", "There is an active admission assigned to this bed.")
                      : t("Atualize a disponibilidade operacional da cama quando necessário.", "Update the operational availability of this bed when needed.")}
                  </p>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => runAction("available")}
                      disabled={actionLoading !== null || Boolean(bed.active)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                    >
                      {actionLoading === "available" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {t("Marcar disponível", "Mark available")}
                    </button>
                    <button
                      type="button"
                      onClick={() => runAction("block")}
                      disabled={actionLoading !== null || !bed.active || hasActiveAdmission}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400"
                    >
                      {actionLoading === "block" ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                      {t("Bloquear cama", "Block bed")}
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard icon={User} title={t("Internamento ativo", "Active admission")}>
              {activeAdmission ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Paciente", "Patient")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{activeAdmission.patient_name || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Entrada", "Admission")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(activeAdmission.admission_date, true)}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Alta prevista", "Expected discharge")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(activeAdmission.expected_discharge_date, true)}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Próxima medicação", "Next medication")}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(activeAdmission.next_medication_at, true)}</p>
                  </div>
                  {activeAdmission.next_medication_description ? (
                    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 sm:col-span-2 lg:col-span-4">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Descrição", "Description")}</p>
                      <p className="mt-1 text-sm text-foreground">{activeAdmission.next_medication_description}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock size={16} />
                    {t("Nenhum internamento ativo nesta cama.", "No active admission in this bed.")}
                  </div>
                  <Link
                    href="/nursing/ward-admissions/new"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
                  >
                    <Plus size={13} />
                    {t("Novo internamento", "New admission")}
                  </Link>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </AppLayout>
  );
}
