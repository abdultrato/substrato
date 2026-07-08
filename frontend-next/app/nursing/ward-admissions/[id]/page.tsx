"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  BedDouble,
  Building2,
  HeartPulse,
  Loader2,
  LogOut,
  Pencil,
  Pill,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { apiFetch, apiFetchList } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";
import { GROUPS } from "@/lib/rbac";

type AdmissionRecord = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  bed_number?: string | null;
  ward_name?: string | null;
  admission_date?: string | null;
  expected_discharge_date?: string | null;
  discharged_at?: string | null;
  next_medication_at?: string | null;
  next_medication_description?: string | null;
  estimated_observation_hours?: number | null;
  active?: boolean | null;
  notes?: string | null;
  ward?: number | null;
  bed?: number | null;
  patient?: number | null;
};

type BedRow = {
  id: number;
  number?: string | null;
  ward_name?: string | null;
  active?: boolean | null;
  ward?: number;
};

type WardRow = {
  id: number;
  name?: string | null;
  custom_id?: string | null;
  active?: boolean | null;
};

type OpenAdmissionRow = {
  id: number;
  bed?: number | null;
  active?: boolean | null;
  discharged_at?: string | null;
};

type PanelKey = "alta" | "transferir" | "obito" | null;

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default function NursingWardAdmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = routeParamToString((params as any)?.id);

  const [record, setRecord] = useState<AdmissionRecord | null>(null);
  const [wards, setWards] = useState<WardRow[]>([]);
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [openAdmissions, setOpenAdmissions] = useState<OpenAdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [panel, setPanel] = useState<PanelKey>(null);
  const [condition, setCondition] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [transferMode, setTransferMode] = useState<"internal" | "external">("internal");
  const [destinationWardId, setDestinationWardId] = useState("");
  const [newBedId, setNewBedId] = useState("");
  const [externalHospital, setExternalHospital] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, wardsRes, bedsRes, admissionsRes] = await Promise.all([
        apiFetch<AdmissionRecord>(`/nursing/ward_admission/${id}/`, { clientCache: false }),
        apiFetchList<WardRow>("/nursing/ward/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
        apiFetchList<BedRow>("/nursing/ward_bed/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
        apiFetchList<OpenAdmissionRow>("/nursing/ward_admission/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false }),
      ]);
      setRecord(data);
      setWards((wardsRes.items || []).filter((ward) => ward.active ?? true));
      setBeds(bedsRes.items || []);
      setOpenAdmissions(
        (admissionsRes.items || []).filter((admission) => (admission.active ?? false) && !admission.discharged_at)
      );
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar o internamento.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOpen = Boolean(record && (record.active ?? false) && !record.discharged_at);

  const wardOptions = useMemo(
    () => wards.map((ward) => ({
      value: String(ward.id),
      label: ward.name || `Enfermaria ${ward.id}`,
      hint: ward.custom_id || undefined,
    })),
    [wards]
  );

  const destinationWard = useMemo(
    () => wardOptions.find((option) => option.value === destinationWardId) || null,
    [wardOptions, destinationWardId]
  );

  const freeBedOptions = useMemo(() => {
    const occupied = new Set(openAdmissions.map((admission) => admission.bed).filter(Boolean));
    const wardId = Number(destinationWardId || 0);
    if (!wardId) return [];
    return beds
      .filter((bed) => bed.ward === wardId && (bed.active ?? false) && !occupied.has(bed.id) && bed.id !== record?.bed)
      .map((bed) => ({
        value: String(bed.id),
        label: `Cama ${bed.number || bed.id}`,
        hint: bed.ward_name || undefined,
      }));
  }, [beds, destinationWardId, openAdmissions, record?.bed]);

  useEffect(() => {
    if (!record || panel !== "transferir" || destinationWardId) return;
    setDestinationWardId(record.ward ? String(record.ward) : "");
  }, [destinationWardId, panel, record]);

  useEffect(() => {
    if (newBedId && !freeBedOptions.some((option) => option.value === newBedId)) setNewBedId("");
  }, [freeBedOptions, newBedId]);

  function openPanel(next: PanelKey) {
    setPanel((current) => (current === next ? null : next));
    setCondition("");
    setActionNotes("");
    setTransferMode("internal");
    setDestinationWardId(record?.ward ? String(record.ward) : "");
    setNewBedId("");
    setExternalHospital("");
    setTransferReason("");
    setFeedback(null);
    setError(null);
  }

  async function runAction(path: string, payload: Record<string, unknown>, success: string) {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<AdmissionRecord>(`/nursing/ward_admission/${record.id}/${path}/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPanel(null);
      // A transferência cria um novo internamento: seguir para ele.
      if (path === "transferir" && response?.id && response.id !== record.id) {
        router.push(`/nursing/ward-admissions/${response.id}`);
        return;
      }
      setFeedback(success);
      await load();
    } catch (e: any) {
      setError(e?.message || "Falha ao executar a ação.");
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = !record
    ? null
    : isOpen
      ? { label: "Internado", cls: "bg-violet-50 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300" }
      : { label: `Alta em ${formatDateTime(record.discharged_at)}`, cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" };

  const inputClass =
    "w-full rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm transition placeholder:text-muted-foreground hover:border-violet-400/60 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/10";
  const glassBtn =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15";

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-[95%] space-y-2 text-[0.9em]">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-violet-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-violet-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <User size={22} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate font-display text-xl font-bold text-foreground">
                    {record?.patient_name || "Internamento"}
                  </h1>
                  {statusBadge ? (
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {record?.custom_id || "—"}
                  {record?.ward_name ? ` · ${record.ward_name}` : ""}
                  {record?.bed_number ? ` · Cama ${record.bed_number}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOpen ? (
                <>
                  <button
                    type="button"
                    onClick={() => openPanel("alta")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700"
                  >
                    <LogOut size={13} /> Dar alta
                  </button>
                  <button type="button" onClick={() => openPanel("transferir")} className={glassBtn}>
                    <ArrowRightLeft size={13} /> Transferir
                  </button>
                  <button
                    type="button"
                    onClick={() => openPanel("obito")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-300/50 bg-rose-500/10 px-3 text-xs font-medium text-rose-700 shadow-sm backdrop-blur-sm transition hover:bg-rose-500/20 dark:border-rose-800/40 dark:text-rose-300"
                  >
                    <HeartPulse size={13} /> Registar óbito
                  </button>
                </>
              ) : null}
              {record ? (
                <Link href={`/nursing/ward-admissions/${record.id}/edit`} className={glassBtn}>
                  <Pencil size={13} /> Editar
                </Link>
              ) : null}
              <Link href={record?.ward ? `/nursing/ward/${record.ward}` : "/nursing/ward"} className={glassBtn}>
                <ArrowLeft size={13} /> Voltar
              </Link>
            </div>
          </div>

          {record ? (
            <div className="mt-2.5 grid gap-x-4 gap-y-2 border-t border-white/30 pt-2.5 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Admitido em</div>
                <div className="text-xs font-semibold text-foreground">{formatDateTime(record.admission_date)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Alta prevista</div>
                <div className="text-xs font-semibold text-foreground">{formatDateTime(record.expected_discharge_date)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observação estimada</div>
                <div className="text-xs font-semibold text-foreground">
                  {record.estimated_observation_hours ? `${record.estimated_observation_hours}h` : "—"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Alta efetiva</div>
                <div className="text-xs font-semibold text-foreground">{formatDateTime(record.discharged_at)}</div>
              </div>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {/* Painéis de ação inline */}
        {panel === "alta" && isOpen ? (
          <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-emerald-500" />
            <h2 className="mb-2 text-xs font-semibold text-foreground">Dar alta</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                placeholder="Condição na alta (opcional)"
                className={inputClass}
              />
              <input
                value={actionNotes}
                onChange={(event) => setActionNotes(event.target.value)}
                placeholder="Notas (opcional)"
                className={inputClass}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setPanel(null)} className={glassBtn}>Cancelar</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction("alta", { condition, notes: actionNotes }, "Alta registada.")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />} Confirmar alta
              </button>
            </div>
          </section>
        ) : null}

        {panel === "transferir" && isOpen ? (
          <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-violet-500" />
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold text-foreground">Transferir paciente</h2>
                <p className="text-[11px] text-muted-foreground">
                  Escolha se a transferência é interna, com nova enfermaria e cama/leito, ou para outro hospital.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-white/30 bg-white/30 p-0.5 text-[11px] shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
                <button
                  type="button"
                  onClick={() => setTransferMode("internal")}
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2.5 font-semibold transition ${transferMode === "internal" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Building2 size={12} /> Dentro do hospital
                </button>
                <button
                  type="button"
                  onClick={() => setTransferMode("external")}
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2.5 font-semibold transition ${transferMode === "external" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Building2 size={12} /> Outro hospital
                </button>
              </div>
            </div>

            {transferMode === "internal" ? (
              <div className="grid gap-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Enfermaria de destino</label>
                  <SearchableSelect
                    value={destinationWardId}
                    onChange={setDestinationWardId}
                    options={wardOptions}
                    placeholder="Escolha a enfermaria"
                    searchPlaceholder="Pesquisar enfermaria..."
                    emptyMessage="Nenhuma enfermaria ativa."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Pode ser a mesma enfermaria atual ou outra enfermaria do hospital.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cama/leito de destino</label>
                  <SearchableSelect
                    value={newBedId}
                    onChange={setNewBedId}
                    options={freeBedOptions}
                    disabled={!destinationWardId}
                    placeholder={destinationWardId ? "Escolha a cama livre" : "Escolha a enfermaria primeiro"}
                    searchPlaceholder="Pesquisar cama..."
                    emptyMessage="Sem camas livres nesta enfermaria."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {destinationWardId
                      ? freeBedOptions.length > 0
                        ? `${freeBedOptions.length} cama${freeBedOptions.length === 1 ? "" : "s"} livre${freeBedOptions.length === 1 ? "" : "s"} em ${destinationWard?.label || "destino"}.`
                        : "Não há cama livre/desocupada nesta enfermaria."
                      : "As camas disponíveis aparecem depois da seleção da enfermaria."}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Motivo</label>
                  <input
                    value={transferReason}
                    onChange={(event) => setTransferReason(event.target.value)}
                    placeholder="Motivo (opcional)"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hospital de destino</label>
                  <input
                    value={externalHospital}
                    onChange={(event) => setExternalHospital(event.target.value)}
                    placeholder="Nome do hospital de destino"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Transferência externa encerra este internamento sem ocupar cama interna.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Motivo</label>
                  <input
                    value={transferReason}
                    onChange={(event) => setTransferReason(event.target.value)}
                    placeholder="Motivo (opcional)"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="mt-2 grid gap-2 rounded-lg border border-violet-200/60 bg-violet-50/60 px-3 py-2 text-[11px] text-violet-900 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-200 sm:grid-cols-3">
              <div>
                <span className="font-semibold">Origem</span>
                <p>{record?.ward_name || "Enfermaria atual"} · Cama {record?.bed_number || "—"}</p>
              </div>
              <div>
                <span className="font-semibold">Destino</span>
                <p>
                  {transferMode === "internal"
                    ? destinationWard?.label || "Escolha a enfermaria"
                    : externalHospital || "Informe o hospital"}
                </p>
              </div>
              <div>
                <span className="font-semibold">Leito</span>
                <p>
                  {transferMode === "internal"
                    ? freeBedOptions.find((option) => option.value === newBedId)?.label || "Escolha a cama"
                    : "Externo"}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setPanel(null)} className={glassBtn}>Cancelar</button>
              <button
                type="button"
                disabled={busy || (transferMode === "internal" ? !newBedId : !externalHospital.trim())}
                onClick={() =>
                  runAction(
                    "transferir",
                    transferMode === "internal"
                      ? { new_bed: Number(newBedId), reason: transferReason }
                      : { external_hospital: externalHospital.trim(), reason: transferReason },
                    "Paciente transferido."
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-purple-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />} Confirmar transferência
              </button>
            </div>
          </section>
        ) : null}

        {panel === "obito" && isOpen ? (
          <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-rose-500" />
            <h2 className="mb-2 text-xs font-semibold text-foreground">Registar óbito</h2>
            <input
              value={actionNotes}
              onChange={(event) => setActionNotes(event.target.value)}
              placeholder="Notas (opcional)"
              className={inputClass}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setPanel(null)} className={glassBtn}>Cancelar</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction("registrar-obito", { notes: actionNotes }, "Óbito registado.")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:bg-rose-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <HeartPulse size={12} />} Confirmar óbito
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-1.5 py-6 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : record ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {/* Próxima medicação */}
            <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-amber-500" />
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Pill size={13} />
                </span>
                <h2 className="text-xs font-semibold text-foreground">Próxima medicação</h2>
              </div>
              {record.next_medication_at ? (
                <div className="space-y-0.5 text-xs text-foreground">
                  <div className="font-semibold">{formatDateTime(record.next_medication_at)}</div>
                  {record.next_medication_description ? (
                    <div className="text-muted-foreground">{record.next_medication_description}</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Sem medicação agendada.</div>
              )}
            </section>

            {/* Notas */}
            <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute left-0 top-0 h-full w-1.5 rounded-r-full bg-violet-500" />
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <BedDouble size={13} />
                </span>
                <h2 className="text-xs font-semibold text-foreground">Notas do internamento</h2>
              </div>
              {record.notes ? (
                <p className="whitespace-pre-wrap text-xs text-foreground-2">{record.notes}</p>
              ) : (
                <div className="text-[11px] text-muted-foreground">Sem notas.</div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            Internamento não encontrado.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
