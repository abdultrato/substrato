"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Baby,
  BedDouble,
  Calendar,
  ClipboardList,
  Edit3,
  FileText,
  Heart,
  Stethoscope,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type PregnancyDetail = Record<string, any> & {
  id?: number;
  custom_id?: string | null;
  patient?: number | null;
  patient_name?: string | null;
  responsible_doctor?: number | null;
  responsible_doctor_name?: string | null;
  status?: string | null;
  last_menstrual_period_date?: string | null;
  expected_delivery_date?: string | null;
  nursery?: string | null;
  maternity_bed?: string | null;
  total_deliveries?: number | null;
  normal_deliveries?: number | null;
  cesareans?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_MAP: Record<string, { label: string; accent: string; badge: string }> = {
  ACOMP: {
    label: "Em acompanhamento",
    accent: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  PARTO: {
    label: "Parto",
    accent: "bg-blue-500",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
  },
  ENCERR: {
    label: "Encerrada",
    accent: "bg-slate-500",
    badge:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
  CANCEL: {
    label: "Cancelada",
    accent: "bg-red-500",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
  },
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
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

function NotesBlock({ text }: { text?: string | null }) {
  if (!text?.trim()) {
    return <p className="py-1.5 text-xs italic text-muted-foreground">Sem notas registadas.</p>;
  }
  return <p className="whitespace-pre-wrap py-1.5 text-xs leading-relaxed text-foreground">{text.trim()}</p>;
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
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="divide-y divide-border/60">{children}</div>
      </div>
    </section>
  );
}

export default function MaternityPregnanciesDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [data, setData] = useState<PregnancyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<PregnancyDetail>(`/maternity/gestacao/${id}/`, {
        clientCache: safeRefreshToken === 0,
      });
      setData(response);
    } catch (reason: any) {
      setData(null);
      setError(isNotFoundLikeError(reason) ? null : reason?.message || "Falha ao carregar a gestação.");
    } finally {
      setLoading(false);
    }
  }, [id, safeRefreshToken]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const requiredGroups = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL];
  const status = STATUS_MAP[data?.status || ""] ?? STATUS_MAP.ACOMP;
  const title = useMemo(() => data?.custom_id || `Gestação #${id}`, [data, id]);

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
          {error || "Gestação não encontrada."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-2 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${status.accent}`} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20">
                <Baby size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${status.badge}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gestação · {data.patient_name || `Paciente #${data.patient}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/maternity/pregnancies/${id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 px-3 text-sm font-semibold text-white shadow-sm shadow-pink-500/20 transition hover:opacity-90"
              >
                <Edit3 size={15} /> Editar
              </Link>
              <Link
                href="/maternity/pregnancies"
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

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <SectionCard title="Identificação" subtitle="Código e estado atual." icon={ClipboardList} accent="bg-violet-500">
            <FieldRow label="Código" value={data.custom_id || `MAT-${data.id}`} />
            <FieldRow label="Estado" value={status.label} />
            <FieldRow label="Criado em" value={fmtDate(data.created_at)} />
            <FieldRow label="Atualizado" value={fmtDate(data.updated_at)} />
          </SectionCard>

          <SectionCard title="Paciente e médico" subtitle="Titular e responsável." icon={User} accent="bg-sky-500">
            <FieldRow label="Paciente" value={data.patient_name || (data.patient ? `#${data.patient}` : "—")} />
            <FieldRow
              label="Médico responsável"
              value={data.responsible_doctor_name || (data.responsible_doctor ? `#${data.responsible_doctor}` : "Não atribuído")}
            />
          </SectionCard>

          <SectionCard title="Datas obstétricas" subtitle="DUM e previsão do parto." icon={Calendar} accent="bg-teal-500">
            <FieldRow label="Última menstruação" value={fmtDate(data.last_menstrual_period_date)} />
            <FieldRow label="Data prevista do parto" value={fmtDate(data.expected_delivery_date)} />
          </SectionCard>

          <SectionCard title="Internamento" subtitle="Berçário e cama." icon={BedDouble} accent="bg-indigo-500">
            <FieldRow label="Berçário / ala" value={data.nursery || "—"} />
            <FieldRow label="Cama da maternidade" value={data.maternity_bed || "—"} />
          </SectionCard>

          <SectionCard title="Histórico obstétrico" subtitle="Partos anteriores." icon={Heart} accent="bg-rose-500">
            <FieldRow label="Total de partos" value={data.total_deliveries ?? "—"} />
            <FieldRow label="Partos normais" value={data.normal_deliveries ?? "—"} />
            <FieldRow label="Cesarianas" value={data.cesareans ?? "—"} />
          </SectionCard>

          <SectionCard title="Resumo clínico" subtitle="Situação da gestação." icon={Stethoscope} accent="bg-emerald-500">
            <FieldRow label="Estado clínico" value={status.label} />
            <FieldRow label="Paciente" value={data.patient_name || "—"} />
            <FieldRow label="Responsável" value={data.responsible_doctor_name || "—"} />
          </SectionCard>
        </div>

        <SectionCard
          title="Notas"
          subtitle="Observações livres e evolução da gestação."
          icon={FileText}
          accent="bg-amber-500"
        >
          <NotesBlock text={data.notes} />
        </SectionCard>
      </div>
    </AppLayout>
  );
}
