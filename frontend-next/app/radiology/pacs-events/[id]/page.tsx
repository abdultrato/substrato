"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Database,
  Edit3,
  Fingerprint,
  Loader2,
  RefreshCcw,
  Server,
  TerminalSquare,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Relation = number | { id?: number };

type PacsEvent = {
  id: number;
  custom_id?: string;
  study?: Relation;
  study_label?: string;
  equipment?: Relation;
  equipment_name?: string;
  event_type?: string;
  direction?: string;
  status?: string;
  external_system?: string;
  accession_number?: string;
  study_instance_uid?: string;
  message_control_id?: string;
  event_at?: string;
  payload?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error_message?: string;
  retry_count?: number;
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

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const EVENT_TYPE_LABELS: Record<string, string> = {
  WORKLIST_CREATE: "Criar worklist",
  WORKLIST_UPDATE: "Atualizar worklist",
  STUDY_SYNC: "Sincronizar estudo",
  STORE: "Armazenar imagem",
  QUERY: "Consultar PACS",
  RETRIEVE: "Recuperar imagem",
  REPORT_SEND: "Enviar laudo",
  ERROR: "Erro",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  ACKNOWLEDGED: "Confirmado",
  FAILED: "Falhou",
  IGNORED: "Ignorado",
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  SENT: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300",
  ACKNOWLEDGED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
  IGNORED: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
};

const STATUS_BARS: Record<string, string> = {
  PENDING: "bg-amber-500",
  SENT: "bg-sky-500",
  ACKNOWLEDGED: "bg-emerald-500",
  FAILED: "bg-rose-500",
  IGNORED: "bg-slate-500",
};

function relationId(value?: Relation) {
  if (typeof value === "object" && value) return value.id ? String(value.id) : "";
  return value ? String(value) : "";
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

function hasContent(value?: Record<string, unknown>) {
  return Boolean(value && Object.keys(value).length > 0);
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

function JsonBlock({ value }: { value?: Record<string, unknown> }) {
  if (!hasContent(value)) {
    return (
      <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1.5 text-xs text-muted-foreground">
        Sem conteúdo registado.
      </div>
    );
  }
  return (
    <pre className="max-h-60 overflow-auto rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function RadiologyPacsEventDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as { id?: string })?.id || "");
  const [item, setItem] = useState<PacsEvent | null>(null);
  const [study, setStudy] = useState<ImagingStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const eventResponse = await apiFetch<PacsEvent>(`/radiology/pacs_event/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setItem(eventResponse);

        const studyId = relationId(eventResponse.study);
        const studyResponse = studyId
          ? await apiFetch<ImagingStudy>(`/radiology/study/${studyId}/`, {
              clientCache: safeRefreshToken === 0,
            }).catch(() => null)
          : null;
        if (!mounted) return;
        setStudy(studyResponse);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar o evento PACS.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const status = item?.status || "PENDING";
  const inbound = item?.direction === "INBOUND";
  const title = item?.accession_number || item?.study_label || `Evento #${id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_BARS[status] || "bg-cyan-500"}`} />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <TerminalSquare size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Evento PACS..." : title}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${STATUS_BADGES[status] || STATUS_BADGES.PENDING}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="truncate">{item?.custom_id || `ID ${id}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology/pacs-events" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href={`/radiology/pacs-events/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200">
                  <Edit3 size={13} />
                  Editar
                </Link>
              </div>
            </div>

            {item ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <div className="min-w-[125px] flex-1"><MetricCard icon={Activity} label="Tipo" value={EVENT_TYPE_LABELS[item.event_type || ""] || item.event_type || "—"} /></div>
                <div className="min-w-[125px] flex-1">
                  <MetricCard
                    icon={inbound ? ArrowDownLeft : ArrowUpRight}
                    label="Direção"
                    value={inbound ? "Entrada" : "Saída"}
                  />
                </div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={RefreshCcw} label="Tentativas" value={item.retry_count ?? 0} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={Server} label="Sistema" value={item.external_system || "—"} /></div>
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
            A carregar evento...
          </div>
        ) : item ? (
          <>
            {item.error_message ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/50 dark:bg-red-950/30">
                <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-700 dark:text-red-300">
                  <AlertTriangle size={12} />
                  Mensagem de erro
                </p>
                <p className="text-xs leading-relaxed text-red-800 dark:text-red-200">{item.error_message}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
              <DetailCard icon={User} title="Estudo e paciente" accent="bg-sky-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={User} label="Paciente" value={study?.patient_name || "Não informado"} />
                  <MetricCard
                    icon={Activity}
                    label="Estudo"
                    value={
                      relationId(item.study) ? (
                        <Link href={`/radiology/studies/${relationId(item.study)}`} className="text-cyan-700 hover:underline dark:text-cyan-200">
                          {item.study_label || study?.accession_number || `#${relationId(item.study)}`}
                        </Link>
                      ) : "—"
                    }
                  />
                  <MetricCard icon={Database} label="Modalidade" value={study?.modality || "—"} />
                  <MetricCard icon={Database} label="Região" value={study?.body_region || "—"} />
                </div>
              </DetailCard>

              <DetailCard icon={Server} title="Integração e equipamento" accent="bg-emerald-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={Server} label="Equipamento" value={item.equipment_name || "—"} />
                  <MetricCard icon={Server} label="Sistema externo" value={item.external_system || "—"} />
                  <MetricCard icon={CalendarClock} label="Evento em" value={formatDate(item.event_at)} />
                  <MetricCard icon={RefreshCcw} label="Tentativas" value={item.retry_count ?? 0} />
                </div>
              </DetailCard>

              <DetailCard icon={Fingerprint} title="Identificação DICOM" accent="bg-violet-500">
                <div className="space-y-1">
                  <MetricCard icon={Fingerprint} label="Número de acesso" value={item.accession_number || "—"} />
                  <MetricCard icon={Fingerprint} label="Study Instance UID" value={item.study_instance_uid || "—"} />
                  <MetricCard icon={Database} label="ID da mensagem" value={item.message_control_id || "—"} />
                </div>
              </DetailCard>

              <DetailCard icon={CalendarClock} title="Registo" accent="bg-amber-500">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={CalendarClock} label="Criado em" value={formatDate(item.created_at)} />
                  <MetricCard icon={CalendarClock} label="Actualizado em" value={formatDate(item.updated_at)} />
                </div>
              </DetailCard>

              <DetailCard icon={Database} title="Payload enviado" accent="bg-cyan-500">
                <JsonBlock value={item.payload} />
              </DetailCard>

              <DetailCard icon={Database} title="Resposta recebida" accent="bg-slate-500">
                <JsonBlock value={item.response} />
              </DetailCard>
            </div>
          </>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Evento PACS não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
