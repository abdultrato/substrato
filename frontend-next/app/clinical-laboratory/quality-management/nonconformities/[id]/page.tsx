"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, FileText, FileWarning, Pencil, ShieldAlert, UserCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import {
  Nonconformity,
  Row,
  SEVERITY_BAR,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  SOURCE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  SectionCard,
  displayLabel,
  fmtDateTime,
  sectorLabel,
  splitRootCauseTrace,
} from "../_components";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

export default function NonconformityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Nonconformity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Nonconformity>(`/clinical_laboratory/nonconformity/${id}/`)
      .then(setRec)
      .catch((e) => setError(e?.message ?? "Erro ao carregar não conformidade."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Não conformidade não encontrada."}
        </div>
      </AppLayout>
    );
  }

  const bar = SEVERITY_BAR[rec.severity] ?? "bg-slate-400";
  const severity = SEVERITY_COLOR[rec.severity] ?? "border-border bg-muted text-foreground";
  const status = STATUS_COLOR[rec.status] ?? "border-border bg-muted text-foreground";
  const investigation = splitRootCauseTrace(rec.root_cause);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-1.5">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />
          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${severity} shadow-sm`}>
              <FileWarning size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/nonconformities" className="hover:underline">Não conformidades</Link>
                <span>/</span><span className="font-mono text-[9px]">{rec.code || rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{rec.description || "Não conformidade"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${severity}`}>{SEVERITY_LABEL[rec.severity] ?? rec.severity}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status}`}>{STATUS_LABEL[rec.status] ?? rec.status}</span>
                {rec.patient_impact && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">Impacto no paciente</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"><ArrowLeft size={13} /> Voltar</button>
              <Link href={`/clinical-laboratory/quality-management/nonconformities/${id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:from-rose-700 hover:to-orange-700"><Pencil size={13} /> Editar</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5 lg:grid-cols-2">
          <SectionCard icon={FileWarning} title="Identificação" accent="bg-rose-500">
            <Row label="Número">{rec.code || rec.custom_id}</Row>
            <Row label="Sector">{sectorLabel(rec) ?? "—"}</Row>
            <Row label="Origem">{SOURCE_LABEL[rec.source] ?? rec.source}</Row>
            <Row label="Referência">{rec.source_ref || "—"}</Row>
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Deteção" accent="bg-orange-500">
            <Row label="Detetada em">{fmtDateTime(rec.detected_at)}</Row>
            <Row label="Detetada por">{displayLabel(rec.detected_by_display) ?? (rec.detected_by ? `Utilizador #${rec.detected_by}` : "—")}</Row>
            <Row label="Impacto no paciente">{rec.patient_impact ? "Sim" : "Não"}</Row>
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard icon={FileText} title="Descrição" accent={bar}>
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.description || "Sem descrição."}</p>
            </SectionCard>
          </div>

          <SectionCard icon={ClipboardList} title="Ação imediata" accent="bg-amber-400">
            {rec.immediate_action ? <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.immediate_action}</p> : <p className="text-[11px] text-muted-foreground">Sem ação imediata registada.</p>}
          </SectionCard>

          <SectionCard icon={ShieldAlert} title="Causa raiz" accent="bg-slate-400">
            {investigation.rootCause ? <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{investigation.rootCause}</p> : <p className="text-[11px] text-muted-foreground">Sem causa raiz registada.</p>}
          </SectionCard>

          {investigation.traceability && (
            <div className="lg:col-span-2">
              <SectionCard icon={ClipboardList} title="Rastreabilidade da origem" accent="bg-red-500">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{investigation.traceability}</p>
              </SectionCard>
            </div>
          )}

          <SectionCard icon={UserCircle} title="Auditoria do registo" accent="bg-slate-400">
            <Row label="Criado em">{fmtDateTime(rec.created_at)}</Row>
            <Row label="Última atualização">{fmtDateTime(rec.updated_at)}</Row>
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
