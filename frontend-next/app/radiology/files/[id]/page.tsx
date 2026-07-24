"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Database,
  Edit3,
  FileImage,
  FileText,
  Fingerprint,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  Server,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Relation = number | { id?: number };

type ImagingFile = {
  id: number;
  custom_id?: string;
  study?: Relation;
  study_label?: string;
  series?: Relation;
  series_label?: string;
  file_type?: string;
  file?: string;
  pacs_object_uri?: string;
  sop_instance_uid?: string;
  content_type?: string;
  file_size?: number;
  image_number?: number;
  checksum?: string;
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

type ImagingSeries = {
  id: number;
  series_instance_uid?: string;
  series_number?: number;
  description?: string;
  modality?: string;
  body_region?: string;
  image_count?: number;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

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

function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(bytes / 1024 ** index)} ${units[index]}`;
}

function formatDate(value?: string) {
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

export default function RadiologyFilesDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as { id?: string })?.id || "");
  const [item, setItem] = useState<ImagingFile | null>(null);
  const [study, setStudy] = useState<ImagingStudy | null>(null);
  const [series, setSeries] = useState<ImagingSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const fileResponse = await apiFetch<ImagingFile>(`/radiology/file/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setItem(fileResponse);

        const studyId = relationId(fileResponse.study);
        const seriesId = relationId(fileResponse.series);
        const [studyResponse, seriesResponse] = await Promise.all([
          studyId
            ? apiFetch<ImagingStudy>(`/radiology/study/${studyId}/`, {
                clientCache: safeRefreshToken === 0,
              }).catch(() => null)
            : Promise.resolve(null),
          seriesId
            ? apiFetch<ImagingSeries>(`/radiology/series/${seriesId}/`, {
                clientCache: safeRefreshToken === 0,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setStudy(studyResponse);
        setSeries(seriesResponse);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar o ficheiro radiológico.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const type = item?.file_type || "OTHER";
  const title = item?.study_label || study?.accession_number || `Ficheiro #${id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  {type === "IMAGE" ? <ImageIcon size={18} /> : <FileImage size={18} />}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Ficheiro radiológico..." : title}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {TYPE_LABELS[type] || type}
                    </span>
                    <span className="truncate">{item?.custom_id || `ID ${id}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology/files" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href={`/radiology/files/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-200">
                  <Edit3 size={13} />
                  Editar
                </Link>
              </div>
            </div>

            {item ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <div className="min-w-[125px] flex-1"><MetricCard icon={FileText} label="Tipo" value={TYPE_LABELS[type] || type} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={ImageIcon} label="Imagem" value={`#${item.image_number || "—"}`} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={HardDrive} label="Tamanho" value={formatBytes(item.file_size)} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={Server} label="Origem" value={item.pacs_object_uri ? "PACS" : item.file ? "Local" : "Metadado"} /></div>
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
            A carregar ficheiro...
          </div>
        ) : item ? (
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            <DetailCard icon={User} title="Estudo e paciente" accent="bg-sky-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={User} label="Paciente" value={study?.patient_name || "Não informado"} />
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
                <MetricCard icon={Database} label="Modalidade" value={study?.modality || series?.modality || "—"} />
                <MetricCard icon={Database} label="Região" value={study?.body_region || series?.body_region || "—"} />
              </div>
            </DetailCard>

            <DetailCard icon={Layers} title="Série de imagem" accent="bg-violet-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard
                  icon={Layers}
                  label="Série"
                  value={
                    relationId(item.series) ? (
                      <Link href={`/radiology/series/${relationId(item.series)}`} className="text-cyan-700 hover:underline dark:text-cyan-200">
                        {series?.description || `Série #${series?.series_number || relationId(item.series)}`}
                      </Link>
                    ) : "—"
                  }
                />
                <MetricCard icon={ImageIcon} label="Imagens na série" value={series?.image_count ?? "—"} />
                <div className="sm:col-span-2">
                  <MetricCard icon={Fingerprint} label="Series Instance UID" value={item.series_label || series?.series_instance_uid || "—"} />
                </div>
              </div>
            </DetailCard>

            <DetailCard icon={Server} title="PACS e identificação DICOM" accent="bg-emerald-500">
              <div className="space-y-1">
                <MetricCard icon={Fingerprint} label="SOP Instance UID" value={item.sop_instance_uid || "—"} />
                <MetricCard icon={Server} label="URI no PACS" value={item.pacs_object_uri || "—"} />
                <MetricCard icon={Database} label="Checksum" value={item.checksum || "—"} />
              </div>
            </DetailCard>

            <DetailCard icon={FileText} title="Ficheiro e registo" accent="bg-amber-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={FileText} label="Tipo MIME" value={item.content_type || "—"} />
                <MetricCard icon={HardDrive} label="Tamanho" value={formatBytes(item.file_size)} />
                <MetricCard icon={CalendarClock} label="Criado em" value={formatDate(item.created_at)} />
                <MetricCard icon={CalendarClock} label="Actualizado em" value={formatDate(item.updated_at)} />
              </div>
              {item.notes ? (
                <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5">
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Observações</p>
                  <p className="text-xs leading-relaxed text-foreground">{item.notes}</p>
                </div>
              ) : null}
            </DetailCard>
          </div>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Ficheiro não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
