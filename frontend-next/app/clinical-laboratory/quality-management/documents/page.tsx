"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  MANUAL:     "Manual",
  POP:        "POP",
  INSTRUCAO:  "Instrução de trabalho",
  FORMULARIO: "Formulário",
  REGISTO:    "Registo",
  POLITICA:   "Política",
  PLANO:      "Plano",
  PROT_BIO:   "Prot. biossegurança",
};

const DOC_TYPE_COLOR: Record<string, string> = {
  MANUAL:     "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  POP:        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  INSTRUCAO:  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  FORMULARIO: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  REGISTO:    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",
  POLITICA:   "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  PLANO:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  PROT_BIO:   "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const DOC_TYPE_BAR: Record<string, string> = {
  MANUAL:     "bg-blue-500",
  POP:        "bg-violet-500",
  INSTRUCAO:  "bg-indigo-500",
  FORMULARIO: "bg-sky-500",
  REGISTO:    "bg-teal-500",
  POLITICA:   "bg-amber-500",
  PLANO:      "bg-emerald-500",
  PROT_BIO:   "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:   "Rascunho",
  EM_REVISAO: "Em revisão",
  APROVADO:   "Aprovado",
  ATIVO:      "Ativo",
  OBSOLETO:   "Obsoleto",
  ARQUIVADO:  "Arquivado",
};

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO:   "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300",
  EM_REVISAO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  APROVADO:   "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  ATIVO:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  OBSOLETO:   "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  ARQUIVADO:  "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

const STATUS_DOT: Record<string, string> = {
  RASCUNHO:   "bg-slate-400",
  EM_REVISAO: "bg-amber-400",
  APROVADO:   "bg-blue-500",
  ATIVO:      "bg-emerald-500",
  OBSOLETO:   "bg-orange-500",
  ARQUIVADO:  "bg-slate-400",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Doc = {
  id: number;
  custom_id: string;
  title: string;
  document_type: string;
  status: string;
  version: string;
  effective_date: string | null;
  review_date: string | null;
  content: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Filters ───────────────────────────────────────────────────────────────────

const DOC_TYPES = Object.entries(DOC_TYPE_LABEL);
const STATUSES  = Object.entries(STATUS_LABEL);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QualityDocumentListPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const fetchDocs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q: Record<string, string> = {};
      if (debouncedSearch) q.search = debouncedSearch;
      if (filterType)   q.document_type = filterType;
      if (filterStatus) q.status = filterStatus;
      const { items, meta } = await apiFetchList<Doc>(
        "/clinical_laboratory/quality_document/",
        { page, pageSize: PAGE_SIZE, query: q },
      );
      setDocs(items); setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar documentos.");
    } finally { setLoading(false); }
  }, [debouncedSearch, filterType, filterStatus, page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterType, filterStatus]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function clearFilters() {
    setSearch(""); setFilterType(""); setFilterStatus(""); setPage(1);
  }
  const hasFilters = !!(search || filterType || filterStatus);

  // ── Group by doc type for summary chips ───────────────────────
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    docs.forEach((d) => { m[d.document_type] = (m[d.document_type] ?? 0) + 1; });
    return m;
  }, [docs]);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-blue-500 to-indigo-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
              <BookOpen size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span> <span className="font-medium text-foreground">Documentos</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Documentos de qualidade
                {total > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
                )}
              </h1>
            </div>

            <Link href="/clinical-laboratory/quality-management/documents/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700">
              <Plus size={13} /> Novo documento
            </Link>
          </div>
        </div>

        {/* ── Filtros ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* pesquisa */}
          <div className="relative min-w-[200px] flex-1">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar título, código…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          {/* tipo */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <option value="">Todos os tipos</option>
            {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {/* estado */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <option value="">Todos os estados</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X size={10} /> Limpar
            </button>
          )}

          {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Lista ─────────────────────────────────────────────── */}
        {!loading && !error && docs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <FileText size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum documento encontrado.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1.5 text-xs text-blue-600 underline dark:text-blue-400">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {docs.map((doc) => {
            const bar   = DOC_TYPE_BAR[doc.document_type]   ?? "bg-slate-400";
            const tClr  = DOC_TYPE_COLOR[doc.document_type] ?? "border-border bg-muted text-foreground";
            const sClr  = STATUS_COLOR[doc.status]          ?? "border-border bg-muted text-foreground";
            const sDot  = STATUS_DOT[doc.status]            ?? "bg-slate-400";
            const tLbl  = DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type;
            const sLbl  = STATUS_LABEL[doc.status]          ?? doc.status;
            const eff   = fmtDate(doc.effective_date);
            const rev   = fmtDate(doc.review_date);

            return (
              <Link key={doc.id}
                href={`/clinical-laboratory/quality-management/documents/${doc.id}`}
                className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                {/* barra lateral colorida */}
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar} transition-all group-hover:w-[3px]`} />

                {/* ícone */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tClr}`}>
                  <FileText size={14} />
                </div>

                {/* conteúdo principal */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tClr}`}>
                      {tLbl}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sClr}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                      {sLbl}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">{doc.custom_id}</span>
                    <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-400">
                      v{doc.version}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-xs font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    {doc.title}
                  </p>

                  {doc.content && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {doc.content}
                    </p>
                  )}

                  {(eff || rev) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                      {eff && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <CalendarDays size={9} /> Vigência: {eff}
                        </span>
                      )}
                      {rev && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <CalendarDays size={9} /> Revisão: {rev}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Paginação ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              Página {page} de {totalPages} · {total} documentos
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-blue-500 bg-blue-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
