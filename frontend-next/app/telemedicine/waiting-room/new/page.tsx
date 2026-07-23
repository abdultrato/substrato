"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MonitorCheck, ShieldCheck, Stethoscope, User, Video } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Option = { id: number; label: string };

const PRIORITIES = [
  { value: "ROUTINE", label: "Rotina" },
  { value: "PRIORITY", label: "Prioritário" },
  { value: "URGENT", label: "Urgente" },
  { value: "EMERGENCY", label: "Emergência" },
];

export default function TelemedicineWaitingRoomCreatePage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Option[]>([]);
  const [clinicians, setClinicians] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [patient, setPatient] = useState("");
  const [clinician, setClinician] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [deviceOk, setDeviceOk] = useState(false);
  const [consentOk, setConsentOk] = useState(false);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setOptionsLoading(true);
        const [pat, cli] = await Promise.all([
          apiFetchList<any>("/clinical/patient/", { page: 1, pageSize: 200, clientPaginate: true }),
          apiFetchList<any>("/human_resources/employee/", { page: 1, pageSize: 200, clientPaginate: true }),
        ]);
        if (!mounted) return;
        setPatients((pat.items || []).map((p: any) => ({ id: p.id, label: p.name || p.nome || p.custom_id || `#${p.id}` })));
        setClinicians((cli.items || []).map((c: any) => ({ id: c.id, label: c.name || c.nome || c.custom_id || `#${c.id}` })));
      } catch (e: any) {
        if (mounted) setError(e?.message || "Não foi possível carregar as opções.");
      } finally {
        if (mounted) setOptionsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canSubmit = useMemo(() => !!patient && !saving, [patient, saving]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) { setError("Selecione um paciente."); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        patient: Number(patient),
        priority,
        device_check_passed: deviceOk,
        consent_confirmed: consentOk,
      };
      if (clinician) body.clinician = Number(clinician);
      if (chiefComplaint.trim()) body.chief_complaint = chiefComplaint.trim();
      if (symptoms.trim()) body.preliminary_symptoms = symptoms.trim();
      if (videoUrl.trim()) body.video_room_url = videoUrl.trim();
      if (notes.trim()) body.notes = notes.trim();

      const res = await apiFetch<{ id: number }>("/telemedicine/waiting_room/", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      router.push(`/telemedicine/waiting-room/${res.id}`);
    } catch (e: any) {
      setError(e?.message || "Não foi possível registar o check-in.");
      setSaving(false);
    }
  }, [patient, clinician, priority, chiefComplaint, symptoms, videoUrl, deviceOk, consentOk, notes, router]);

  const inputCls = "h-9 w-full rounded-lg border border-slate-200 bg-white/80 px-2.5 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-900/70";
  const labelCls = "mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {/* Cabeçalho com voltar e submeter. */}
        <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-violet-600" />
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/telemedicine/waiting-room" title="Voltar à sala de espera" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={16} /></Link>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-700/75 dark:text-cyan-300/70"><Video size={11} /> Telemedicina</p>
              <h1 className="text-lg font-bold leading-tight text-foreground">Novo check-in na sala de espera</h1>
            </div>
            <button type="submit" disabled={!canSubmit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-700 hover:to-violet-700 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : null} Registar check-in</button>
          </div>
        </section>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

        <div className="grid gap-2 md:grid-cols-3">
          {/* Identificação. */}
          <section className="rounded-xl border border-border/60 bg-card/60 p-3 md:col-span-2">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Identificação</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelCls}><User size={11} className="mr-1 inline" />Paciente *</label>
                <select value={patient} onChange={(e) => setPatient(e.target.value)} required disabled={optionsLoading} className={inputCls}>
                  <option value="">{optionsLoading ? "A carregar…" : "Selecione o paciente"}</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><Stethoscope size={11} className="mr-1 inline" />Clínico</label>
                <select value={clinician} onChange={(e) => setClinician(e.target.value)} disabled={optionsLoading} className={inputCls}>
                  <option value="">Sem clínico atribuído</option>
                  {clinicians.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Prioridade</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}><Video size={11} className="mr-1 inline" />Sala virtual (URL)</label>
                <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" className={inputCls} />
              </div>
            </div>
          </section>

          {/* Prontidão. */}
          <section className="rounded-xl border border-border/60 bg-card/60 p-3">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Prontidão</h2>
            <div className="space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-xs transition hover:bg-muted/40">
                <input type="checkbox" checked={deviceOk} onChange={(e) => setDeviceOk(e.target.checked)} className="h-4 w-4 accent-cyan-600" />
                <MonitorCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">Teste de dispositivo aprovado</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-xs transition hover:bg-muted/40">
                <input type="checkbox" checked={consentOk} onChange={(e) => setConsentOk(e.target.checked)} className="h-4 w-4 accent-cyan-600" />
                <ShieldCheck size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium">Consentimento confirmado</span>
              </label>
            </div>
          </section>
        </div>

        {/* Informação clínica. */}
        <section className="rounded-xl border border-border/60 bg-card/60 p-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Informação clínica</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Queixa principal</label>
              <input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} maxLength={180} placeholder="Motivo principal da consulta" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sintomas preliminares</label>
              <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} placeholder="Descrição breve dos sintomas" className={`${inputCls} h-auto py-1.5`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas adicionais" className={`${inputCls} h-auto py-1.5`} />
            </div>
          </div>
        </section>
      </form>
    </AppLayout>
  );
}
