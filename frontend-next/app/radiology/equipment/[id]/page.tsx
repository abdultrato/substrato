"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Database,
  Edit3,
  Factory,
  Fingerprint,
  Loader2,
  MapPin,
  Server,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ImagingEquipment = {
  id: number;
  custom_id?: string;
  name?: string;
  code?: string;
  modality?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  ae_title?: string;
  station_name?: string;
  location?: string;
  pacs_endpoint?: string;
  last_quality_control?: string | null;
  next_quality_control?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

type ImagingStudy = {
  id: number;
  accession_number?: string;
  patient_name?: string;
  status?: string;
  requested_at?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const MODALITY_LABELS: Record<string, string> = {
  XRAY: "Raio-X",
  ULTRASOUND: "Ultrassom",
  CT: "Tomografia",
  MRI: "Ressonância magnética",
  MAMMOGRAPHY: "Mamografia",
  FLUOROSCOPY: "Fluoroscopia",
  DENSITOMETRY: "Densitometria",
  OTHER: "Outra",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em manutenção",
  INACTIVE: "Inativo",
};

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  MAINTENANCE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
};

const STATUS_BARS: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  MAINTENANCE: "bg-amber-500",
  INACTIVE: "bg-slate-500",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dias até ao próximo controlo de qualidade; negativo quando está em atraso. */
function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} relative overflow-hidden`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10 text-foreground">
            <Icon size={14} />
          </span>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function RadiologyEquipmentDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as { id?: string })?.id || "");
  const [item, setItem] = useState<ImagingEquipment | null>(null);
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const equipmentResponse = await apiFetch<ImagingEquipment>(`/radiology/equipment/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setItem(equipmentResponse);

        const studyResponse = await apiFetchList<ImagingStudy>("/radiology/study/", {
          page: 1,
          pageSize: 10,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
          query: { equipment: id },
        }).catch(() => ({ items: [] as ImagingStudy[], meta: {}, raw: null }));
        if (!mounted) return;
        setStudies(studyResponse.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar o equipamento.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const status = item?.status || "ACTIVE";
  const remaining = daysUntil(item?.next_quality_control);
  const overdue = remaining != null && remaining < 0;
  const dueSoon = remaining != null && remaining >= 0 && remaining <= 30;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_BARS[status] || "bg-slate-500"}`} />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-500/12 text-slate-600 dark:text-slate-300">
                  <Wrench size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Equipamento..." : item?.name || item?.code || `Equipamento #${id}`}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${STATUS_BADGES[status] || STATUS_BADGES.ACTIVE}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="truncate">{item?.code || item?.custom_id || `ID ${id}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology/equipment" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href={`/radiology/equipment/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-400/50 bg-slate-500/15 px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-500/20 dark:text-slate-200">
                  <Edit3 size={13} />
                  Editar
                </Link>
              </div>
            </div>

            {item ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <div className="min-w-[125px] flex-1"><MetricCard icon={Activity} label="Modalidade" value={MODALITY_LABELS[item.modality || ""] || item.modality || "—"} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={Factory} label="Fabricante" value={item.manufacturer || "—"} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={MapPin} label="Localização" value={item.location || "—"} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={CalendarClock} label="Próximo CQ" value={formatDate(item.next_quality_control)} /></div>
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
            A carregar equipamento...
          </div>
        ) : item ? (
          <>
            {overdue || dueSoon ? (
              <div className={`rounded-lg border px-3 py-2 ${overdue ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30"}`}>
                <p className={`flex items-center gap-1.5 text-xs font-semibold ${overdue ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}>
                  <AlertTriangle size={13} />
                  {overdue
                    ? `Controlo de qualidade vencido há ${Math.abs(remaining as number)} dia(s), desde ${formatDate(item.next_quality_control)}.`
                    : `Controlo de qualidade previsto para ${formatDate(item.next_quality_control)} (faltam ${remaining} dia(s)).`}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
              <DetailCard icon={Factory} title="Identificação do equipamento" accent="bg-sky-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={Fingerprint} label="Código" value={item.code || "—"} />
                  <MetricCard icon={Activity} label="Modalidade" value={MODALITY_LABELS[item.modality || ""] || item.modality || "—"} />
                  <MetricCard icon={Factory} label="Fabricante" value={item.manufacturer || "—"} />
                  <MetricCard icon={Database} label="Modelo" value={item.model || "—"} />
                  <div className="sm:col-span-2">
                    <MetricCard icon={Fingerprint} label="Número de série" value={item.serial_number || "—"} />
                  </div>
                </div>
              </DetailCard>

              <DetailCard icon={Server} title="Integração PACS/RIS" accent="bg-emerald-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={Server} label="AE Title" value={item.ae_title || "—"} />
                  <MetricCard icon={Server} label="Estação" value={item.station_name || "—"} />
                  <div className="sm:col-span-2">
                    <MetricCard icon={Database} label="Endpoint PACS/RIS" value={item.pacs_endpoint || "—"} />
                  </div>
                  <div className="sm:col-span-2">
                    <MetricCard icon={MapPin} label="Localização" value={item.location || "—"} />
                  </div>
                </div>
              </DetailCard>

              <DetailCard icon={CalendarClock} title="Controlo de qualidade" accent="bg-amber-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={CalendarClock} label="Último CQ" value={formatDate(item.last_quality_control)} />
                  <MetricCard
                    icon={CalendarClock}
                    label="Próximo CQ"
                    value={
                      <span className={overdue ? "text-red-600 dark:text-red-300" : dueSoon ? "text-amber-600 dark:text-amber-300" : undefined}>
                        {formatDate(item.next_quality_control)}
                      </span>
                    }
                  />
                  <MetricCard icon={CalendarClock} label="Criado em" value={formatDateTime(item.created_at)} />
                  <MetricCard icon={CalendarClock} label="Actualizado em" value={formatDateTime(item.updated_at)} />
                </div>
                {item.notes ? (
                  <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5">
                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Observações</p>
                    <p className="text-xs leading-relaxed text-foreground">{item.notes}</p>
                  </div>
                ) : null}
              </DetailCard>

              <DetailCard icon={Activity} title="Estudos recentes" accent="bg-violet-500">
                {studies.length === 0 ? (
                  <p className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhum estudo registado neste equipamento.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {studies.map((study) => (
                      <Link
                        key={study.id}
                        href={`/radiology/studies/${study.id}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/45 px-2 py-1 transition hover:border-cyan-400/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">{study.accession_number || `#${study.id}`}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{study.patient_name || "Paciente não informado"}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                          {formatDate(study.requested_at)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </DetailCard>
            </div>
          </>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Equipamento não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
