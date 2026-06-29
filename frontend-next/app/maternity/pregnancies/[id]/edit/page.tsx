"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Baby, BedDouble, Calendar, ClipboardList, Heart, Loader2, Save, Search, Stethoscope, User, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

// ── EntitySearch ─────────────────────────────────────────────────────────────
type EntityOption = { id: number; name: string; label?: string };

function EntitySearch({
  label, placeholder, endpoint, value, onChange, icon: Icon, accent,
}: {
  label: string; placeholder: string; endpoint: string;
  value: EntityOption | null; onChange: (v: EntityOption | null) => void;
  icon: React.ElementType; accent: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!query.trim()) { setOptions([]); return; }
    let cancelled = false;
    setLoading(true);
    apiFetch<any>(`${endpoint}?search=${encodeURIComponent(query)}&page_size=10`)
      .then(d => { if (!cancelled) setOptions(Array.isArray(d) ? d : (d.results ?? [])); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, endpoint]);

  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function openDrop() {
    if (!inputRef.current) return;
    const card = inputRef.current.closest("section");
    const rect = (card ?? inputRef.current).getBoundingClientRect();
    setDropStyle({ position: "fixed", top: inputRef.current.getBoundingClientRect().bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    setOpen(true);
  }

  function select(opt: EntityOption) {
    onChange(opt);
    setQuery("");
    setOpen(false);
  }

  const displayName = (opt: EntityOption) => opt.label ?? opt.name ?? `#${opt.id}`;

  return (
    <div ref={wrapRef}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <Icon size={13} className={accent} />
          <span className="flex-1 text-sm text-foreground">{displayName(value)}</span>
          <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input ref={inputRef} type="text" placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
            value={query} onChange={e => { setQuery(e.target.value); openDrop(); }} onFocus={openDrop} />
          {loading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      )}
      {mounted && open && options.length > 0 && createPortal(
        <ul style={dropStyle} className="rounded-lg border border-border bg-popover shadow-xl">
          {options.map(opt => (
            <li key={opt.id}>
              <button type="button" onMouseDown={() => select(opt)}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition">
                {displayName(opt)}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

// ── StringSearch: busca API mas guarda string (não FK) ───────────────────────
function StringSearch({
  label, placeholder, endpoint, labelKey = "name", value, onChange, icon: Icon, accent,
}: {
  label: string; placeholder: string; endpoint: string; labelKey?: string;
  value: string; onChange: (v: string) => void;
  icon: React.ElementType; accent: string;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query.trim()) { setOptions([]); return; }
    let cancelled = false;
    setLoading(true);
    apiFetch<any>(`${endpoint}?search=${encodeURIComponent(query)}&page_size=10`)
      .then(d => { if (!cancelled) setOptions(Array.isArray(d) ? d : (d.results ?? [])); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, endpoint]);

  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function openDrop() {
    if (!inputRef.current) return;
    const card = inputRef.current.closest("section");
    const rect = (card ?? inputRef.current).getBoundingClientRect();
    setDropStyle({ position: "fixed", top: inputRef.current.getBoundingClientRect().bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    setOpen(true);
  }

  function select(opt: any) {
    const val = String(opt[labelKey] ?? opt.name ?? opt.number ?? "");
    onChange(val);
    setQuery(val);
    setOpen(false);
  }

  return (
    <div ref={wrapRef}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      <div className="relative">
        <Icon size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${accent}`} />
        <input ref={inputRef} type="text" placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); openDrop(); }}
          onFocus={openDrop}
        />
        {loading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {!loading && query && (
          <button type="button" onClick={() => { setQuery(""); onChange(""); setOptions([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>
      {mounted && open && options.length > 0 && createPortal(
        <ul style={dropStyle} className="rounded-lg border border-border bg-popover shadow-xl">
          {options.map((opt, i) => {
            const display = String(opt[labelKey] ?? opt.name ?? opt.number ?? `#${opt.id}`);
            return (
              <li key={opt.id ?? i}>
                <button type="button" onMouseDown={() => select(opt)}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition">
                  {display}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, accent, children }: {
  title: string; icon: React.ElementType; accent: string; children: React.ReactNode;
}) {
  return (
    <section className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-3 flex items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.replace("-500", "-500/15")} ${accent.replace("bg-", "text-")}`}>
            <Icon size={12} />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MaternityPregnanciesEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = routeParamToString((params as any)?.id);

  const [patient, setPatient] = useState<EntityOption | null>(null);
  const [doctor, setDoctor] = useState<EntityOption | null>(null);
  const [lmp, setLmp] = useState("");
  const [edd, setEdd] = useState("");
  const [nursery, setNursery] = useState("");
  const [bed, setBed] = useState("");
  const [totalDel, setTotalDel] = useState("");
  const [normalDel, setNormalDel] = useState("");
  const [cesareans, setCesareans] = useState("");
  const [status, setStatus] = useState("ACOMP");
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<any>(`/maternity/gestacao/${id}/`)
      .then((d) => {
        if (cancelled) return;
        setCode(d.custom_id || `Gestação #${id}`);
        if (d.patient) setPatient({ id: d.patient, name: d.patient_name || `#${d.patient}` });
        if (d.responsible_doctor) setDoctor({ id: d.responsible_doctor, name: d.responsible_doctor_name || `#${d.responsible_doctor}` });
        setLmp(d.last_menstrual_period_date || "");
        setEdd(d.expected_delivery_date || "");
        setNursery(d.nursery || "");
        setBed(d.maternity_bed || "");
        setTotalDel(d.total_deliveries != null ? String(d.total_deliveries) : "");
        setNormalDel(d.normal_deliveries != null ? String(d.normal_deliveries) : "");
        setCesareans(d.cesareans != null ? String(d.cesareans) : "");
        setStatus(d.status || "ACOMP");
        setNotes(d.notes || "");
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || "Falha ao carregar a gestação."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) { setError("Selecione um paciente."); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        patient: patient.id,
        responsible_doctor: doctor ? doctor.id : null,
        last_menstrual_period_date: lmp || null,
        expected_delivery_date: edd || null,
        nursery: nursery || "",
        maternity_bed: bed || "",
        total_deliveries: totalDel ? Number(totalDel) : null,
        normal_deliveries: normalDel ? Number(normalDel) : null,
        cesareans: cesareans ? Number(cesareans) : null,
        status,
        notes: notes || "",
      };

      await apiFetch(`/maternity/gestacao/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      router.push(`/maternity/pregnancies/${id}`);
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar a gestação.");
    } finally {
      setSaving(false);
    }
  }

  const requiredGroups = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL];

  if (loading) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <form onSubmit={handleSubmit} className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-pink-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20">
                <Baby size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight text-foreground">Editar gestação</h1>
                <p className="text-[11px] text-muted-foreground">{code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push(`/maternity/pregnancies/${id}`)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                <ArrowLeft size={14} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-500/20 transition hover:opacity-90 disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> A guardar…</> : <><Save size={14} /> Guardar alterações</>}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Row 1: Paciente + Médico ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SectionCard title="Paciente" icon={User} accent="bg-pink-500">
            <EntitySearch
              label="Paciente *" placeholder="Pesquisar paciente…"
              endpoint="/clinical/patient/" value={patient} onChange={setPatient}
              icon={User} accent="text-pink-500"
            />
          </SectionCard>
          <SectionCard title="Médico responsável" icon={Stethoscope} accent="bg-violet-500">
            <EntitySearch
              label="Médico / Ginecologista" placeholder="Pesquisar médico…"
              endpoint="/human_resources/employee/" value={doctor} onChange={setDoctor}
              icon={Stethoscope} accent="text-violet-500"
            />
          </SectionCard>
        </div>

        {/* ── Row 2: Datas + Estado ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <SectionCard title="Data última menstruação" icon={Calendar} accent="bg-rose-500">
            <Field label="DUM">
              <input type="date" className={inputCls} value={lmp} onChange={e => setLmp(e.target.value)} />
            </Field>
          </SectionCard>
          <SectionCard title="Data prevista do parto" icon={Calendar} accent="bg-indigo-500">
            <Field label="DPP">
              <input type="date" className={inputCls} value={edd} onChange={e => setEdd(e.target.value)} />
            </Field>
          </SectionCard>
          <SectionCard title="Estado" icon={ClipboardList} accent="bg-emerald-500">
            <Field label="Estado da gestação">
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="ACOMP">Em acompanhamento</option>
                <option value="PARTO">Parto</option>
                <option value="ENCERR">Encerrada</option>
                <option value="CANCEL">Cancelada</option>
              </select>
            </Field>
          </SectionCard>
        </div>

        {/* ── Row 3: Berçário + Cama ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SectionCard title="Berçário" icon={BedDouble} accent="bg-sky-500">
            <StringSearch
              label="Berçário / Ala / Sala" placeholder="Pesquisar enfermaria…"
              endpoint="/nursing/ward/" labelKey="name"
              value={nursery} onChange={setNursery}
              icon={BedDouble} accent="text-sky-500"
            />
          </SectionCard>
          <SectionCard title="Cama" icon={BedDouble} accent="bg-teal-500">
            <StringSearch
              label="Cama na maternidade" placeholder="Pesquisar cama…"
              endpoint="/nursing/ward_bed/" labelKey="number"
              value={bed} onChange={setBed}
              icon={BedDouble} accent="text-teal-500"
            />
          </SectionCard>
        </div>

        {/* ── Row 4: Histórico obstétrico ── */}
        <SectionCard title="Histórico obstétrico" icon={Heart} accent="bg-rose-500">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Partos totais">
              <input type="number" min={0} className={inputCls} placeholder="0" value={totalDel} onChange={e => setTotalDel(e.target.value)} />
            </Field>
            <Field label="Partos normais">
              <input type="number" min={0} className={inputCls} placeholder="0" value={normalDel} onChange={e => setNormalDel(e.target.value)} />
            </Field>
            <Field label="Cesarianas">
              <input type="number" min={0} className={inputCls} placeholder="0" value={cesareans} onChange={e => setCesareans(e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        {/* ── Observações ── */}
        <SectionCard title="Observações" icon={ClipboardList} accent="bg-slate-500">
          <textarea rows={3} className={inputCls} placeholder="Notas clínicas relevantes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </SectionCard>

      </form>
    </AppLayout>
  );
}
