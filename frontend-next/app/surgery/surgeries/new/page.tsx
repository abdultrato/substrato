"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Loader2,
  Save,
  Scissors,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";
const lockedInputClass = `${inputClass} disabled:cursor-not-allowed disabled:bg-muted/70 disabled:text-muted-foreground disabled:opacity-80`;

const textareaClass =
  "min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";

type Option = {
  id: number;
  name?: string;
  custom_id?: string;
  code?: string;
  employee_code?: string;
  base_price?: string | number;
  vat_percentage?: string | number;
  applies_vat_by_default?: boolean;
  surgery_type?: string;
  room_type?: string;
  status?: string;
  active?: boolean;
  sterile?: boolean;
  capacity?: number;
  is_surgical?: boolean;
};

type FieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
};

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toApiDatetime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function labelFor(option?: Option | null) {
  if (!option) return "";
  return [option.name, option.custom_id || option.code || option.employee_code].filter(Boolean).join(" · ") || `#${option.id}`;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value || 0);
}

function toNumber(value: unknown) {
  const n = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Field({ label, children, hint, error }: FieldProps) {
  return (
    <label className="block space-y-0.5">
      <span className="whitespace-nowrap text-[10px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[9px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[9px] font-medium text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function Card({
  title,
  icon: Icon,
  children,
  accent = "bg-rose-500",
  className = "",
}: {
  title: string;
  icon: typeof Scissors;
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-1 px-2 py-1.5 pl-4">
        <div className="flex items-center gap-1 border-b border-border/40 pb-1">
          <Icon size={12} className="shrink-0 text-rose-500" />
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded border border-border/60 border-l-2 border-l-rose-500 bg-rose-500/5 px-1.5 py-0.5">
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-muted-foreground">{label}</div>
      <div className="break-words text-[11px] font-bold leading-tight text-foreground md:truncate">{value}</div>
    </div>
  );
}

function Picker({
  label,
  value,
  options,
  query,
  onQuery,
  onPick,
  placeholder,
  error,
  multiple = false,
  emptyLabel = "Nenhuma opção encontrada.",
}: {
  label: string;
  value: string;
  options: Option[];
  query: string;
  onQuery: (value: string) => void;
  onPick: (option: Option) => void;
  placeholder: string;
  error?: string;
  multiple?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const debounced = useDebounce(query, 150);
  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const rows = !q
      ? options
      : options.filter((item) =>
          [item.name, item.custom_id, item.code, item.employee_code, item.surgery_type, item.room_type]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
    return rows.slice(0, 12);
  }, [debounced, options]);

  function updateMenuRect() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuRect({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }

  function openMenu() {
    updateMenuRect();
    setOpen(true);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    const handle = () => updateMenuRect();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  const menu =
    open && mounted && menuRect
      ? createPortal(
          <div
            className="fixed z-[2147483647] max-h-48 overflow-auto rounded-md border border-white/20 bg-white/10 p-1 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10"
            style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
          >
            {visible.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-muted-foreground">{emptyLabel}</div>
            ) : (
              visible.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onPick(option);
                    onQuery(multiple ? "" : labelFor(option));
                    setOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1 text-left text-[11px] leading-tight hover:bg-muted"
                >
                  <span className="block truncate font-semibold text-foreground">{labelFor(option)}</span>
                  <span className="block truncate text-[9px] text-muted-foreground">
                    {[option.surgery_type, option.room_type, option.status, option.base_price ? `${money(toNumber(option.base_price))} MZN` : ""].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <Field label={label} error={error}>
      <div className="relative">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onFocus={openMenu}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            onQuery(event.target.value);
            openMenu();
          }}
          className={`${inputClass} pl-7`}
          placeholder={value || placeholder}
        />
        {menu}
      </div>
    </Field>
  );
}

export default function CreateSurgeryPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [rooms, setRooms] = useState<Option[]>([]);
  const [procedures, setProcedures] = useState<Option[]>([]);
  const [specialties, setSpecialties] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [surgeonIds, setSurgeonIds] = useState<number[]>([]);
  const [surgeonQuery, setSurgeonQuery] = useState("");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [roomQuery, setRoomQuery] = useState("");
  const [procedureIds, setProcedureIds] = useState<number[]>([]);
  const [selectedProcedureRows, setSelectedProcedureRows] = useState<Option[]>([]);
  const [procedureQuery, setProcedureQuery] = useState("");
  const debouncedProcedureQuery = useDebounce(procedureQuery, 250);
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [specialtyQuery, setSpecialtyQuery] = useState("");
  const [surgerySize, setSurgerySize] = useState("PEQUENA");
  const [priority, setPriority] = useState("ELECTIVE");
  const [classification, setClassification] = useState("AMBULATORY");
  const [status, setStatus] = useState("REQUESTED");
  const [scheduledFor, setScheduledFor] = useState(nowLocalInput());
  const [procedure, setProcedure] = useState("");
  const [preoperativeDiagnosis, setPreoperativeDiagnosis] = useState("");
  const [postoperativeDiagnosis, setPostoperativeDiagnosis] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [vatPercentage, setVatPercentage] = useState("5.00");
  const [appliesVat, setAppliesVat] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadRefs() {
      setLoadingRefs(true);
      try {
        const [patientRes, employeeRes, roomRes, procedureRes, specialtyRes] = await Promise.all([
          apiFetchList<Option>("/clinical/patient/", { page: 1, pageSize: 300 }),
          apiFetchList<Option>("/human_resources/employee/", { page: 1, pageSize: 300 }),
          apiFetchList<Option>("/surgery/centro_cirurgico/", {
            page: 1,
            pageSize: 200,
            query: { status: "AVAILABLE", sterile: "true" },
          }),
          apiFetchList<Option>("/surgery/surgical_procedure/", { page: 1, pageSize: 300, query: { is_surgical: "true" } }),
          apiFetchList<Option>("/consultations/specialty/", { page: 1, pageSize: 200 }),
        ]);
        if (!mounted) return;
        setPatients(patientRes.items);
        setEmployees(employeeRes.items);
        setRooms(roomRes.items.filter((room) => room.status === "AVAILABLE" && room.sterile !== false));
        setProcedures(procedureRes.items.filter((item) => item.active !== false && item.is_surgical !== false));
        setSpecialties(specialtyRes.items);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Não foi possível carregar os dados de apoio.");
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    }
    loadRefs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadProcedures() {
      try {
        const query: Record<string, string> = {
          for_surgery_size: surgerySize,
          is_surgical: "true",
        };
        if (debouncedProcedureQuery.trim()) query.search = debouncedProcedureQuery.trim();
        const { items } = await apiFetchList<Option>("/surgery/surgical_procedure/", {
          page: 1,
          pageSize: 50,
          query,
        });
        if (mounted) setProcedures(items.filter((item) => item.active !== false && item.is_surgical !== false));
      } catch {
        if (mounted) setProcedures([]);
      }
    }
    loadProcedures();
    return () => {
      mounted = false;
    };
  }, [debouncedProcedureQuery, surgerySize]);

  const selectedPatient = patients.find((item) => item.id === patientId) || null;
  const selectedSurgeons = employees.filter((item) => surgeonIds.includes(item.id));
  const selectedRoom = rooms.find((item) => item.id === roomId) || null;
  const selectedProcedures = selectedProcedureRows.filter((item) => procedureIds.includes(item.id));
  const procedureDrivenClassification = procedureIds.length > 0;
  const selectedSpecialty = specialties.find((item) => item.id === specialtyId) || null;
  const proceduresTotal = selectedProcedures.reduce((acc, item) => acc + toNumber(item.base_price), 0);
  const totalEstimate = toNumber(estimatedPrice) || proceduresTotal;
  const finalEstimate = appliesVat ? totalEstimate * (1 + toNumber(vatPercentage) / 100) : totalEstimate;
  const compatibleRooms = useMemo(() => rooms.filter((room) => {
    const type = room.room_type || "";
    if (surgerySize === "PEQUENA") return ["MINOR", "GENERAL", "OPERATING_ROOM", "OTHER"].includes(type);
    return ["MAJOR", "OPERATING_ROOM", "HYBRID", "EMERGENCY_OR", "GENERAL", "OTHER"].includes(type);
  }), [rooms, surgerySize]);

  useEffect(() => {
    if (roomId && !compatibleRooms.some((room) => room.id === roomId)) {
      setRoomId(null);
      setRoomQuery("");
    }
  }, [compatibleRooms, roomId]);

  function validate() {
    const next: Record<string, string> = {};
    if (!patientId) next.patient = "Selecione o paciente.";
    if (!procedure.trim() && procedureIds.length === 0) next.procedure = "Selecione procedimento ou descreva em texto livre.";
    if (!scheduledFor) next.scheduledFor = "Informe a data prevista.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: number }>("/surgery/surgery/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          specialty: specialtyId,
          surgeons: surgeonIds,
          operating_room: roomId,
          procedures: procedureIds,
          procedure: procedure.trim(),
          description: description.trim(),
          preoperative_diagnosis: preoperativeDiagnosis.trim(),
          postoperative_diagnosis: postoperativeDiagnosis.trim(),
          scheduled_for: toApiDatetime(scheduledFor),
          status,
          surgery_size: surgerySize,
          priority,
          classification,
          estimated_price: totalEstimate.toFixed(2),
          vat_percentage: vatPercentage,
          applies_vat_by_default: appliesVat,
        }),
      });
      router.push(`/surgery/surgeries/${created.id}/`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível criar a cirurgia.");
    } finally {
      setSaving(false);
    }
  }

  function toggleId(list: number[], id: number) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  function applyProcedureDefaults(chosen: Option[]) {
    if (chosen.length === 0) return;
    const hasLarge = chosen.some((item) => item.surgery_type === "GRANDE");
    const hasSmall = chosen.some((item) => item.surgery_type === "PEQUENA");
    if (hasLarge) {
      setSurgerySize("GRANDE");
      setClassification("MAJOR");
    } else if (hasSmall) {
      setSurgerySize("PEQUENA");
      setClassification("MINOR");
    }
    const priceTotal = chosen.reduce((sum, item) => sum + toNumber(item.base_price), 0);
    if (priceTotal > 0) setEstimatedPrice(priceTotal.toFixed(2));
    const vatSource = chosen.find((item) => item.vat_percentage !== undefined && item.vat_percentage !== null);
    if (vatSource) setVatPercentage(String(vatSource.vat_percentage));
    const vatFlagSource = chosen.find((item) => item.applies_vat_by_default !== undefined);
    if (vatFlagSource) setAppliesVat(vatFlagSource.applies_vat_by_default !== false);
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
              <Scissors size={14} />
            </span>
            <div className="min-w-[12rem] flex-1">
              <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">Nova cirurgia</h1>
              <p className="break-words text-[10px] leading-tight text-muted-foreground md:truncate">
                {selectedPatient ? labelFor(selectedPatient) : "Paciente por definir"} · {selectedProcedures.length || 0} procedimento(s)
              </p>
            </div>
            <span className="inline-flex h-7 shrink-0 items-center rounded border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
              {status === "REQUESTED" ? "Solicitada" : status === "AGENDADA" ? "Agendada" : "Rascunho"}
            </span>
            <Link
              href="/surgery/surgeries/"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
            >
              <ArrowLeft size={12} /> Voltar
            </Link>
            <button
              type="submit"
              disabled={saving || loadingRefs}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
            <HeaderMetric label="Porte" value={surgerySize === "PEQUENA" ? "Pequena" : "Grande"} />
            <HeaderMetric label="Prioridade" value={priority === "ELECTIVE" ? "Eletiva" : priority === "URGENT" ? "Urgente" : "Emergência"} />
            <HeaderMetric label="Sala" value={selectedRoom ? labelFor(selectedRoom) : "-"} />
            <HeaderMetric label="Cirurgiões" value={selectedSurgeons.length} />
            <HeaderMetric label="Prevista" value={scheduledFor ? new Date(scheduledFor).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"} />
            <HeaderMetric label="Total c/ IVA" value={money(finalEstimate)} />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Paciente e especialidade" icon={User} accent="bg-rose-500">
            <div className="grid grid-cols-1 gap-1 min-[620px]:grid-cols-2">
              <Picker label="Paciente" value={labelFor(selectedPatient)} options={patients} query={patientQuery} onQuery={setPatientQuery} onPick={(item) => setPatientId(item.id)} placeholder="Pesquisar paciente..." emptyLabel="Nenhum paciente encontrado." error={errors.patient} />
              <Picker label="Especialidade" value={labelFor(selectedSpecialty)} options={specialties} query={specialtyQuery} onQuery={setSpecialtyQuery} onPick={(item) => setSpecialtyId(item.id)} placeholder="Pesquisar especialidade..." emptyLabel="Nenhuma especialidade encontrada." />
            </div>
          </Card>

          <Card title="Equipa e sala" icon={Users} accent="bg-blue-500">
            <div className="grid grid-cols-1 gap-1 min-[620px]:grid-cols-2">
              <Picker
                label="Cirurgiões"
                value={selectedSurgeons.map(labelFor).join(", ")}
                options={employees}
                query={surgeonQuery}
                onQuery={setSurgeonQuery}
                onPick={(item) => setSurgeonIds((current) => toggleId(current, item.id))}
                placeholder="Pesquisar cirurgião..." emptyLabel="Nenhum cirurgião encontrado."
                multiple
              />
              <Picker
                label="Sala operatória"
                value={labelFor(selectedRoom)}
                options={compatibleRooms}
                query={roomQuery}
                onQuery={setRoomQuery}
                onPick={(item) => setRoomId(item.id)}
                placeholder="Pesquisar sala disponível..."
                emptyLabel="Nenhuma sala disponível para este porte."
              />
            </div>
            {selectedSurgeons.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedSurgeons.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSurgeonIds((current) => current.filter((id) => id !== item.id))} className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px]">
                    {labelFor(item)}
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card title="Classificação e data" icon={ShieldCheck} accent="bg-amber-500">
            <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-2 xl:grid-cols-4">
              <Field label="Porte">
                <select value={surgerySize} onChange={(event) => setSurgerySize(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="PEQUENA">Pequena</option>
                  <option value="GRANDE">Grande</option>
                </select>
              </Field>
              <Field label="Prioridade">
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="ELECTIVE">Eletiva</option>
                  <option value="URGENT">Urgente</option>
                  <option value="EMERGENCY">Emergência</option>
                </select>
              </Field>
              <Field label="Classificação">
                <select value={classification} onChange={(event) => setClassification(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification}>
                  <option value="AMBULATORY">Ambulatória</option>
                  <option value="DAY_SURGERY">Cirurgia de dia</option>
                  <option value="INPATIENT">Com internamento</option>
                  <option value="ELECTIVE">Eletiva</option>
                  <option value="EMERGENCY">Emergência</option>
                  <option value="MINOR">Pequena cirurgia</option>
                  <option value="MAJOR">Grande cirurgia</option>
                </select>
              </Field>
              <Field label="Agendada para" error={errors.scheduledFor}>
                <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Estado e faturação" icon={DollarSign} accent="bg-emerald-500">
            <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-2 xl:grid-cols-4">
              <Field label="Estado">
                <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="REQUESTED">Solicitada</option>
                  <option value="AGENDADA">Agendada</option>
                </select>
              </Field>
              <Field label="Preço estimado">
                <input type="number" step="0.01" value={estimatedPrice} onChange={(event) => setEstimatedPrice(event.target.value)} className={lockedInputClass} placeholder={money(proceduresTotal)} disabled={procedureDrivenClassification} />
              </Field>
              <Field label="IVA (%)">
                <input type="number" step="0.01" value={vatPercentage} onChange={(event) => setVatPercentage(event.target.value)} className={lockedInputClass} disabled={procedureDrivenClassification} />
              </Field>
              <Field label="Aplicar IVA">
                <button
                  type="button"
                  onClick={() => setAppliesVat((current) => !current)}
                  disabled={procedureDrivenClassification}
                  className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-80 ${appliesVat ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background/60 text-muted-foreground"}`}
                >
                  <CheckCircle2 size={13} /> {appliesVat ? "Sim" : "Não"}
                </button>
              </Field>
            </div>
          </Card>

          <Card title="Procedimentos" icon={Scissors} accent="bg-violet-500" className="md:col-span-2">
            <div className="grid grid-cols-1 gap-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Picker
                label="Catálogo"
                value={selectedProcedures.map(labelFor).join(", ")}
                options={procedures}
                query={procedureQuery}
                onQuery={setProcedureQuery}
                onPick={(item) => {
                  // O porte é derivado dos procedimentos escolhidos (GRANDE domina).
                  const next = toggleId(procedureIds, item.id);
                  setProcedureIds(next);
                  const known = [...selectedProcedureRows.filter((p) => p.id !== item.id), item];
                  const chosen = known.filter((p) => next.includes(p.id));
                  setSelectedProcedureRows(chosen);
                  applyProcedureDefaults(chosen);
                }}
                placeholder="Pesquisar procedimento..." emptyLabel="Nenhum procedimento encontrado."
                error={errors.procedure}
                multiple
              />
              <Field label="Procedimento em texto livre" error={errors.procedure}>
                <input value={procedure} onChange={(event) => setProcedure(event.target.value)} className={inputClass} placeholder="Use se não existir no catálogo" />
              </Field>
            </div>
            {selectedProcedures.length ? (
              <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-3">
                {selectedProcedures.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const next = procedureIds.filter((id) => id !== item.id);
                      const chosen = selectedProcedureRows.filter((row) => row.id !== item.id);
                      setProcedureIds(next);
                      setSelectedProcedureRows(chosen);
                      applyProcedureDefaults(chosen);
                    }}
                    className="rounded border border-border bg-background/50 px-2 py-1 text-left text-[10px] hover:bg-muted"
                  >
                    <span className="block truncate font-semibold">{labelFor(item)}</span>
                    <span className="block text-muted-foreground">{money(toNumber(item.base_price))} MZN · {item.surgery_type || "AMBAS"}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card title="Diagnóstico pré-operatório" icon={Stethoscope} accent="bg-sky-500">
            <Field label="Diagnóstico">
              <textarea value={preoperativeDiagnosis} onChange={(event) => setPreoperativeDiagnosis(event.target.value)} className={textareaClass} placeholder="Diagnóstico e indicação cirúrgica..." />
            </Field>
          </Card>

          <Card title="Descrição e notas" icon={ClipboardList} accent="bg-slate-500">
            <Field label="Descrição">
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} placeholder="Resumo clínico, requisitos de sala, material especial..." />
            </Field>
          </Card>

          <Card title="Pós-operatório" icon={CalendarClock} accent="bg-teal-500" className="md:col-span-2">
            <Field label="Diagnóstico pós-operatório">
              <textarea value={postoperativeDiagnosis} onChange={(event) => setPostoperativeDiagnosis(event.target.value)} className={textareaClass} placeholder="Opcional na criação; preencher depois da cirurgia se aplicável." />
            </Field>
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}
