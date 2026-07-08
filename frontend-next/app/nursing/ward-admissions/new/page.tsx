"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BedDouble, Building2, Loader2, Plus, User } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Option = { id: number; name?: string | null; custom_id?: string | null; active?: boolean | null };

type BedRow = {
  id: number;
  number?: string | null;
  active?: boolean | null;
  ward?: number;
};

type AdmissionRow = {
  id: number;
  bed?: number | null;
  active?: boolean | null;
  discharged_at?: string | null;
};

function WardAdmissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Option[]>([]);
  const [wards, setWards] = useState<Option[]>([]);
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surgeryId = searchParams?.get("surgery") || "";
  const [patientId, setPatientId] = useState(searchParams?.get("patient") || "");
  const [wardId, setWardId] = useState(searchParams?.get("ward") || "");
  const [bedId, setBedId] = useState("");
  const surgeryOriginNote = surgeryId
    ? `Origem do internamento: paciente encaminhado da cirurgia de grande porte número ${surgeryId} para admissão em enfermaria.`
    : "";
  const [notes, setNotes] = useState(surgeryOriginNote);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [patientsRes, wardsRes, bedsRes, admissionsRes] = await Promise.all([
          apiFetchList<Option>("/clinical/patients/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
          apiFetchList<Option>("/nursing/ward/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
          apiFetchList<BedRow>("/nursing/ward_bed/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
          apiFetchList<AdmissionRow>("/nursing/ward_admission/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
        ]);
        if (!mounted) return;
        setPatients(patientsRes.items || []);
        setWards((wardsRes.items || []).filter((ward) => ward.active ?? true));
        setBeds(bedsRes.items || []);
        setAdmissions(admissionsRes.items || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Erro ao carregar dados do formulário.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const occupiedBedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const admission of admissions) {
      if ((admission.active ?? false) && !admission.discharged_at && admission.bed) ids.add(admission.bed);
    }
    return ids;
  }, [admissions]);

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        value: String(patient.id),
        label: patient.name || `Paciente ${patient.id}`,
        hint: patient.custom_id || undefined,
      })),
    [patients]
  );

  const wardOptions = useMemo(
    () =>
      wards.map((ward) => ({
        value: String(ward.id),
        label: ward.name || `Enfermaria ${ward.id}`,
        hint: ward.custom_id || undefined,
      })),
    [wards]
  );

  const bedOptions = useMemo(() => {
    if (!wardId) return [];
    return beds
      .filter((bed) => bed.ward === Number(wardId) && (bed.active ?? false) && !occupiedBedIds.has(bed.id))
      .map((bed) => ({ value: String(bed.id), label: `Cama ${bed.number || bed.id}` }));
  }, [beds, wardId, occupiedBedIds]);
  const selectedPatient = useMemo(
    () => patientOptions.find((option) => option.value === patientId) || null,
    [patientOptions, patientId]
  );
  const selectedWard = useMemo(
    () => wardOptions.find((option) => option.value === wardId) || null,
    [wardOptions, wardId]
  );

  // Cama escolhida deixa de ser válida se a enfermaria mudar.
  useEffect(() => {
    if (bedId && !bedOptions.some((option) => option.value === bedId)) setBedId("");
  }, [bedId, bedOptions]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!patientId) {
      setError("Selecione um paciente.");
      return;
    }
    if (!wardId) {
      setError("Selecione uma enfermaria.");
      return;
    }
    if (!bedId) {
      setError("Selecione uma cama livre.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        patient: Number(patientId),
        ward: Number(wardId),
        bed: Number(bedId),
        active: true,
      };
      if (notes.trim()) payload.notes = notes.trim();

      await apiFetch("/nursing/ward_admission/", { method: "POST", body: JSON.stringify(payload) });
      router.push(`/nursing/ward/${wardId}`);
    } catch (e: any) {
      setError(e?.message || "Falha ao registar o internamento.");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-violet-400/60 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/10";
  const labelClass = "text-[11px] font-semibold text-muted-foreground";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-1.5 text-[0.9em]">
      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-violet-500/15 via-white/30 to-white/30 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-violet-500/10 dark:via-white/5 dark:to-white/5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <BedDouble size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-foreground">Admitir paciente</h1>
            <p className="text-[11px] text-muted-foreground">Registo de internamento em enfermaria.</p>
          </div>
        </div>
        <Link
          href="/nursing/ward-admissions"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <ArrowLeft size={13} /> Voltar
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-1.5 py-6 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Carregando…
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-2 rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
        >
          {surgeryId ? (
            <div className="grid gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-2 text-xs text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-200 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2">
                <User size={15} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Paciente encaminhado</p>
                  <p className="truncate">{selectedPatient?.label || "A carregar paciente..."}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Building2 size={15} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">1. Escolha a enfermaria</p>
                  <p className="truncate">{selectedWard?.label || "Nenhuma enfermaria selecionada"}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <BedDouble size={15} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">2. Escolha o leito</p>
                  <p className="truncate">{wardId ? `${bedOptions.length} cama${bedOptions.length === 1 ? "" : "s"} livre${bedOptions.length === 1 ? "" : "s"}` : "Disponível após escolher enfermaria"}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass}>Paciente *</label>
              <SearchableSelect
                value={patientId}
                onChange={setPatientId}
                options={patientOptions}
                disabled={Boolean(surgeryId)}
                placeholder="Selecione o paciente"
                searchPlaceholder="Pesquisar paciente..."
                emptyMessage="Nenhum paciente."
              />
              {surgeryId ? (
                <p className="text-[10px] text-muted-foreground">Paciente definido pelo encaminhamento cirúrgico.</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Enfermaria *</label>
              <SearchableSelect
                value={wardId}
                onChange={setWardId}
                options={wardOptions}
                placeholder="Selecione a enfermaria"
                searchPlaceholder="Pesquisar enfermaria..."
                emptyMessage="Nenhuma enfermaria ativa."
              />
              <p className="text-[10px] text-muted-foreground">Escolha a enfermaria onde o paciente será admitido.</p>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Cama/leito livre *</label>
              <SearchableSelect
                value={bedId}
                onChange={setBedId}
                options={bedOptions}
                disabled={!wardId}
                placeholder={wardId ? "Selecione a cama" : "Escolha a enfermaria primeiro"}
                searchPlaceholder="Pesquisar cama..."
                emptyMessage="Sem camas livres nesta enfermaria."
              />
              <p className="text-[10px] text-muted-foreground">
                {wardId
                  ? bedOptions.length > 0
                    ? "A lista mostra apenas camas ativas e desocupadas nesta enfermaria."
                    : "Esta enfermaria não tem cama livre no momento."
                  : "As camas aparecem depois da seleção da enfermaria."}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Notas</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Observações do internamento…"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
            <Link
              href="/nursing/ward-admissions"
              className="inline-flex h-7 items-center rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={13} />
              {saving ? "Registando…" : "Registar internamento"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NursingWardAdmissionsCreatePage() {
  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando...</div>}>
        <WardAdmissionForm />
      </Suspense>
    </AppLayout>
  );
}
