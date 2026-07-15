"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  Scissors,
  User,
  Stethoscope,
  CalendarClock,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

const GLASS = "rounded-xl border border-indigo-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  UNDER_ASSESSMENT: "Em avaliação",
  FINANCIAL_PENDING: "Financeiro pendente",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  PATIENT_CHECKED_IN: "Check-in",
  PREOPERATIVE_PREPARATION: "Prep. pré-op.",
  PREPARED: "Preparada",
  IN_OPERATING_ROOM: "Em sala",
  ANESTHESIA_STARTED: "Anestesia iniciada",
  SURGERY_STARTED: "Cirurgia iniciada",
  EM_ANDAMENTO: "Em andamento",
  SURGERY_COMPLETED: "Cirurgia concluída",
  CONCLUIDA: "Concluída",
  IN_RECOVERY: "Em recuperação",
  RECOVERED: "Recuperado",
  REPORT_PENDING: "Relatório pendente",
  BILLING_PENDING: "Faturação pendente",
  CLOSED: "Fechada",
  POSTPONED: "Adiada",
  CANCELADA: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  REQUESTED: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  UNDER_ASSESSMENT: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  FINANCIAL_PENDING: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  AUTHORIZED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  AGENDADA: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  PATIENT_CHECKED_IN: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  PREOPERATIVE_PREPARATION: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PREPARED: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  IN_OPERATING_ROOM: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  ANESTHESIA_STARTED: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  SURGERY_STARTED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  EM_ANDAMENTO: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SURGERY_COMPLETED: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  IN_RECOVERY: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  RECOVERED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REPORT_PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  BILLING_PENDING: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  POSTPONED: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  CANCELADA: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const PRIORITY_LABEL: Record<string, string> = {
  ELECTIVE: "Eletiva",
  URGENT: "Urgente",
  EMERGENCY: "Emergência",
};

const PRIORITY_DOT: Record<string, string> = {
  ELECTIVE: "bg-emerald-400",
  URGENT: "bg-amber-400",
  EMERGENCY: "bg-rose-500",
};

const CLASS_LABEL: Record<string, string> = {
  MINOR: "Pequena",
  MAJOR: "Grande",
  ELECTIVE: "Eletiva",
  EMERGENCY: "Emergência",
  AMBULATORY: "Ambulatória",
  INPATIENT: "C/ internamento",
  DAY_SURGERY: "Cirurgia de dia",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Surgery {
  id: number;
  custom_id: string;
  status: string;
  priority: string;
  classification: string;
  procedure: string;
  patient_name?: string;
  surgeon_name?: string;
  specialty_name?: string;
  scheduled_for: string | null;
  estimated_price: string;
}

function SurgeryCard({ s }: { s: Surgery }) {
  const statusLabel = STATUS_LABEL[s.status] ?? s.status;
  const statusCls = STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600";
  const priorityDot = PRIORITY_DOT[s.priority] ?? "bg-gray-400";
  const priorityLabel = PRIORITY_LABEL[s.priority] ?? s.priority;
  const classLabel = CLASS_LABEL[s.classification] ?? s.classification;

  return (
    <Link href={`/surgery/large-surgeries/${s.id}`} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-3 transition-all duration-150 hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-600/40`}>
        <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500 opacity-60 group-hover:opacity-100" />
        <div className="pl-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
                  {s.custom_id}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                {s.procedure || "—"}
              </p>
            </div>
            <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--gray-500)]">
            {s.patient_name && (
              <span className="flex items-center gap-1">
                <User size={10} className="shrink-0" />{s.patient_name}
              </span>
            )}
            {s.surgeon_name && (
              <span className="flex items-center gap-1">
                <Stethoscope size={10} className="shrink-0" />{s.surgeon_name}
              </span>
            )}
            {s.scheduled_for && (
              <span className="flex items-center gap-1">
                <CalendarClock size={10} className="shrink-0" />{formatDate(s.scheduled_for)}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--gray-400)]">
              <span className={`inline-block h-2 w-2 rounded-full ${priorityDot}`} />
              {priorityLabel}
            </span>
            {classLabel && (
              <span className="rounded border border-[var(--gray-200)] px-1.5 py-0.5 text-[10px] text-[var(--gray-500)] dark:border-white/10">
                {classLabel}
              </span>
            )}
            {parseFloat(s.estimated_price) > 0 && (
              <span className="ml-auto text-[10px] font-medium text-[var(--gray-500)]">
                {parseFloat(s.estimated_price).toLocaleString("pt-PT")} MT
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const STATUS_FILTER_OPTIONS = [
  "DRAFT", "REQUESTED", "UNDER_ASSESSMENT", "FINANCIAL_PENDING", "AUTHORIZED",
  "AGENDADA", "PATIENT_CHECKED_IN", "PREOPERATIVE_PREPARATION", "PREPARED",
  "IN_OPERATING_ROOM", "ANESTHESIA_STARTED", "SURGERY_STARTED", "EM_ANDAMENTO",
  "SURGERY_COMPLETED", "CONCLUIDA", "IN_RECOVERY", "RECOVERED",
  "REPORT_PENDING", "BILLING_PENDING", "CLOSED", "POSTPONED", "CANCELADA",
];

export default function LargeSurgeriesListPage() {
  const [items, setItems] = useState<Surgery[]>([]);
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
      const d = await apiFetch<any>(`/surgery/large_surgery/?${p}`);
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

  const toggleStatus = (s: string) => setStatusFilter(prev => prev === s ? null : s);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-1 py-1">

        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
          <div className="px-3 py-2 pl-4">
            {/* top row */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Grandes cirurgias</span>
                </div>
                <h1 className="font-display text-sm font-semibold text-foreground">Grandes cirurgias</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/large-surgeries/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-3 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                  <Plus size={11} /> Nova cirurgia
                </Link>
              </div>
            </div>

            <div className="mt-2 border-t border-white/20 dark:border-white/10" />

            {/* search + estado + num */}
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-800"
                  placeholder="Pesquisar por código, procedimento ou paciente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* estado dropdown */}
              <div ref={statusRef} className="relative shrink-0">
                <button type="button" onClick={() => setStatusOpen(v => !v)}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
                    statusFilter
                      ? (STATUS_COLOR[statusFilter] ?? "bg-card border-border text-foreground") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-indigo-300 hover:text-indigo-600"
                  }`}>
                  {statusFilter ? STATUS_LABEL[statusFilter] : "Estado"}
                  <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-44 rounded-xl border border-border bg-card shadow-xl">
                    {statusFilter && (
                      <button type="button"
                        onClick={() => { setStatusFilter(null); setStatusOpen(false); }}
                        className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
                        × Limpar filtro
                      </button>
                    )}
                    {STATUS_FILTER_OPTIONS.map(s => {
                      const active = statusFilter === s;
                      const colorCls = STATUS_COLOR[s] ?? "text-gray-600";
                      return (
                        <button key={s} type="button"
                          onClick={() => { setStatusFilter(active ? null : s); setStatusOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                            active ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-900/20" : "hover:bg-muted"
                          }`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[s]?.match(/bg-\S+/)?.[0] ?? "bg-gray-300"}`} />
                          <span className="flex-1">{STATUS_LABEL[s] ?? s}</span>
                          {active && <span className="text-[10px] text-indigo-500">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <input
                type="number" min="1" max="999"
                className="w-16 shrink-0 rounded-lg border border-border bg-card/60 py-1.5 px-2 text-[12px] text-center text-foreground placeholder-[var(--gray-400)] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:focus:ring-indigo-800"
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
            <Scissors size={32} className="mx-auto mb-3 opacity-30" />
            Nenhuma cirurgia encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map(s => <SurgeryCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
