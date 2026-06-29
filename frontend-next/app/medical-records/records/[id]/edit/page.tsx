"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Calendar, Check, ClipboardList,
  FileText, Loader2, Search, Stethoscope, User, X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const FIELD =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition";

const LABEL = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

const STATUS_OPTIONS = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

type SearchResult = { id: number; name: string; custom_id?: string };

function SectionCard({
  title, subtitle, icon: Icon, accent, children,
}: {
  title: string; subtitle?: string; icon: typeof ClipboardList; accent: string; children: React.ReactNode;
}) {
  return (
    <section className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-3 flex items-start gap-2">
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function EntitySearch({
  label, placeholder, endpoint, value, onSelect, onClear,
}: {
  label: string; placeholder: string; endpoint: string;
  value: SearchResult | null; onSelect: (r: SearchResult) => void; onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLUListElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function calcPos() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    const card = inputRef.current.closest("section");
    const cr = card?.getBoundingClientRect() ?? r;
    setDropStyle({ position: "fixed", top: r.bottom + 4, left: cr.left, width: cr.width, zIndex: 9999 });
  }

  function onInput(val: string) {
    setQuery(val);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/${endpoint}?search=${encodeURIComponent(val)}&page_size=8`, { credentials: "include" });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : (data.results ?? []));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }

  function select(r: SearchResult) {
    onSelect(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  if (value) {
    return (
      <div>
        <label className={LABEL}>{label}</label>
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2">
          <span className="flex-1 text-sm font-medium text-foreground">{value.name}</span>
          {value.custom_id && <span className="text-[10px] text-muted-foreground">{value.custom_id}</span>}
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground transition">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={`${FIELD} pl-8 pr-8`}
          value={query}
          onChange={e => { calcPos(); onInput(e.target.value); }}
          onFocus={() => { calcPos(); if (query) setOpen(true); }}
        />
        {loading
          ? <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          : query && <button type="button" onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={13} /></button>
        }
      </div>
      {mounted && open && results.length > 0 && createPortal(
        <ul ref={dropRef} style={dropStyle}
          className="overflow-hidden rounded-xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/50">
          {results.map(r => (
            <li key={r.id} className="border-b border-white/10 last:border-0">
              <button type="button" onClick={() => select(r)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-white/20 dark:hover:bg-white/10">
                <User size={13} className="shrink-0 text-violet-500" />
                <span className="font-medium text-foreground">{r.name}</span>
                {r.custom_id && <span className="ml-auto text-[10px] text-muted-foreground">{r.custom_id}</span>}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
      {mounted && open && !loading && query && results.length === 0 && createPortal(
        <div style={dropStyle} className="rounded-xl border border-white/20 bg-white/70 px-4 py-3 text-sm text-muted-foreground shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-black/50">
          Sem resultados para {`"${query}"`}
        </div>,
        document.body
      )}
    </div>
  );
}

function toDatetimeLocal(val?: string | null) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  // format: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditRecordInner() {
  const params = useParams();
  const router = useRouter();
  const id = routeParamToString((params as any)?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patient, setPatient] = useState<SearchResult | null>(null);
  const [doctor, setDoctor] = useState<SearchResult | null>(null);
  const [status, setStatus] = useState("RASCUNHO");
  const [careStart, setCareStart] = useState("");
  const [careEnd, setCareEnd] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [medicalReport, setMedicalReport] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/medical_records/record/${id}/`);
      setStatus(data.status ?? "RASCUNHO");
      setCareStart(toDatetimeLocal(data.care_start_at));
      setCareEnd(toDatetimeLocal(data.care_end_at));
      setSymptoms(data.symptoms ?? "");
      setDiagnosis(data.diagnosis ?? "");
      setPrescription(data.prescription ?? "");
      setMedicalReport(data.medical_report ?? "");
      if (data.patient && data.patient_name) setPatient({ id: data.patient, name: data.patient_name });
      if (data.doctor && data.doctor_name) setDoctor({ id: data.doctor, name: data.doctor_name });
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar cardex.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patient) { setError("Selecione um paciente."); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        patient: patient.id,
        status,
        symptoms,
        diagnosis,
        prescription,
        medical_report: medicalReport,
      };
      if (doctor) body.doctor = doctor.id;
      if (careStart) body.care_start_at = careStart;
      if (careEnd) body.care_end_at = careEnd;

      await apiFetch(`/medical_records/record/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
      router.push(`/medical-records/records/${id}`);
    } catch (reason: any) {
      setError(reason?.message || "Erro ao guardar alterações.");
    } finally {
      setSaving(false);
    }
  }

  const backHref = `/medical-records/records/${id}`;

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="w-full space-y-2 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <ClipboardList size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Editar cardex</h1>
                <p className="text-[11px] text-muted-foreground">
                  {patient?.name ? `${patient.name} · ` : ""}Registo #{id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {saving ? "A guardar…" : "Guardar"}
              </button>
              <Link href={backHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                <ArrowLeft size={16} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Grelha de cards ── */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">

          <SectionCard title="Paciente e médico" subtitle="Titular do cardex e responsável clínico." icon={User} accent="bg-sky-500">
            <div className="space-y-3">
              <EntitySearch
                label="Paciente *"
                placeholder="Pesquisar paciente por nome…"
                endpoint="clinical/patient/"
                value={patient}
                onSelect={setPatient}
                onClear={() => setPatient(null)}
              />
              <EntitySearch
                label="Médico responsável"
                placeholder="Pesquisar médico por nome…"
                endpoint="human_resources/employee/"
                value={doctor}
                onSelect={setDoctor}
                onClear={() => setDoctor(null)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Período e estado" subtitle="Janela temporal do episódio clínico." icon={Calendar} accent="bg-teal-500">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={LABEL}>Início do atendimento</label>
                  <input type="datetime-local" className={FIELD} value={careStart} onChange={e => setCareStart(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Fim do atendimento</label>
                  <input type="datetime-local" className={FIELD} value={careEnd} onChange={e => setCareEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Estado</label>
                <select className={FIELD} value={status} onChange={e => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Sintomas" subtitle="Queixas relatadas pelo paciente." icon={Stethoscope} accent="bg-rose-500">
            <textarea rows={4} placeholder="Descreva os sintomas…" className={`${FIELD} resize-none`}
              value={symptoms} onChange={e => setSymptoms(e.target.value)} />
          </SectionCard>

          <SectionCard title="Prescrição" subtitle="Observações livres de prescrição." icon={FileText} accent="bg-emerald-500">
            <textarea rows={4} placeholder="Notas de prescrição…" className={`${FIELD} resize-none`}
              value={prescription} onChange={e => setPrescription(e.target.value)} />
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard title="Diagnóstico" subtitle="Hipótese diagnóstica." icon={BookOpen} accent="bg-indigo-500">
              <textarea rows={4} placeholder="Registe o diagnóstico…" className={`${FIELD} resize-none`}
                value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
            </SectionCard>
          </div>

        </div>

        {/* ── Relatório médico — largura total ── */}
        <SectionCard title="Relatório médico" subtitle="Notas clínicas, evolução e conclusões do episódio." icon={FileText} accent="bg-amber-500">
          <textarea rows={6} placeholder="Registe o relatório médico completo…" className={`${FIELD} resize-none`}
            value={medicalReport} onChange={e => setMedicalReport(e.target.value)} />
        </SectionCard>

      </form>
    </AppLayout>
  );
}

export default function MedicalRecordsRecordsEditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}>
      <EditRecordInner />
    </Suspense>
  );
}
