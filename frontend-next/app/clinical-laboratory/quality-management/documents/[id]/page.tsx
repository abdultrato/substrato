"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Pencil,
  Shield,
  Tag,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<string, string> = {
  MANUAL:     "Manual da qualidade",
  POP:        "Procedimento operacional padrão (SOP)",
  INSTRUCAO:  "Instrução de trabalho",
  FORMULARIO: "Formulário",
  REGISTO:    "Registo",
  POLITICA:   "Política",
  PLANO:      "Plano",
  PROT_BIO:   "Protocolo de biossegurança",
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

type NamedRef = { id: number; name: string };

type Doc = {
  id: number;
  custom_id: string;
  title: string;
  document_type: string;
  status: string;
  version: string;
  effective_date: string | null;
  review_date: string | null;
  approved_at: string | null;
  content: string;
  sector: number | null;
  sector_detail: NamedRef | null;
  owner: number | null;
  owner_detail: NamedRef | null;
  approved_by: number | null;
  approver_detail: NamedRef | null;
  created_at: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-0 p-4 pl-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{children ?? "—"}</span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${color ?? "border-border bg-muted text-foreground"}`}>
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QualityDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Doc>(`/clinical_laboratory/quality_document/${id}/`)
      .then(setDoc)
      .catch((e) => setError(e?.message ?? "Erro ao carregar documento."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !doc) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Documento não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const bar   = DOC_TYPE_BAR[doc.document_type]   ?? "bg-slate-400";
  const tClr  = DOC_TYPE_COLOR[doc.document_type] ?? "border-border bg-muted text-foreground";
  const sClr  = STATUS_COLOR[doc.status]          ?? "border-border bg-muted text-foreground";
  const sDot  = STATUS_DOT[doc.status]            ?? "bg-slate-400";
  const tLbl  = DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type;
  const sLbl  = STATUS_LABEL[doc.status]          ?? doc.status;

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            {/* Ícone */}
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${tClr} shadow-sm`}>
              <FileText size={22} />
            </div>

            {/* Títulos */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/documents" className="hover:underline">
                  Documentos de qualidade
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{doc.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{doc.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Chip label={tLbl} color={tClr} />
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                  {sLbl}
                </span>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-400">
                  v{doc.version}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{doc.custom_id}</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/documents/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid principal ─────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={FileText} title="Identificação" accent="bg-blue-500">
            <Row label="Código do sistema">
              <span className="font-mono text-[10px] text-muted-foreground">{doc.custom_id}</span>
            </Row>
            <Row label="Título">{doc.title}</Row>
            <Row label="Tipo">
              <Chip label={tLbl} color={tClr} />
            </Row>
            <Row label="Versão">
              <span className="font-mono font-semibold">v{doc.version}</span>
            </Row>
          </SectionCard>

          {/* Classificação */}
          <SectionCard icon={Tag} title="Classificação e estado" accent="bg-indigo-500">
            <Row label="Estado">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                {sLbl}
              </span>
            </Row>
            <Row label="Sector">
              {doc.sector_detail
                ? <span className="font-medium">{doc.sector_detail.name}</span>
                : "—"}
            </Row>
          </SectionCard>

          {/* Responsáveis */}
          <SectionCard icon={User} title="Responsáveis" accent="bg-violet-500">
            <Row label="Proprietário">
              {doc.owner_detail
                ? <span className="font-medium">{doc.owner_detail.name}</span>
                : "—"}
            </Row>
            <Row label="Aprovado por">
              {doc.approver_detail
                ? <span className="font-medium">{doc.approver_detail.name}</span>
                : "—"}
            </Row>
            <Row label="Data de aprovação">
              {fmtDateTime(doc.approved_at) ?? "—"}
            </Row>
          </SectionCard>

          {/* Datas */}
          <SectionCard icon={CalendarDays} title="Datas de vigência" accent="bg-sky-500">
            <Row label="Entrada em vigor">
              {fmtDate(doc.effective_date) ?? "—"}
            </Row>
            <Row label="Data de revisão">
              {fmtDate(doc.review_date) ?? "—"}
            </Row>
            <Row label="Criado em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(doc.created_at)}</span>
            </Row>
            <Row label="Última actualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(doc.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Conteúdo — full width */}
          {doc.content?.trim() && (
            <div className="lg:col-span-2">
              <SectionCard icon={BookOpen} title="Conteúdo / resumo" accent="bg-slate-400">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                  {doc.content}
                </p>
              </SectionCard>
            </div>
          )}

          {/* Ciclo de vida do estado — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Ciclo de vida do documento" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(STATUS_LABEL).map(([value, label]) => {
                  const isActive = doc.status === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-2.5 py-2 text-[11px] ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-50"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_DOT[value]}`} />
                      <div className="flex items-center justify-between pl-1">
                        <span className="font-semibold">{label}</span>
                        {isActive && <CheckCircle2 size={11} className="shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
