"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  Edit3,
  FileText,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type MedicalRecordDetail = Record<string, any> & {
  id?: number;
  custom_id?: string | null;
  patient?: number | null;
  patient_name?: string | null;
  doctor?: number | null;
  doctor_name?: string | null;
  status?: string | null;
  care_start_at?: string | null;
  care_end_at?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  prescription?: string | null;
  medical_report?: string | null;
  consultation_codes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_MAP: Record<string, { label: string; accent: string; badge: string }> = {
  RASCUNHO: {
    label: "Rascunho",
    accent: "bg-amber-500",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
  FINALIZADO: {
    label: "Finalizado",
    accent: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  CANCELADO: {
    label: "Cancelado",
    accent: "bg-red-500",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
  },
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 min-w-0 break-words text-xs leading-snug text-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

function ClinicalTextBlock({ label, text }: { label: string; text?: string | null }) {
  if (!text?.trim()) {
    return (
      <div className="py-1.5">
        <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <p className="text-xs italic text-muted-foreground">Sem conteúdo registado.</p>
      </div>
    );
  }
  return (
    <div className="py-1.5">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{text.trim()}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-3 py-2 pl-4">
        <div className="mb-1.5 flex items-start gap-2">
          <span
            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}
          >
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-border/60">{children}</div>
      </div>
    </section>
  );
}

export default function MedicalRecordsRecordsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [data, setData] = useState<MedicalRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<MedicalRecordDetail>(
        `/medical_records/record/${id}/`,
        { clientCache: safeRefreshToken === 0 }
      );
      setData(response);
    } catch (reason: any) {
      setData(null);
      setError(
        isNotFoundLikeError(reason)
          ? null
          : reason?.message || "Falha ao carregar o cardex."
      );
    } finally {
      setLoading(false);
    }
  }, [id, safeRefreshToken]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/medical_records/record/${id}/`, { method: "DELETE" });
      router.push("/medical-records/records");
    } catch (reason: any) {
      setError(
        isNotFoundLikeError(reason)
          ? "Registo não encontrado."
          : reason?.message || "Não foi possível apagar o registo."
      );
    } finally {
      setDeleting(false);
    }
  }

  const title = useMemo(
    () => data?.custom_id || data?.patient_name || `Cardex #${id}`,
    [data, id]
  );
  const status = STATUS_MAP[data?.status || ""] ?? STATUS_MAP.RASCUNHO;
  const dur = duration(data?.care_start_at, data?.care_end_at);

  const requiredGroups = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM];

  if (loading) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Carregando...
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={requiredGroups}>
        <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error || "Cardex não encontrado."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-2 px-1">

        {/* ── Cabeçalho — largura total ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status.accent}`} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <ClipboardList size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">
                    {title}
                  </h1>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${status.badge}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cardex · {data.patient_name || `Paciente #${data.patient}`}
                  {dur ? ` · ${dur}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/medical-records/records/${id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-3 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90"
              >
                <Edit3 size={15} /> Editar
              </Link>
              <ConfirmDialog
                title="Apagar cardex"
                message="Esta ação apaga definitivamente o registo de prontuário selecionado."
                confirmText="Apagar"
                onConfirm={handleDelete}
                disabled={deleting}
              >
                <button
                  type="button"
                  disabled={deleting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-red-600 to-rose-600 px-3 text-sm font-semibold text-white shadow-sm shadow-red-500/20 transition hover:opacity-90 disabled:opacity-60"
                >
                  <Trash2 size={15} /> {deleting ? "Apagando..." : "Apagar"}
                </button>
              </ConfirmDialog>
              <Link
                href="/medical-records/records"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/20"
              >
                <ArrowLeft size={16} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <SectionCard
            title="Paciente e médico"
            subtitle="Titular do cardex e responsável clínico."
            icon={User}
            accent="bg-sky-500"
          >
            <FieldRow
              label="Paciente"
              value={data.patient_name || (data.patient ? `#${data.patient}` : "—")}
            />
            <FieldRow
              label="Médico"
              value={data.doctor_name || (data.doctor ? `#${data.doctor}` : "Não atribuído")}
            />
            <FieldRow label="Consulta" value={data.consultation_codes || "—"} />
            <FieldRow label="Código" value={data.custom_id || `PRT-${data.id}`} />
          </SectionCard>

          <SectionCard
            title="Período e estado"
            subtitle="Janela temporal do episódio clínico."
            icon={Calendar}
            accent="bg-teal-500"
          >
            <FieldRow label="Estado" value={status.label} />
            <FieldRow label="Início" value={fmtDate(data.care_start_at)} />
            <FieldRow label="Fim" value={fmtDate(data.care_end_at)} />
            <FieldRow label="Duração" value={dur || "Em curso"} />
            <FieldRow label="Criado em" value={fmtDate(data.created_at)} />
            <FieldRow label="Atualizado" value={fmtDate(data.updated_at)} />
          </SectionCard>

          <SectionCard
            title="Sintomas"
            subtitle="Queixas relatadas."
            icon={Stethoscope}
            accent="bg-rose-500"
          >
            <ClinicalTextBlock label="Sintomas" text={data.symptoms} />
          </SectionCard>

          <SectionCard
            title="Prescrição"
            subtitle="Observações livres de prescrição."
            icon={FileText}
            accent="bg-emerald-500"
          >
            <ClinicalTextBlock label="Prescrição" text={data.prescription} />
          </SectionCard>

          <div className="lg:col-span-2">
            <SectionCard
              title="Diagnóstico"
              subtitle="Hipótese diagnóstica."
              icon={BookOpen}
              accent="bg-indigo-500"
            >
              <ClinicalTextBlock label="Diagnóstico" text={data.diagnosis} />
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Relatório médico"
          subtitle="Notas clínicas, evolução e conclusões do episódio."
          icon={FileText}
          accent="bg-amber-500"
        >
          <ClinicalTextBlock label="Relatório" text={data.medical_report} />
        </SectionCard>
      </div>
    </AppLayout>
  );
}
