"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Database,
  Edit3,
  FileImage,
  Fingerprint,
  Image as ImageIcon,
  Layers,
  Loader2,
  Server,
  Timer,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Relation = number | { id?: number };

type ImagingSeries = {
  id: number;
  custom_id?: string;
  study?: Relation;
  study_label?: string;
  patient_name?: string;
  series_instance_uid?: string;
  series_number?: number;
  modality?: string;
  body_region?: string;
  description?: string;
  image_count?: number;
  storage_uri?: string;
  acquisition_started_at?: string | null;
  acquisition_completed_at?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

type ImagingStudy = {
  id: number;
  accession_number?: string;
  patient_name?: string;
  modality?: string;
  body_region?: string;
  status?: string;
};

type ImagingFile = {
  id: number;
  file_type?: string;
  sop_instance_uid?: string;
  image_number?: number;
  file_size?: number;
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

const REGION_LABELS: Record<string, string> = {
  HEAD: "Cabeça",
  NECK: "Pescoço",
  CHEST: "Tórax",
  ABDOMEN: "Abdómen",
  PELVIS: "Pelve",
  SPINE: "Coluna",
  UPPER_LIMB: "Membro superior",
  LOWER_LIMB: "Membro inferior",
  BREAST: "Mama",
  VASCULAR: "Vascular",
  WHOLE_BODY: "Corpo inteiro",
  OTHER: "Outra",
};

const TYPE_LABELS: Record<string, string> = {
  DICOM: "DICOM",
  IMAGE: "Imagem",
  REPORT_PDF: "PDF de laudo",
  VIDEO: "Vídeo",
  OTHER: "Outro",
};

function relationId(value?: Relation) {
  if (typeof value === "object" && value) return value.id ? String(value.id) : "";
  return value ? String(value) : "";
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

function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(bytes / 1024 ** index)} ${units[index]}`;
}

/** Duração da aquisição em minutos, quando ambos os extremos existem. */
function acquisitionMinutes(item?: ImagingSeries | null): number | null {
  if (!item?.acquisition_started_at || !item?.acquisition_completed_at) return null;
  const start = new Date(item.acquisition_started_at).getTime();
  const end = new Date(item.acquisition_completed_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 60000);
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

export default function RadiologySeriesDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as { id?: string })?.id || "");
  const [item, setItem] = useState<ImagingSeries | null>(null);
  const [study, setStudy] = useState<ImagingStudy | null>(null);
  const [files, setFiles] = useState<ImagingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const seriesResponse = await apiFetch<ImagingSeries>(`/radiology/series/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setItem(seriesResponse);

        const studyId = relationId(seriesResponse.study);
        const [studyResponse, fileResponse] = await Promise.all([
          studyId
            ? apiFetch<ImagingStudy>(`/radiology/study/${studyId}/`, {
                clientCache: safeRefreshToken === 0,
              }).catch(() => null)
            : Promise.resolve(null),
          apiFetchList<ImagingFile>("/radiology/file/", {
            page: 1,
            pageSize: 20,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
            query: { series: id },
          }).catch(() => ({ items: [] as ImagingFile[], meta: {}, raw: null })),
        ]);
        if (!mounted) return;
        setStudy(studyResponse);
        setFiles(fileResponse.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar a série de imagem.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const minutes = acquisitionMinutes(item);
  const title = item?.description || `Série ${item?.series_number ?? id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/12 text-violet-600 dark:text-violet-300">
                  <Layers size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Série de imagem..." : title}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-semibold text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300">
                      {MODALITY_LABELS[item?.modality || ""] || item?.modality || "—"}
                    </span>
                    <span className="truncate">{item?.custom_id || `ID ${id}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology/series" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href={`/radiology/series/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-400/50 bg-violet-500/15 px-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-500/20 dark:text-violet-200">
                  <Edit3 size={13} />
                  Editar
                </Link>
              </div>
            </div>

            {item ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <div className="min-w-[125px] flex-1"><MetricCard icon={Layers} label="Número" value={`#${item.series_number ?? "—"}`} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={ImageIcon} label="Imagens" value={item.image_count ?? 0} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={Activity} label="Região" value={REGION_LABELS[item.body_region || ""] || "—"} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={Timer} label="Duração" value={minutes != null ? `${minutes} min` : "—"} /></div>
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
            A carregar série...
          </div>
        ) : item ? (
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            <DetailCard icon={User} title="Estudo e paciente" accent="bg-sky-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={User} label="Paciente" value={item.patient_name || study?.patient_name || "Não informado"} />
                <MetricCard
                  icon={FileImage}
                  label="Estudo"
                  value={
                    relationId(item.study) ? (
                      <Link href={`/radiology/studies/${relationId(item.study)}`} className="text-cyan-700 hover:underline dark:text-cyan-200">
                        {item.study_label || study?.accession_number || `#${relationId(item.study)}`}
                      </Link>
                    ) : "—"
                  }
                />
                <MetricCard icon={Activity} label="Modalidade" value={MODALITY_LABELS[item.modality || ""] || item.modality || "—"} />
                <MetricCard icon={Database} label="Região" value={REGION_LABELS[item.body_region || ""] || "—"} />
              </div>
            </DetailCard>

            <DetailCard icon={CalendarClock} title="Aquisição" accent="bg-amber-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={CalendarClock} label="Iniciada em" value={formatDateTime(item.acquisition_started_at)} />
                <MetricCard icon={CalendarClock} label="Concluída em" value={formatDateTime(item.acquisition_completed_at)} />
                <MetricCard icon={Timer} label="Duração" value={minutes != null ? `${minutes} min` : "—"} />
                <MetricCard icon={ImageIcon} label="Imagens" value={item.image_count ?? 0} />
              </div>
            </DetailCard>

            <DetailCard icon={Fingerprint} title="Identificação e armazenamento" accent="bg-emerald-500">
              <div className="space-y-1">
                <MetricCard icon={Fingerprint} label="Series Instance UID" value={item.series_instance_uid || "—"} />
                <MetricCard icon={Server} label="URI de armazenamento" value={item.storage_uri || "—"} />
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={CalendarClock} label="Criado em" value={formatDateTime(item.created_at)} />
                  <MetricCard icon={CalendarClock} label="Actualizado em" value={formatDateTime(item.updated_at)} />
                </div>
              </div>
              {item.notes ? (
                <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5">
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Observações</p>
                  <p className="text-xs leading-relaxed text-foreground">{item.notes}</p>
                </div>
              ) : null}
            </DetailCard>

            <DetailCard icon={FileImage} title="Ficheiros da série" accent="bg-violet-500">
              {files.length === 0 ? (
                <p className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhum ficheiro associado a esta série.
                </p>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <Link
                      key={file.id}
                      href={`/radiology/files/${file.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/45 px-2 py-1 transition hover:border-cyan-400/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          #{file.image_number || "—"} · {TYPE_LABELS[file.file_type || ""] || file.file_type || "—"}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {file.sop_instance_uid || "Sem SOP UID"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                        {formatBytes(file.file_size)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </DetailCard>
          </div>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Série não encontrada.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
