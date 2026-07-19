"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  User,
  CalendarClock,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  AlertCircle,
  XCircle,
} from "lucide-react";

const GLASS = "rounded-lg border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  PARTIALLY_APPROVED: "Parcialmente aprovada",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
  CANCELLED: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  PARTIALLY_APPROVED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  EXPIRED: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
};

const STATUS_FILTER_OPTIONS = ["PENDING", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "EXPIRED", "CANCELLED"];

const CHECKLIST: [keyof Authorization, string][] = [
  ["budget_approved", "Orçamento aprovado"],
  ["initial_payment_received", "Pagamento inicial recebido"],
  ["insurance_authorized", "Seguro autorizou"],
  ["special_materials_approved", "Materiais especiais aprovados"],
  ["room_available", "Sala disponível"],
  ["team_available", "Equipa disponível"],
  ["preoperative_assessment_completed", "Avaliação pré-operatória concluída"],
  ["consent_signed", "Consentimento assinado"],
];

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(v: string) {
  const n = parseFloat(v);
  return n > 0 ? `${n.toLocaleString("pt-PT")} MT` : null;
}

interface Authorization {
  id: number;
  custom_id: string;
  status: string;
  patient_name?: string;
  surgery_code?: string;
  surgical_request_code?: string;
  quotation_amount: string;
  approved_amount: string;
  budget_approved: boolean;
  initial_payment_received: boolean;
  insurance_authorized: boolean;
  special_materials_approved: boolean;
  room_available: boolean;
  team_available: boolean;
  preoperative_assessment_completed: boolean;
  consent_signed: boolean;
  valid_until: string | null;
  approved_at: string | null;
  rejected_reason: string;
}

function AuthorizationCard({ a }: { a: Authorization }) {
  const statusLabel = STATUS_LABEL[a.status] ?? a.status;
  const statusCls = STATUS_COLOR[a.status] ?? "bg-gray-100 text-gray-600";
  const done = CHECKLIST.filter(([k]) => a[k]).length;
  const quotation = formatAmount(a.quotation_amount);
  const approved = formatAmount(a.approved_amount);
  const validUntil = a.valid_until ? new Date(a.valid_until) : null;
  const expiringSoon = validUntil && a.status !== "EXPIRED" &&
    (validUntil.getTime() - Date.now()) < 7 * 86400_000;

  return (
    <Link href={`/surgery/authorizations/${a.id}`} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-2 transition-all duration-150 hover:border-violet-300 hover:shadow-md dark:hover:border-violet-600/40`}>
        {/* accent bar */}
        <span className="absolute left-0 top-0 h-full w-1 bg-violet-400 opacity-60 group-hover:opacity-100" />

        <div className="pl-2">
          {/* top row */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-[11px] font-semibold tracking-wide text-violet-600 dark:text-violet-400">
                  {a.custom_id}
                </span>
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusCls}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] font-medium text-foreground">
                <User size={11} className="shrink-0 text-[var(--gray-400)]" />
                {a.patient_name || "—"}
              </p>
            </div>
            <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
          </div>

          {/* checklist progress */}
          <div className="mt-1.5 flex items-center gap-1.5" title={CHECKLIST.map(([k, l]) => `${a[k] ? "✓" : "○"} ${l}`).join("\n")}>
            <div className="flex flex-1 gap-0.5">
              {CHECKLIST.map(([k]) => (
                <span key={k} className={`h-1 flex-1 rounded-full ${a[k] ? "bg-emerald-400" : "bg-gray-200 dark:bg-white/10"}`} />
              ))}
            </div>
            <span className={`shrink-0 text-[10px] font-semibold ${done === 8 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--gray-500)]"}`}>
              {done}/8 requisitos
            </span>
          </div>

          {a.rejected_reason ? (
            <p className="mt-1 flex items-start gap-1 text-[10px] text-rose-600 dark:text-rose-400">
              <XCircle size={11} className="mt-0.5 shrink-0" />
              {a.rejected_reason}
            </p>
          ) : null}

          {/* bottom row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {a.surgery_code ? (
              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-600 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                {a.surgery_code}
              </span>
            ) : a.surgical_request_code ? (
              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-600 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                {a.surgical_request_code}
              </span>
            ) : null}
            {a.valid_until ? (
              <span className={`flex items-center gap-1 text-[10px] ${expiringSoon ? "font-medium text-amber-600 dark:text-amber-400" : "text-[var(--gray-500)]"}`}>
                <CalendarClock size={10} className="shrink-0" />
                Válida até {formatDate(a.valid_until)}
              </span>
            ) : null}
            {approved ? (
              <span className="ml-auto text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                {approved} aprovado
              </span>
            ) : quotation ? (
              <span className="ml-auto text-[10px] font-medium text-[var(--gray-500)]">
                {quotation} orçamentado
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SurgicalAuthorizationsListPage() {
  const [items, setItems] = useState<Authorization[]>([]);
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
      const d = await apiFetch<any>(`/surgery/autorizacoes/?${p}`);
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
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-0.5 py-0.5">

        {/* header */}
        <section className={`relative z-10 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="px-2 py-1.5 pl-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Autorizações</span>
                </div>
                <h1 className="font-display text-[13px] font-semibold text-foreground">Autorizações cirúrgicas</h1>
              </div>
              <div className="flex items-center gap-1">
                <Link href="/surgery"
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/authorizations/new"
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <Plus size={11} /> Nova autorização
                </Link>
              </div>
            </div>

            <div className="mt-1 border-t border-white/20 dark:border-white/10" />

            {/* search + estado + num */}
            <div className="mt-1 flex items-center gap-1">
              <div className="relative flex-1">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="h-7 w-full rounded-md border border-border bg-card/60 pl-7 pr-2 text-[11px] placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Pesquisar por código, cirurgia ou paciente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* estado dropdown */}
              <div ref={statusRef} className="relative z-20 shrink-0">
                <button type="button" onClick={() => setStatusOpen(v => !v)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] transition ${
                    statusFilter
                      ? (STATUS_COLOR[statusFilter] ?? "bg-card border-border text-foreground") + " border-transparent"
                      : "border-border bg-card/60 text-[var(--gray-500)] hover:border-violet-300 hover:text-violet-600"
                  }`}>
                  {statusFilter ? STATUS_LABEL[statusFilter] : "Estado"}
                  <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 rounded-xl border border-border bg-card shadow-xl">
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
                className="h-7 w-14 shrink-0 rounded-md border border-border bg-card/60 px-2 text-center text-[11px] text-foreground placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Nº"
                value={numFilter}
                onChange={e => setNumFilter(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--gray-500)]">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg border border-rose-300/50 bg-rose-50/60 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} />{error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--gray-400)]">
            <ShieldCheck size={28} className="mx-auto mb-2 opacity-30" />
            Nenhuma autorização encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(a => <AuthorizationCard key={a.id} a={a} />)}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
