"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
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

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  AGENDADA: "Agendada",
  PREPARADA: "Preparada",
  EM_CURSO: "Em curso",
  SURGERY_COMPLETED: "Cirurgia concluída",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  FINANCIAL_PENDING: "Financeiro pendente",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  AGENDADA: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PREPARADA: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  EM_CURSO: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SURGERY_COMPLETED: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELADA: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  FINANCIAL_PENDING: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
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
  MINOR: "Minor",
  INTERMEDIATE: "Intermédia",
  MAJOR: "Major",
  COMPLEX: "Complexa",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  vat_percentage: string;
}

function SurgeryCard({ s }: { s: Surgery }) {
  const statusLabel = STATUS_LABEL[s.status] ?? s.status;
  const statusCls = STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600";
  const priorityDot = PRIORITY_DOT[s.priority] ?? "bg-gray-400";
  const priorityLabel = PRIORITY_LABEL[s.priority] ?? s.priority;
  const classLabel = CLASS_LABEL[s.classification] ?? s.classification;

  return (
    <Link href={`/surgery/small-surgeries/${s.id}`} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-4 transition-all duration-150 hover:border-violet-300 hover:shadow-md dark:hover:border-violet-600/40`}>
        {/* accent bar */}
        <span className="absolute left-0 top-0 h-full w-1 bg-violet-400 opacity-60 group-hover:opacity-100" />

        <div className="pl-3">
          {/* top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wide text-violet-600 dark:text-violet-400">
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
            <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
          </div>

          {/* detail row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--gray-500)]">
            {s.patient_name ? (
              <span className="flex items-center gap-1">
                <User size={10} className="shrink-0" />
                {s.patient_name}
              </span>
            ) : null}
            {s.surgeon_name ? (
              <span className="flex items-center gap-1">
                <Stethoscope size={10} className="shrink-0" />
                {s.surgeon_name}
              </span>
            ) : null}
            {s.scheduled_for ? (
              <span className="flex items-center gap-1">
                <CalendarClock size={10} className="shrink-0" />
                {formatDate(s.scheduled_for)}
              </span>
            ) : null}
          </div>

          {/* bottom row */}
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--gray-400)]">
              <span className={`inline-block h-2 w-2 rounded-full ${priorityDot}`} />
              {priorityLabel}
            </span>
            {classLabel ? (
              <span className="rounded border border-[var(--gray-200)] px-1.5 py-0.5 text-[10px] text-[var(--gray-500)] dark:border-white/10">
                {classLabel}
              </span>
            ) : null}
            {parseFloat(s.estimated_price) > 0 ? (
              <span className="ml-auto text-[10px] font-medium text-[var(--gray-500)]">
                {parseFloat(s.estimated_price).toLocaleString("pt-PT")} MT
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SmallSurgeriesListPage() {
  const [items, setItems] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q: string) => {
    setLoading(true); setError(null);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=100` : "?limit=100";
      const d = await apiFetch<any>(`/surgery/small_surgery/${params}`);
      setItems(d.results ?? d);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-1 py-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="px-3 py-2 pl-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Pequenas cirurgias</span>
                </div>
                <h1 className="font-display text-sm font-semibold text-foreground">Pequenas cirurgias</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link
                  href="/surgery/small-surgeries/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
                >
                  <Plus size={11} />
                  Nova cirurgia
                </Link>
              </div>
            </div>
            <div className="relative mt-2">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
              <input
                className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Pesquisar por código, procedimento ou paciente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--gray-500)]">
            <Loader2 size={16} className="animate-spin" />
            Carregando...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} />
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--gray-400)]">
            <Scissors size={32} className="mx-auto mb-3 opacity-30" />
            Nenhuma cirurgia encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(s => <SurgeryCard key={s.id} s={s} />)}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
