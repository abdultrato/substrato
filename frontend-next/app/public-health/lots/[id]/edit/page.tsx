"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  PackageCheck,
  Save,
  Search,
  Snowflake,
  Syringe,
  Thermometer,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

const STATUSES = [
  { value: "RECEIVED",    label: "Recebido",   emoji: "📦", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",   glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",       blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  { value: "ACTIVE",      label: "Ativo",      emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",  glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30", blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"    },
  { value: "QUARANTINED", label: "Quarentena", emoji: "🚧", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600",  glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",   blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  { value: "DEPLETED",    label: "Esgotado",   emoji: "🔻", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",         grad: "from-slate-400 to-slate-600",   glow: "shadow-slate-400/20",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/20",     blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"   },
  { value: "EXPIRED",     label: "Expirado",   emoji: "⌛", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                 grad: "from-red-500 to-rose-600",      glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"    },
  { value: "RECALLED",    label: "Recolhido",  emoji: "↩️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",             grad: "from-rose-500 to-red-600",      glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",             blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"     },
];

const COLD_CHAIN = [
  { value: "OK",      label: "Conforme",     emoji: "❄️", chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300"           },
  { value: "WARNING", label: "Atenção",      emoji: "⚠️", chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  { value: "BREACH",  label: "Quebra",       emoji: "🔥", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"             },
  { value: "UNKNOWN", label: "Desconhecido", emoji: "❓", chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300" },
];

const STORAGE_LOCATIONS = [
  "Câmara fria central - Prateleira A", "Câmara fria central - Prateleira B",
  "Frigorífico de vacinas - Sala 1", "Frigorífico de vacinas - Sala 2",
  "Ultracongelador -70°C", "Arca congeladora -20°C", "Caixa térmica de transporte",
  "Depósito regional de imunização",
];

const T_VACCINE: RelationTarget = { endpoint: "/public_health/vaccine/", labelFields: ["name", "disease", "code"] };

// ── Inline RelationSelect ─────────────────────────────────────────────────────
function RelationSelect({ value, onChange, target, placeholder, initialLabel }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; initialLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState(initialLabel ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();
  useEffect(() => { if (initialLabel) setLabel(initialLabel); }, [initialLabel]);

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }
  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-sky-400 transition hover:text-sky-600"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhuma vacina encontrada."}</p>
                : <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">{opt.label}</button>
                      </li>
                    ))}
                  </ul>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Design helpers ────────────────────────────────────────────────────────────
function SuggestInput({ value, onChange, suggestions, placeholder, zIndex = "z-[997]" }: {
  value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string; zIndex?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative">
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
      />
      {open && filtered.length > 0 && (
        <ul className={`absolute left-0 right-0 top-full mt-0.5 rounded-lg border border-border bg-card shadow-lg ${zIndex} max-h-44 overflow-y-auto`}>
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EditLotPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId, setCustomId] = useState("");

  const [vaccineId, setVaccineId] = useState<number | null>(null);
  const [vaccineLabel, setVaccineLabel] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [officialBatch, setOfficialBatch] = useState("");
  const [status, setStatus] = useState("RECEIVED");
  const [expirationDate, setExpirationDate] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [dosesReceived, setDosesReceived] = useState("");
  const [dosesAvailable, setDosesAvailable] = useState("");
  const [reservedDoses, setReservedDoses] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [storageTemp, setStorageTemp] = useState("");
  const [coldChain, setColdChain] = useState("OK");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, any>>(`/public_health/lot/${id}/`)
      .then((d) => {
        setCustomId(d.custom_id ?? "");
        setVaccineId(d.vaccine ?? null);
        setVaccineLabel(d.vaccine_name ?? (d.vaccine ? `Vacina #${d.vaccine}` : ""));
        setLotNumber(d.lot_number ?? "");
        setOfficialBatch(d.official_batch_code ?? "");
        setStatus(d.status ?? "RECEIVED");
        setExpirationDate(d.expiration_date ?? "");
        setReceivedAt(d.received_at ?? "");
        setDosesReceived(d.doses_received != null ? String(d.doses_received) : "");
        setDosesAvailable(d.doses_available != null ? String(d.doses_available) : "");
        setReservedDoses(d.reserved_doses != null ? String(d.reserved_doses) : "");
        setStorageLocation(d.storage_location ?? "");
        setStorageTemp(d.storage_temperature_c != null ? String(d.storage_temperature_c) : "");
        setColdChain(d.cold_chain_status ?? "OK");
        setNotes(d.notes ?? "");
      })
      .catch(() => setSaveError("Erro ao carregar lote."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const activeStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];
  const activeCold = COLD_CHAIN.find((c) => c.value === coldChain) ?? COLD_CHAIN[0];

  function validate() {
    const e: Record<string, string> = {};
    if (!vaccineId) e.vaccine = "Vacina é obrigatória.";
    if (!lotNumber.trim()) e.lot_number = "Número do lote é obrigatório.";
    if (!expirationDate) e.expiration_date = "Validade é obrigatória.";
    const rec = Number(dosesReceived || 0);
    const avail = Number(dosesAvailable || 0);
    const resv = Number(reservedDoses || 0);
    if (avail > rec && dosesReceived) e.doses_available = "Doses disponíveis não podem exceder as recebidas.";
    if (resv > avail && dosesAvailable) e.reserved_doses = "Doses reservadas não podem exceder as disponíveis.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        vaccine: vaccineId,
        lot_number: lotNumber.trim(),
        official_batch_code: officialBatch.trim(),
        status,
        expiration_date: expirationDate,
        cold_chain_status: coldChain,
        storage_location: storageLocation.trim(),
        notes: notes.trim(),
      };
      if (receivedAt) body.received_at = receivedAt;
      if (dosesReceived.trim()) body.doses_received = Number(dosesReceived);
      if (dosesAvailable.trim()) body.doses_available = Number(dosesAvailable);
      if (reservedDoses.trim()) body.reserved_doses = Number(reservedDoses);
      body.storage_temperature_c = storageTemp.trim() ? Number(storageTemp) : null;

      await apiFetch(`/public_health/lot/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      router.push(`/public-health/lots/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
    } finally { setSaving(false); }
  }

  if (loadingData) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeStatus.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeStatus.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeStatus.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeStatus.grad} shadow-md ${activeStatus.glow}`}>
              <PackageCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Lotes</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {vaccineLabel ? `Editar — ${vaccineLabel}${lotNumber ? ` · ${lotNumber}` : ""}` : "Editar lote de vacina"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeStatus.chip}`}>
                  {activeStatus.emoji} {activeStatus.label}
                </span>
                <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${activeCold.chip}`}>
                  {activeCold.emoji} {activeCold.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeStatus.btn}`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar alterações
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={Syringe} title="Vacina e identificação" accent="bg-sky-500">
            <Field label="Vacina" required error={errors.vaccine}>
              <RelationSelect target={T_VACCINE} value={vaccineId}
                onChange={(id2, lbl) => { setVaccineId(id2); setVaccineLabel(lbl); if (id2) setErrors((p) => ({ ...p, vaccine: "" })); }}
                placeholder="Procurar vacina por nome, doença ou código…"
                initialLabel={vaccineLabel || undefined} />
            </Field>
            <Field label="Número do lote" required error={errors.lot_number}>
              <input type="text" value={lotNumber}
                onChange={(e) => { setLotNumber(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, lot_number: "" })); }}
                placeholder="Ex.: HEPB-2401" className={inputCls} />
            </Field>
            <Field label="Código oficial do lote" hint="Código atribuído pela autoridade / fabricante">
              <input type="text" value={officialBatch} onChange={(e) => setOfficialBatch(e.target.value)}
                placeholder="Ex.: OFF-HEPB-2401" className={inputCls} />
            </Field>
          </Card>

          {/* Estado e validade */}
          <Card icon={CalendarDays} title="Estado e validade" accent={activeStatus.bar}>
            <Field label="Estado">
              <div className="grid grid-cols-3 gap-1">
                {STATUSES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                    className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${status === s.value ? `${s.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <span className="mr-0.5">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Validade" required error={errors.expiration_date}>
                <input type="date" value={expirationDate}
                  onChange={(e) => { setExpirationDate(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, expiration_date: "" })); }}
                  className={inputCls} />
              </Field>
              <Field label="Recebido em">
                <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* Doses */}
          <Card icon={PackageCheck} title="Doses" accent="bg-indigo-500">
            <div className="grid grid-cols-3 gap-2">
              <Field label="Recebidas">
                <input type="number" min={0} value={dosesReceived}
                  onChange={(e) => setDosesReceived(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Disponíveis" error={errors.doses_available}>
                <input type="number" min={0} value={dosesAvailable}
                  onChange={(e) => setDosesAvailable(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Reservadas" error={errors.reserved_doses}>
                <input type="number" min={0} value={reservedDoses}
                  onChange={(e) => setReservedDoses(e.target.value)} placeholder="0" className={inputCls} />
              </Field>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Disponíveis ≤ recebidas · reservadas ≤ disponíveis.
            </p>
          </Card>

          {/* Armazenamento e cadeia fria */}
          <Card icon={Snowflake} title="Armazenamento e cadeia fria" accent="bg-cyan-500">
            <Field label="Local de armazenamento">
              <SuggestInput value={storageLocation} onChange={setStorageLocation}
                suggestions={STORAGE_LOCATIONS} placeholder="Ex.: Câmara fria central…" zIndex="z-[996]" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Temperatura atual (°C)" hint="Fora do intervalo marca quebra de cadeia fria">
                <div className="relative">
                  <Thermometer size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" step="0.01" value={storageTemp}
                    onChange={(e) => setStorageTemp(e.target.value)} placeholder="Ex.: 4.5"
                    className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                </div>
              </Field>
              <Field label="Cadeia fria">
                <div className="grid grid-cols-2 gap-1">
                  {COLD_CHAIN.map((c) => (
                    <button key={c.value} type="button" onClick={() => setColdChain(c.value)}
                      className={`rounded-lg border py-1.5 text-[10px] font-medium transition ${coldChain === c.value ? `${c.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                      <span className="mr-0.5">{c.emoji}</span>{c.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>

          {/* Observações */}
          <div className="lg:col-span-2">
            <Card icon={CalendarDays} title="Observações" accent="bg-slate-400">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Notas sobre condições de transporte, recolha, incidentes…"
                className={inputCls} />
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
