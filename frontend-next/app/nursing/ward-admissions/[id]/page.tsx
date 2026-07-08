"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  BedDouble,
  Building2,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Loader2,
  LogOut,
  Pencil,
  Pill,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { apiFetch, apiFetchAll, apiFetchList } from "@/lib/api";
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

type ClinicalHistoryPayload = {
  cardex?: any[];
  requisicoes?: any[];
  consultations?: any[];
  procedures_enfermagem?: any[];
  internamentos_ward?: any[];
  vendas_farmacia?: any[];
  faturas?: any[];
  pagamentos?: any[];
  recibos?: any[];
};

type LargeSurgeryRow = {
  id: number;
  custom_id?: string | null;
  procedure?: string | null;
  procedure_names?: string[] | null;
  status?: string | null;
  scheduled_for?: string | null;
  completed_at?: string | null;
  ended_at?: string | null;
  started_at?: string | null;
  surgeon_name?: string | null;
  surgeon_names?: string[] | null;
  postoperative_diagnosis?: string | null;
};

type PanelKey = "alta" | "transferir" | "obito" | null;

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function joinValues(values: any[]): string {
  return values.map((value) => String(value ?? "").trim()).filter(Boolean).join(", ");
}

function readableValue(value: any): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return String(
      value.name ||
        value.nome ||
        value.label ||
        value.title ||
        value.description ||
        value.procedure ||
        value.custom_id ||
        value.id_custom ||
        value.id ||
        ""
    ).trim();
  }
  return String(value).trim();
}

function joinReadable(values: any[]): string {
  return values.map(readableValue).filter(Boolean).join(", ");
}

function readableList(value: any, maxItems = 3): string {
  const items = Array.isArray(value) ? value.map(readableValue).filter(Boolean) : readableValue(value) ? [readableValue(value)] : [];
  const visible = items.slice(0, maxItems);
  const suffix = items.length > maxItems ? ` +${items.length - maxItems}` : "";
  return `${visible.join(", ")}${suffix}`;
}

function surgeryStatusLabel(value?: string | null): string {
  const normalized = String(value || "").trim().toUpperCase();
  const labels: Record<string, string> = {
    SURGERY_COMPLETED: "Cirurgia realizada",
    COMPLETED: "Realizada",
    DONE: "Realizada",
    REALIZADA: "Realizada",
    SCHEDULED: "Agendada",
    SURGERY_SCHEDULED: "Agendada",
    CANCELED: "Cancelada",
    SURGERY_CANCELED: "Cancelada",
  };
  return labels[normalized] || readableValue(value);
}

function firstValue(item: any, keys: string[]): any {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}

function compactText(value: any, max = 110): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function HistoryCard({
  icon: Icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute left-0 top-0 h-full w-1.5 rounded-r-full ${accent}`} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/50 text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-300">
            <Icon size={13} />
          </span>
          <h2 className="truncate text-xs font-semibold text-foreground">{title}</h2>
        </div>
        {typeof count === "number" ? (
          <span className="shrink-0 rounded bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-white/10">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyHistory({ children = "Sem registos." }: { children?: React.ReactNode }) {
  return <div className="text-[11px] text-muted-foreground">{children}</div>;
}

function MiniTimeline({ items }: { items: Array<{ title: string; date?: string | null; meta?: string; href?: string }> }) {
  if (!items.length) return <EmptyHistory />;
  return (
    <div className="space-y-1.5">
      {items.slice(0, 6).map((item, index) => {
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{item.title}</div>
              {item.meta ? <div className="truncate text-[11px] text-muted-foreground">{item.meta}</div> : null}
            </div>
            <div className="shrink-0 text-right text-[10px] font-medium text-muted-foreground">
              {formatDateTime(item.date)}
            </div>
          </>
        );
        return item.href ? (
          <Link
            key={`${item.href}-${index}`}
            href={item.href}
            className="flex items-start gap-2 rounded-lg border border-white/20 bg-white/25 px-2 py-1.5 transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            {body}
          </Link>
        ) : (
          <div key={`${item.title}-${index}`} className="flex items-start gap-2 rounded-lg border border-white/20 bg-white/25 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
            {body}
          </div>
        );
      })}
    </div>
  );
}

function ProcedureListing({
  items,
}: {
  items: Array<{ procedure: string; status?: string; date?: string | null; href?: string }>;
}) {
  if (!items.length) return <EmptyHistory />;
  return (
    <div className="overflow-x-auto rounded-lg border border-white/25 bg-white/20 text-xs dark:border-white/10 dark:bg-white/5">
      <div className="grid min-w-[520px] grid-cols-[minmax(0,1.6fr)_minmax(92px,0.75fr)_minmax(98px,0.75fr)] gap-2 border-b border-white/25 bg-white/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-white/10 dark:bg-white/10">
        <span>Procedimento</span>
        <span>Estado</span>
        <span>Data</span>
      </div>
      <div className="divide-y divide-white/20 dark:divide-white/10">
        {items.slice(0, 8).map((item, index) => {
          const content = (
            <>
              <span className="min-w-0 truncate font-semibold text-foreground">{item.procedure}</span>
              <span className="min-w-0 truncate text-muted-foreground">{item.status || "—"}</span>
              <span className="min-w-0 truncate text-muted-foreground">{formatDateTime(item.date)}</span>
            </>
          );
          return item.href ? (
            <Link
              key={`${item.href}-${index}`}
              href={item.href}
              className="grid min-w-[520px] grid-cols-[minmax(0,1.6fr)_minmax(92px,0.75fr)_minmax(98px,0.75fr)] gap-2 px-2 py-1.5 transition hover:bg-white/40 dark:hover:bg-white/10"
            >
              {content}
            </Link>
          ) : (
            <div
              key={`${item.procedure}-${index}`}
              className="grid min-w-[520px] grid-cols-[minmax(0,1.6fr)_minmax(92px,0.75fr)_minmax(98px,0.75fr)] gap-2 px-2 py-1.5"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryPayload | null>(null);
  const [largeSurgeries, setLargeSurgeries] = useState<LargeSurgeryRow[]>([]);
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

  useEffect(() => {
    if (!record?.patient) {
      setClinicalHistory(null);
      setLargeSurgeries([]);
      return;
    }
    let mounted = true;
    async function loadPatientHistory() {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const patientId = Number(record.patient);
        const [history, surgeries] = await Promise.all([
          apiFetch<ClinicalHistoryPayload>(`/patients/${patientId}/clinical-history/?limit=80`, {
            clientCache: false,
            timeoutMs: 12000,
            retryOnTimeout: 0,
          }),
          apiFetchAll<LargeSurgeryRow>(`/surgery/large_surgery/?patient=${patientId}`, {
            pageSize: 80,
            maxPages: 5,
            clientCache: false,
          }),
        ]);
        if (!mounted) return;
        setClinicalHistory(history || null);
        setLargeSurgeries(surgeries || []);
      } catch (e: any) {
        if (!mounted) return;
        setClinicalHistory(null);
        setLargeSurgeries([]);
        setHistoryError(e?.message || "Falha ao carregar informação clínica do paciente.");
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    }
    loadPatientHistory();
    return () => {
      mounted = false;
    };
  }, [record?.patient]);

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
    if (newBedId && !freeBedOptions.some((option) => option.value === newBedId)) setNewBedId("");
  }, [freeBedOptions, newBedId]);

  function chooseDestinationWard(value: string) {
    setDestinationWardId(value);
    setNewBedId("");
  }

  function chooseTransferMode(mode: "internal" | "external") {
    setTransferMode(mode);
    setDestinationWardId("");
    setNewBedId("");
    setExternalHospital("");
  }

  function openPanel(next: PanelKey) {
    setPanel((current) => (current === next ? null : next));
    setCondition("");
    setActionNotes("");
    setTransferMode("internal");
    setDestinationWardId("");
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

  const cardex = useMemo(() => clinicalHistory?.cardex || [], [clinicalHistory]);
  const currentCardex = useMemo(
    () => cardex.filter((item) => !firstValue(item, ["fim_atendimento", "care_end_at", "ended_at"])).slice(0, 3),
    [cardex]
  );
  const pastCardex = useMemo(
    () => cardex.filter((item) => firstValue(item, ["fim_atendimento", "care_end_at", "ended_at"])).slice(0, 6),
    [cardex]
  );
  const requisitions = useMemo(() => clinicalHistory?.requisicoes || [], [clinicalHistory]);
  const procedures = useMemo(() => clinicalHistory?.procedures_enfermagem || [], [clinicalHistory]);
  const consultations = useMemo(() => clinicalHistory?.consultations || [], [clinicalHistory]);
  const admissions = useMemo(() => clinicalHistory?.internamentos_ward || [], [clinicalHistory]);
  const pharmacySales = useMemo(() => clinicalHistory?.vendas_farmacia || [], [clinicalHistory]);
  const financialRecords = useMemo(
    () => [
      ...(clinicalHistory?.faturas || []),
      ...(clinicalHistory?.pagamentos || []),
      ...(clinicalHistory?.recibos || []),
    ],
    [clinicalHistory]
  );

  const procedureRows = useMemo(
    () =>
      [
        ...largeSurgeries.map((surgery) => ({
          procedure: compactText(readableList(surgery.procedure_names, 2) || surgery.procedure || surgery.custom_id || `Cirurgia ${surgery.id}`, 90),
          status: surgeryStatusLabel(surgery.status),
          date: surgery.completed_at || surgery.ended_at || surgery.started_at || surgery.scheduled_for,
          href: `/surgery/large-surgeries/${surgery.id}`,
        })),
        ...procedures.map((procedure) => ({
          procedure: compactText(
            joinReadable([procedure.name || procedure.procedure_name || procedure.description, procedure.custom_id || procedure.id]) ||
              "Procedimento de enfermagem",
            90
          ),
          status: readableValue(procedure.status || procedure.estado || procedure.situacao),
          date: firstValue(procedure, ["data_realizacao", "performed_date", "created_at"]),
        })),
      ].sort((a, b) => {
        const aTime = new Date(a.date || 0).getTime();
        const bTime = new Date(b.date || 0).getTime();
        return bTime - aTime;
      }),
    [largeSurgeries, procedures]
  );

  const cardexItems = useMemo(
    () =>
      currentCardex.map((item) => ({
        title: compactText(joinValues([item.id_custom || item.custom_id || item.id, item.diagnostico || item.diagnosis]) || "Cardex atual", 90),
        date: firstValue(item, ["inicio_atendimento", "care_start_at", "created_at"]),
        meta: joinValues([item.medico_nome || item.doctor_name, item.estado || item.status, item.prescricao || item.prescription]),
      })),
    [currentCardex]
  );

  const pastCardexItems = useMemo(
    () =>
      pastCardex.map((item) => ({
        title: compactText(joinValues([item.id_custom || item.custom_id || item.id, item.diagnostico || item.diagnosis]) || "Cardex anterior", 90),
        date: firstValue(item, ["fim_atendimento", "care_end_at", "inicio_atendimento", "care_start_at", "created_at"]),
        meta: joinValues([item.medico_nome || item.doctor_name, item.estado || item.status, item.prescricao || item.prescription]),
      })),
    [pastCardex]
  );

  const examItems = useMemo(
    () =>
      requisitions.map((request) => ({
        title: compactText(
          joinValues([
            request.id_custom || request.custom_id || request.id,
            Array.isArray(request.itens)
              ? request.itens.map((item: any) => item.exame_nome || item.exame_medico_nome || item.exam_name || item.name).filter(Boolean).join(", ")
              : "",
          ]) || "Requisição de exames",
          90
        ),
        date: firstValue(request, ["criado_em", "created_at", "requested_at"]),
        meta: joinValues([request.tipo === "MED" ? "Exames médicos" : "Laboratório", request.estado || request.status, request.resultado || request.result]),
        href: request.id ? `/requests/${request.id}` : undefined,
      })),
    [requisitions]
  );

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
                  onClick={() => chooseTransferMode("internal")}
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2.5 font-semibold transition ${transferMode === "internal" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Building2 size={12} /> Dentro do hospital
                </button>
                <button
                  type="button"
                  onClick={() => chooseTransferMode("external")}
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
                    onChange={chooseDestinationWard}
                    options={wardOptions}
                    placeholder="Escolha a enfermaria"
                    searchPlaceholder="Pesquisar enfermaria..."
                    emptyMessage="Nenhuma enfermaria ativa."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Pode ser a mesma enfermaria atual ou outra enfermaria do hospital.
                  </p>
                </div>
                {destinationWardId ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cama/leito de destino</label>
                    <SearchableSelect
                      value={newBedId}
                      onChange={setNewBedId}
                      options={freeBedOptions}
                      placeholder="Escolha a cama livre"
                      searchPlaceholder="Pesquisar cama..."
                      emptyMessage="Sem camas livres nesta enfermaria."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {freeBedOptions.length > 0
                        ? `${freeBedOptions.length} cama${freeBedOptions.length === 1 ? "" : "s"} livre${freeBedOptions.length === 1 ? "" : "s"} em ${destinationWard?.label || "destino"}. Escolha uma cama para continuar.`
                        : "Não há cama livre/desocupada nesta enfermaria."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-violet-200/70 bg-white/25 px-3 py-2 text-[11px] text-muted-foreground dark:border-violet-800/40 dark:bg-white/5">
                    Escolha primeiro a enfermaria de destino para carregar as camas livres.
                  </div>
                )}
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
              <div className="rounded-lg border border-violet-200/70 bg-violet-50/45 px-3 py-2.5 shadow-sm dark:border-violet-800/40 dark:bg-violet-900/15">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                    <Building2 size={14} />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">Transferência para outro hospital</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Informe o hospital para onde o paciente será transferido.
                    </p>
                  </div>
                </div>
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

            <section className="lg:col-span-2">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-foreground">Informação clínica relacionada</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Procedimentos, cirurgias, cardex, exames, resultados e demais registos de saúde deste paciente.
                  </p>
                </div>
                {historyLoading ? (
                  <span className="inline-flex items-center gap-1 rounded bg-white/40 px-2 py-1 text-[10px] font-medium text-muted-foreground dark:bg-white/10">
                    <Loader2 size={11} className="animate-spin" /> A carregar
                  </span>
                ) : null}
              </div>

              {historyError ? (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                  {historyError}
                </div>
              ) : null}

              <div className="grid gap-2 xl:grid-cols-3">
                <HistoryCard
                  icon={ClipboardList}
                  title="Procedimentos e cirurgias realizadas"
                  count={procedureRows.length}
                  accent="bg-sky-500"
                >
                  <ProcedureListing items={procedureRows} />
                </HistoryCard>

                <HistoryCard icon={Pill} title="Cardex atual" count={currentCardex.length} accent="bg-amber-500">
                  <MiniTimeline items={cardexItems} />
                </HistoryCard>

                <HistoryCard icon={FileText} title="Cardex anteriores" count={pastCardex.length} accent="bg-violet-500">
                  <MiniTimeline items={pastCardexItems} />
                </HistoryCard>

                <HistoryCard icon={FlaskConical} title="Exames médicos/laboratoriais e resultados" count={examItems.length} accent="bg-emerald-500">
                  <MiniTimeline items={examItems} />
                </HistoryCard>

                <HistoryCard icon={HeartPulse} title="Consultas e internamentos" count={consultations.length + admissions.length} accent="bg-rose-500">
                  <MiniTimeline
                    items={[
                      ...consultations.map((consultation) => ({
                        title: compactText(joinValues([consultation.id_custom || consultation.custom_id || consultation.id, consultation.tipo || consultation.type]) || "Consulta", 90),
                        date: firstValue(consultation, ["agendada_para", "scheduled_for", "created_at"]),
                        meta: joinValues([consultation.medico_nome || consultation.doctor_name, consultation.estado || consultation.status]),
                      })),
                      ...admissions.map((admission) => ({
                        title: compactText(joinValues([admission.custom_id || admission.id, admission.ward_name || admission.enfermaria_nome]) || "Internamento", 90),
                        date: firstValue(admission, ["admission_date", "data_internamento", "created_at"]),
                        meta: joinValues([admission.bed_number ? `Cama ${admission.bed_number}` : admission.cama_numero ? `Cama ${admission.cama_numero}` : "", admission.active || admission.ativo ? "Ativo" : "Encerrado"]),
                      })),
                    ]}
                  />
                </HistoryCard>

                <HistoryCard icon={FileText} title="Farmácia e registos administrativos de saúde" count={pharmacySales.length + financialRecords.length} accent="bg-slate-500">
                  <MiniTimeline
                    items={[
                      ...pharmacySales.map((sale) => ({
                        title: compactText(joinValues([sale.custom_id || sale.id, "Farmácia"]) || "Dispensa de farmácia", 90),
                        date: firstValue(sale, ["sold_at", "created_at"]),
                        meta: joinValues([sale.status, sale.total ? `Total ${sale.total}` : ""]),
                      })),
                      ...financialRecords.map((item) => ({
                        title: compactText(joinValues([item.custom_id || item.id_custom || item.id, item.origem || item.origin || item.status]) || "Registo administrativo", 90),
                        date: firstValue(item, ["paid_at", "issued_at", "created_at"]),
                        meta: joinValues([item.status, item.total ? `Total ${item.total}` : item.amount ? `Valor ${item.amount}` : ""]),
                      })),
                    ]}
                  />
                </HistoryCard>
              </div>
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
