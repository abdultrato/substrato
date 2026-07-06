"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, GaugeCircle, Pencil, Shield, Target, TrendingUp } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import {
  Indicator,
  Row,
  SectionCard,
  STATUS_BAR,
  STATUS_COLOR,
  STATUS_DOT,
  STATUS_LABEL,
  formatNumber,
  indicatorStatusLabel,
  progressPercent,
  sectorLabel,
} from "../_components";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

function fmtDateTime(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function QualityIndicatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Indicator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Indicator>(`/clinical_laboratory/quality_indicator/${id}/`)
      .then(setRec)
      .catch((e) => setError(e?.message ?? "Erro ao carregar indicador."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Indicador não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const bar = STATUS_BAR[rec.status] ?? "bg-slate-400";
  const sClr = STATUS_COLOR[rec.status] ?? "border-border bg-muted text-foreground";
  const sDot = STATUS_DOT[rec.status] ?? "bg-slate-400";
  const sLbl = indicatorStatusLabel(rec.status, rec.current_value, rec.target_value);
  const progress = progressPercent(rec.current_value, rec.target_value);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <GaugeCircle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/indicators" className="hover:underline">Indicadores</Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{rec.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} /> {sLbl}
                </span>
                {rec.period && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{rec.period}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/indicators/${id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <SectionCard icon={GaugeCircle} title="Identificação" accent="bg-emerald-500">
            <Row label="Código">{rec.custom_id}</Row>
            <Row label="Nome">{rec.name}</Row>
            <Row label="Sector">{sectorLabel(rec) ?? "—"}</Row>
            <Row label="Período">{rec.period || "—"}</Row>
          </SectionCard>

          <SectionCard icon={Target} title="Medição" accent="bg-teal-500">
            <Row label="Valor atual">{formatNumber(rec.current_value)}</Row>
            <Row label="Meta">{formatNumber(rec.target_value)}</Row>
            <Row label="Progresso">{progress !== null ? `${progress}% da meta` : "—"}</Row>
            {progress !== null && (
              <div className="pt-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className={`block h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : progress >= 80 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard icon={FileText} title="Fórmula" accent="bg-sky-500">
              {rec.formula ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.formula}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sem fórmula definida.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard icon={CalendarDays} title="Auditoria do registo" accent="bg-slate-400">
            <Row label="Criado em"><span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span></Row>
            <Row label="Última atualização"><span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span></Row>
          </SectionCard>

          <SectionCard icon={Shield} title="Estado do indicador" accent={bar}>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(STATUS_LABEL).map(([value, label]) => {
                const active = rec.status === value;
                const visibleLabel = active ? indicatorStatusLabel(value, rec.current_value, rec.target_value) : label;
                return (
                  <div key={value} className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] transition ${active ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                    <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                    <span className={`block pl-1.5 font-semibold ${active ? "" : "text-foreground"}`}>{visibleLabel}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
