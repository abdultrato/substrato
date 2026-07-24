"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Database,
  FileImage,
  FilePlus2,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  Search,
  Server,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ImagingFile = {
  id: number;
  custom_id?: string;
  study?: number | { id?: number };
  study_label?: string;
  series?: number | { id?: number };
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
};

type ImagingStudy = {
  id: number;
  accession_number?: string;
  patient_name?: string;
  modality?: string;
  body_region?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const TYPE_LABELS: Record<string, string> = {
  DICOM: "DICOM",
  IMAGE: "Imagem",
  REPORT_PDF: "PDF",
  VIDEO: "Vídeo",
  OTHER: "Outro",
};

const TYPE_STYLES: Record<string, { bar: string; badge: string }> = {
  DICOM: {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  IMAGE: {
    bar: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300",
  },
  REPORT_PDF: {
    bar: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
  },
  VIDEO: {
    bar: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
  },
  OTHER: {
    bar: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
};

function relationId(value?: number | { id?: number }) {
  if (typeof value === "object" && value) return value.id ? String(value.id) : "";
  return value ? String(value) : "";
}

function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(bytes / 1024 ** index)} ${units[index]}`;
}

function shortUid(value?: string) {
  if (!value) return "Sem UID";
  return value.length > 28 ? `…${value.slice(-27)}` : value;
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
    <div className="min-w-[112px] flex-none rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function FileCard({
  item,
  study,
}: {
  item: ImagingFile;
  study?: ImagingStudy;
}) {
  const type = item.file_type || "OTHER";
  const style = TYPE_STYLES[type] || TYPE_STYLES.OTHER;
  const title = item.study_label || study?.accession_number || `Ficheiro #${item.id}`;

  return (
    <Link
      href={`/radiology/files/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
              {type === "IMAGE" ? <ImageIcon size={17} /> : <FileImage size={17} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {title}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {study?.patient_name || "Paciente não informado"}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
            {TYPE_LABELS[type] || type}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Imagem</p>
            <p className="truncate text-xs font-bold text-foreground">#{item.image_number || "—"}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tamanho</p>
            <p className="truncate text-xs font-bold text-foreground">{formatBytes(item.file_size)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Origem</p>
            <p className="truncate text-xs font-bold text-foreground">{item.pacs_object_uri ? "PACS" : item.file ? "Local" : "Metadado"}</p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Layers size={11} className="shrink-0" />
            <span className="truncate">{item.series_label || "Sem série associada"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database size={11} className="shrink-0" />
            <span className="truncate font-mono">{shortUid(item.sop_instance_uid)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RadiologyFilesListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ImagingFile[]>([]);
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [fileResponse, studyResponse] = await Promise.all([
          apiFetchList<ImagingFile>("/radiology/file/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<ImagingStudy>("/radiology/study/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }).catch(() => ({ items: [] as ImagingStudy[], meta: {}, raw: null })),
        ]);
        if (!mounted) return;
        setFiles(fileResponse.items || []);
        setStudies(studyResponse.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar os ficheiros radiológicos.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const studiesById = useMemo(
    () => new Map(studies.map((study) => [String(study.id), study])),
    [studies],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return files.filter((item) => {
      if (type !== "ALL" && item.file_type !== type) return false;
      if (!term) return true;
      const study = studiesById.get(relationId(item.study));
      return [
        item.custom_id,
        item.study_label,
        item.series_label,
        item.sop_instance_uid,
        item.content_type,
        item.pacs_object_uri,
        study?.patient_name,
        study?.accession_number,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [files, search, studiesById, type]);

  const visible = filtered.slice(0, limit);

  const totalBytes = files.reduce((sum, item) => sum + Number(item.file_size || 0), 0);
  const dicomCount = files.filter((item) => item.file_type === "DICOM").length;
  const pacsCount = files.filter((item) => Boolean(item.pacs_object_uri)).length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  <FileImage size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Ficheiros radiológicos</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} ficheiros`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/radiology/files/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-200">
                  <FilePlus2 size={13} />
                  Novo ficheiro
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
                <MetricCard icon={FileText} label="Ficheiros" value={files.length} />
                <MetricCard icon={FileImage} label="DICOM" value={dicomCount} />
                <MetricCard icon={HardDrive} label="Volume" value={formatBytes(totalBytes)} />
                <MetricCard icon={Server} label="No PACS" value={pacsCount} />
              </div>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[550px]">
                <div className="relative min-w-[220px] flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar..."
                    className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <label className="w-16 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(500, Math.max(1, Number(event.target.value || 1))))}
                    className="h-7 w-full rounded-md border border-border bg-background/70 px-2 text-center text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Quantidade de ficheiros a exibir"
                  />
                </label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="h-7 max-w-32 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por tipo de ficheiro"
                >
                  <option value="ALL">Todos os tipos</option>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={19} className="animate-spin" />
            A carregar ficheiros...
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <FileImage size={25} className="opacity-60" />
            <span>Nenhum ficheiro corresponde aos filtros.</span>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <FileCard
                key={item.id}
                item={item}
                study={studiesById.get(relationId(item.study))}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
