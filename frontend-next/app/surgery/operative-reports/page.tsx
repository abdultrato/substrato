"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  User,
  Stethoscope,
  CalendarClock,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Droplets,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente de revisão",
  SIGNED: "Assinado",
  FINAL: "Final",
  AMENDED: "Retificado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SIGNED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  FINAL: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  AMENDED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const STATUS_FILTER_OPTIONS = ["DRAFT", "PENDING_REVIEW", "SIGNED", "FINAL", "AMENDED", "CANCELLED"];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface OperativeReport {
  id: number;
  custom_id: string;
  status: string;
  procedure_performed: string;
  complications: string;
  estimated_blood_loss_ml: number;
  specimen_sent_to_pathology: boolean;
  pathology_accession_number: string;
  digitally_signed: boolean;
  signed_at: string | null;
  started_at: string | null;
  surgery_code?: string;
  patient_name?: string;
  primary_surgeon_name?: string;
}

function ReportCard({ r }: { r: OperativeReport }) {
  const statusLabel = STATUS_LABEL[r.status] ?? r.status;
  const statusCls = STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-600";
  const when = r.signed_at ?? r.started_at;

  return (
    <Link href={`/surgery/operative-reports/${r.id}`} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-4 transition-all duration-150 hover:border-violet-300 hover:shadow-md dark:hover:border-violet-600/40`}>
        {/* accent bar */}
        <span className="absolute left-0 top-0 h-full w-1 bg-violet-400 opacity-60 group-hover:opacity-100" />

        <div className="pl-3">
          {/* top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wide text-violet-600 dark:text-violet-400">
                  {r.custom_id}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                  {statusLabel}
                </span>
                {r.digitally_signed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <ShieldCheck size={10} /> Assinatura digital
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                {r.procedure_performed || "Relatório operatório"}
              </p>
            </div>
            <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
          </div>

          {/* detail row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--gray-500)]">
            {r.patient_name ? (
              <span className="flex items-center gap-1">
                <User size={10} className="shrink-0" />
                {r.patient_name}
              </span>
            ) : null}
            {r.primary_surgeon_name ? (
              <span className="flex items-center gap-1">
                <Stethoscope size={10} className="shrink-0" />
                {r.primary_surgeon_name}
              </span>
            ) : null}
            {when ? (
              <span className="flex items-center gap-1">
                <CalendarClock size={10} className="shrink-0" />
                {formatDate(when)}
              </span>
            ) : null}
          </div>

          {/* bottom row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {r.surgery_code ? (
              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-600 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                {r.surgery_code}
              </span>
            ) : null}
            {r.specimen_sent_to_pathology ? (
              <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <FlaskConical size={10} className="text-teal-500" />
                Patologia{r.pathology_accession_number ? ` · ${r.pathology_accession_number}` : ""}
              </span>
            ) : null}
            {r.complications ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle size={10} />
                Complicações
              </span>
            ) : null}
            {r.estimated_blood_loss_ml > 0 ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-[var(--gray-500)]">
                <Droplets size={10} className="text-rose-400" />
                {r.estimated_blood_loss_ml} ml
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function OperativeReportsListPage() {
  const [items, setItems] = useState<OperativeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [numFilter, setNumFilter] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusOpen]);

  const load = useCallback(async (q: string, status: string | null, num: string) => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ limit: "200" });
      if (q) p.set("search", q);
      if (status) p.set("status", status);
      if (num && /^\d{1,3}$/.test(num)) p.set("id", num);
      const d = await apiFetch<any>(`/surgery/relatorio_operatorio/?${p}`);
      setItems(d.results ?? d);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load("", null, ""); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter, numFilter), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, numFilter, load]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-1 py-1">

        {/* header */}
        <section className={`relative z-10 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="px-3 py-2 pl-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Relatórios operatórios</span>
                </div>
                <h1 className="font-display text-sm font-semibold text-foreground">Relatórios operatórios</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/operative-reports/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <Plus size={11} /> Novo relatório
                </Link>
              </div>
            </div>

            <div className="mt-2 border-t border-white/20 dark:border-white/10" />

            {/* search + estado + num */}
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Pesquisar por código, cirurgia, paciente ou cirurgião..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* estado dropdown */}
              <div ref={statusRef} className="relative z-20 shrink-0">
                <button type="button" onClick={() => setStatusOpen(v => !v)}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
                    statusFilter
                      ? (STATUS_COLOR[statusFilter] ?? "bg-card border-border text-foreground") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-violet-300 hover:text-violet-600"
                  }`}>
                  {statusFilter ? STATUS_LABEL[statusFilter] : "Estado"}
                  <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 rounded-xl border border-border bg-card shadow-xl">
                    {statusFilter && (
                      <button type="button"
                        onClick={() => { setStatusFilter(null); setStatusOpen(false); }}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
                        × Limpar filtro
                      </button>
                    )}
                    {STATUS_FILTER_OPTIONS.map(s => {
                      const active = statusFilter === s;
                      return (
                        <button key={s} type="button"
                          onClick={() => { setStatusFilter(active ? null : s); setStatusOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                            active ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-900/20" : "hover:bg-muted"
                          }`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[s]?.match(/bg-\S+/)?.[0] ?? "bg-gray-300"}`} />
                          <span className="flex-1">{STATUS_LABEL[s] ?? s}</span>
                          {active && <span className="text-[10px] text-violet-500">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                type="number" min="1" max="999"
                className="w-16 shrink-0 rounded-lg border border-border bg-card/60 py-1.5 px-2 text-[12px] text-center text-foreground placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Nº"
                value={numFilter}
                onChange={e => setNumFilter(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--gray-500)]">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} />{error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--gray-400)]">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            Nenhum relatório operatório encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map(r => <ReportCard key={r.id} r={r} />)}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
