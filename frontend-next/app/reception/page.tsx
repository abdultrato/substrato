"use client";

import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Activity,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FilePlus2,
  FileText,
  HeartPulse,
  Loader2,
  PackageSearch,
  Receipt,
  Search,
  Send,
  Sparkles,
  Stethoscope,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import { getManchesterMeta } from "@/lib/manchesterTriage";
import AppLayout from "@/components/layout/AppLayout";
import MoneyValue from "@/components/ui/MoneyValue";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { PatientIntakeWizard } from "@/components/reception/PatientIntakeWizard";

interface ReceptionWorkspaceSummary {
  checkins_today: number;
  queue_size: number;
  in_care: number;
  new_patients: number;
  pending_requests: number;
  open_invoices: number;
  receipts_generated_today: number;
  received_today: string;
}

interface ReceptionQueueItem {
  id: number;
  custom_id: string;
  patient_id: number;
  patient_name: string;
  patient_code: string;
  priority: string;
  status: string;
  arrived_at: string;
  attendant: string;
  request_id: number | null;
  request_code: string;
  invoice_id: number | null;
  invoice_code: string;
}

interface ReceptionWorkspace {
  date: string;
  summary: ReceptionWorkspaceSummary;
  queue: ReceptionQueueItem[];
}

type CreditNoteRow = {
  id: number;
  custom_id?: string;
  invoice_code?: string;
  consultation_code?: string | null;
  patient_name?: string | null;
  amount?: string | number;
  reason?: string;
  status?: string;
  requested_by_name?: string | null;
  reviewed_by_name?: string | null;
  decision_note?: string;
  created_at?: string;
  reviewed_at?: string;
};

type ReceptionSearchRow = {
  id: number;
  custom_id?: string;
  patient_name?: string;
  patient_code?: string;
  attendant_name?: string;
  status?: string;
  status_display?: string;
  priority?: string;
  priority_display?: string;
  reason?: string;
  notes?: string;
  arrived_at?: string;
  request_code?: string;
  invoice_code?: string;
  invoice_status?: string;
  invoice_status_display?: string;
  invoice_total?: string | number | null;
  invoice_patient_amount?: string | number | null;
};

type ReceptionChatResponse = {
  session_id: number;
  message_id: number;
  answer: string;
};

type ReceptionChatMessage = {
  id: string;
  role: "assistant" | "user" | "error";
  content: string;
};

function fmtDate(value: unknown): string {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSearchBlob(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase();
  }
  if (Array.isArray(value)) {
    return value.map((item) => buildSearchBlob(item)).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key} ${buildSearchBlob(entry)}`)
      .join(" ");
  }
  return "";
}

function normalizeReceptionWorkspace(raw: any): ReceptionWorkspace {
  const summary = raw?.summary ?? raw?.resumo ?? {};
  const queue = raw?.queue ?? raw?.fila ?? [];

  return {
    date: String(raw?.date ?? raw?.data ?? ""),
    summary: {
      checkins_today: Number(summary?.checkins_today ?? summary?.checkins_hoje ?? 0),
      queue_size: Number(summary?.queue_size ?? summary?.na_fila ?? 0),
      in_care: Number(summary?.in_care ?? summary?.em_atendimento ?? 0),
      new_patients: Number(summary?.new_patients ?? summary?.pacientes_novos ?? 0),
      pending_requests: Number(summary?.pending_requests ?? summary?.requisicoes_pendentes ?? 0),
      open_invoices: Number(summary?.open_invoices ?? summary?.faturas_em_aberto ?? 0),
      receipts_generated_today: Number(
        summary?.receipts_generated_today ?? summary?.recibos_gerados_hoje ?? 0,
      ),
      received_today: String(summary?.received_today ?? summary?.recebido_hoje ?? "0.00"),
    },
    queue: Array.isArray(queue)
      ? queue.map((item: any) => ({
          id: Number(item?.id ?? 0),
          custom_id: String(item?.custom_id ?? item?.id_custom ?? ""),
          patient_id: Number(item?.patient_id ?? item?.paciente_id ?? 0),
          patient_name: String(item?.patient_name ?? item?.paciente_nome ?? ""),
          patient_code: String(item?.patient_code ?? item?.paciente_codigo ?? ""),
          priority: String(item?.priority ?? item?.prioridade ?? ""),
          status: String(item?.status ?? item?.estado ?? ""),
          arrived_at: String(item?.arrived_at ?? item?.chegou_em ?? ""),
          attendant: String(item?.attendant ?? item?.atendente ?? ""),
          request_id: item?.request_id ?? item?.requisicao_id ?? null,
          request_code: String(item?.request_code ?? item?.requisicao_codigo ?? ""),
          invoice_id: item?.invoice_id ?? item?.fatura_id ?? null,
          invoice_code: String(item?.invoice_code ?? item?.fatura_codigo ?? ""),
        }))
      : [],
  };
}

function normalizeSearchRows(raw: any): ReceptionSearchRow[] {
  const rows = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
  return rows.map((item: any) => ({
    id: Number(item?.id ?? 0),
    custom_id: String(item?.custom_id ?? item?.id_custom ?? ""),
    patient_name: item?.patient_name ?? "",
    patient_code: item?.patient_code ?? "",
    attendant_name: item?.attendant_name ?? item?.attendant ?? "",
    status: item?.status ?? "",
    status_display: item?.status_display ?? "",
    priority: item?.priority ?? "",
    priority_display: item?.priority_display ?? "",
    reason: item?.reason ?? "",
    notes: item?.notes ?? "",
    arrived_at: item?.arrived_at ?? "",
    request_code: item?.request_code ?? "",
    invoice_code: item?.invoice_code ?? "",
    invoice_status: item?.invoice_status ?? "",
    invoice_status_display: item?.invoice_status_display ?? "",
    invoice_total: item?.invoice_total ?? null,
    invoice_patient_amount: item?.invoice_patient_amount ?? null,
  }));
}

const EMPTY_WORKSPACE: ReceptionWorkspace = {
  date: "",
  summary: {
    checkins_today: 0,
    queue_size: 0,
    in_care: 0,
    new_patients: 0,
    pending_requests: 0,
    open_invoices: 0,
    receipts_generated_today: 0,
    received_today: "0.00",
  },
  queue: [],
};

const FETCH_PAGE_SIZE = 200;
const REFRESH_MS = 15_000;
const GLASS =
  "rounded-2xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]";

const atalhos = [
  {
    title: "Criar requisição",
    description: "Encaminhar o paciente directo para a jornada laboratorial.",
    href: "/requests/new",
    icon: FilePlus2,
  },
  {
    title: "Requisição externa",
    description: "Criar requisição para empresa solicitante ou terceirizada.",
    href: "/requests/external/new",
    icon: FileText,
  },
  {
    title: "Faturas",
    description: "Abrir o backoffice de faturamento para emissão e revisão.",
    href: "/invoices",
    icon: CreditCard,
  },
  {
    title: "Recibos",
    description: "Consultar recibos já gerados no módulo de pagamentos.",
    href: "/receipts",
    icon: Receipt,
  },
  {
    title: "Agendar consulta",
    description: "Marcar consulta médica e emitir fatura quando necessário.",
    href: "/consultations",
    icon: CalendarClock,
  },
  {
    title: "Criar requisição de materiais",
    description: "Abrir o formulário para solicitar consumíveis ao stock.",
    href: "/pharmacy/material-requests/new",
    icon: PackageSearch,
  },
  {
    title: "Marcar procedimento",
    description: "Registar procedimento de enfermagem com materiais e execução.",
    href: "/nursing/procedures/new",
    icon: ClipboardList,
  },
];

const marcacoesPorSector = [
  {
    title: "Consultas médicas",
    description:
      "Marcar consulta clínica para um paciente, com especialidade, horário e faturação.",
    href: "/consultations",
    icon: Stethoscope,
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Consultas cirúrgicas",
    description: "Agendar cirurgia pequena, grande ou geral com procedimento e data prevista.",
    href: "/surgery/surgeries/new",
    icon: Activity,
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "Odontologia",
    description: "Marcar consulta dentária com cadeira, motivo e estado do atendimento.",
    href: "/dental/appointments/new",
    icon: CalendarClock,
    iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Medicina veterinária",
    description: "Marcar consulta veterinária para animal/paciente e tutor responsável.",
    href: "/veterinary/appointments/new",
    icon: HeartPulse,
    iconBg: "bg-pink-100 dark:bg-pink-900/40",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  {
    title: "Fisioterapia e reabilitação",
    description: "Abrir marcação de avaliação funcional inicial antes do plano e das sessões.",
    href: "/physiotherapy/assessments/new",
    icon: Activity,
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

const chatPrompts = [
  "Resume a situação da recepção hoje.",
  "Quem está há mais tempo na fila?",
  "Quais check-ins ainda não têm fatura ligada?",
];

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  AGUARD: {
    label: "Aguardando",
    cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  ATEND: {
    label: "Em atendimento",
    cls: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  REQ: {
    label: "Requisição criada",
    cls: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  FAT: {
    label: "Fatura vinculada",
    cls: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  CONC: {
    label: "Concluído",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANC: {
    label: "Cancelado",
    cls: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-400",
    dot: "bg-rose-400",
  },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URG: {
    label: "Urgente",
    cls: "border-red-300 bg-red-100 text-red-700 font-bold dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400",
  },
  PREF: {
    label: "Preferencial",
    cls: "border-amber-300 bg-amber-100 text-amber-700 font-semibold dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400",
  },
  NOR: {
    label: "Normal",
    cls: "border-border bg-muted text-muted-foreground",
  },
};

export default function RecepcaoPage() {
  const { loading } = useAuthGuard();
  const { user } = useAuth();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [workspace, setWorkspace] = useState<ReceptionWorkspace>(EMPTY_WORKSPACE);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [approvedNotes, setApprovedNotes] = useState<CreditNoteRow[]>([]);
  const [rejectedNotes, setRejectedNotes] = useState<CreditNoteRow[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchRows, setSearchRows] = useState<ReceptionSearchRow[]>([]);
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [chatComposer, setChatComposer] = useState("");
  const [chatMessages, setChatMessages] = useState<ReceptionChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadOperationalData = useCallback(
    async (initial = false) => {
      const requestId = ++requestRef.current;
      if (initial) {
        setCarregando(true);
        setLoadingNotes(true);
      } else {
        setRefreshing(true);
      }

      const [workspaceResult, approvedResult, rejectedResult, checkinsResult] =
        await Promise.allSettled([
          apiFetch<any>("/reception/workspace/", { clientCache: false }),
          apiFetch<any>("/billing/credit-note-request/?status=APRO&ordering=-reviewed_at", {
            clientCache: false,
          }),
          apiFetch<any>("/billing/credit-note-request/?status=REJE&ordering=-reviewed_at", {
            clientCache: false,
          }),
          apiFetch<any>(
            `/reception/checkin/?ordering=-arrived_at&page_size=${FETCH_PAGE_SIZE}`,
            { clientCache: false },
          ),
        ]);

      if (requestId !== requestRef.current) return;

      let nextError: string | null = null;

      if (workspaceResult.status === "fulfilled") {
        setWorkspace(normalizeReceptionWorkspace(workspaceResult.value));
      } else {
        nextError =
          workspaceResult.reason instanceof Error
            ? workspaceResult.reason.message
            : "Falha ao carregar a área de trabalho da recepção.";
      }

      if (approvedResult.status === "fulfilled") {
        const approvedList = approvedResult.value?.results ?? approvedResult.value;
        setApprovedNotes(Array.isArray(approvedList) ? approvedList : []);
      } else {
        setApprovedNotes([]);
      }

      if (rejectedResult.status === "fulfilled") {
        const rejectedList = rejectedResult.value?.results ?? rejectedResult.value;
        setRejectedNotes(Array.isArray(rejectedList) ? rejectedList : []);
      } else {
        setRejectedNotes([]);
      }

      if (checkinsResult.status === "fulfilled") {
        setSearchRows(normalizeSearchRows(checkinsResult.value));
      } else if (!nextError) {
        nextError =
          checkinsResult.reason instanceof Error
            ? checkinsResult.reason.message
            : "Falha ao indexar os check-ins da recepção.";
      }

      setErro(nextError);
      setCarregando(false);
      setLoadingNotes(false);
      setRefreshing(false);
      setLastRefresh(new Date());
    },
    [],
  );

  useEffect(() => {
    void loadOperationalData(true);
  }, [loadOperationalData, safeRefreshToken]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadOperationalData(false);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadOperationalData]);

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || chatLoading) return;

      setChatError(null);
      setChatComposer("");
      setChatMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: "user", content: text },
      ]);
      setChatLoading(true);

      try {
        const response = await apiFetch<ReceptionChatResponse>("/ai/assistant/chat/", {
          method: "POST",
          clientCache: false,
          timeoutMs: 45_000,
          body: JSON.stringify({
            session_id: chatSessionId,
            message: text,
            language: "pt",
            active_module: "reception",
            context: {
              current_path: "/reception",
              filters: { search },
              workspace_summary: workspace.summary,
              queue_preview: workspace.queue.slice(0, 5).map((item) => ({
                patient_name: item.patient_name,
                patient_code: item.patient_code,
                priority: item.priority,
                status: item.status,
                request_code: item.request_code,
                invoice_code: item.invoice_code,
              })),
            },
          }),
        });

        setChatSessionId(response.session_id);
        setChatMessages((current) => [
          ...current,
          {
            id: `assistant-${response.message_id}`,
            role: "assistant",
            content: response.answer,
          },
        ]);
      } catch (error: any) {
        const detail =
          error?.message || "Falha ao consultar o chatbot Substrato a partir da recepção.";
        setChatError(detail);
        setChatMessages((current) => [
          ...current,
          { id: `error-${Date.now()}`, role: "error", content: detail },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, chatSessionId, search, workspace.queue, workspace.summary],
  );

  if (loading) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.first_name?.trim() || user?.username?.trim() || null;
  const greetingName = firstName ? `${greeting}, ${firstName}` : greeting;
  const todayLabel = now.toLocaleDateString("pt-MZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const normalizedSearch = search.toLowerCase();
  const searchResults = normalizedSearch
    ? searchRows.filter((item) => buildSearchBlob(item).includes(normalizedSearch))
    : searchRows.slice(0, 8);

  return (
    <>
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
        <div className="space-y-3">
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--primary-500)] dark:text-[var(--primary-400)]">
                    Recepção · cockpit diário
                  </p>
                  <h1 className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">
                    {greetingName}
                  </h1>
                  <p className="text-[12px] text-muted-foreground capitalize">
                    {todayLabel}
                    {lastRefresh && (
                      <span className="ml-2 normal-case">
                        · actualizado {lastRefresh.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {refreshing ? (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/40 px-3 text-xs text-muted-foreground dark:bg-white/[0.08]">
                      <Loader2 size={13} className="animate-spin" />
                      Actualizando
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--primary-600)] to-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-[var(--primary-700)] hover:to-violet-700"
                  >
                    <UserPlus size={13} />
                    Registar paciente
                  </button>
                  <Link
                    href="/reception/reception-checkins/new"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 text-xs font-semibold text-foreground transition hover:bg-background"
                  >
                    <ClipboardList size={13} />
                    Novo check-in
                  </Link>
                </div>
              </div>

              {erro && (
                <div className="rounded-xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  {erro}
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <HeroMetricCard
                  title="Check-ins hoje"
                  value={workspace.summary.checkins_today}
                  icon={Users}
                  accent="bg-blue-500"
                  iconBg="bg-blue-100 dark:bg-blue-900/40"
                  iconColor="text-blue-600 dark:text-blue-400"
                  href="/reception/reception-checkins"
                />
                <HeroMetricCard
                  title="Na fila"
                  value={workspace.summary.queue_size}
                  icon={ClipboardList}
                  accent="bg-amber-500"
                  iconBg="bg-amber-100 dark:bg-amber-900/40"
                  iconColor="text-amber-600 dark:text-amber-400"
                  href="/reception/reception-checkins?status=AGUARD"
                />
                <HeroMetricCard
                  title="Em atendimento"
                  value={workspace.summary.in_care}
                  icon={Stethoscope}
                  accent="bg-violet-500"
                  iconBg="bg-violet-100 dark:bg-violet-900/40"
                  iconColor="text-violet-600 dark:text-violet-400"
                  href="/reception/reception-checkins?status=ATEND"
                />
                <HeroMetricCard
                  title="Recebido hoje"
                  value={<MoneyValue value={workspace.summary.received_today} />}
                  icon={Receipt}
                  accent="bg-emerald-500"
                  iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  href="/receipts"
                />
              </div>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--primary-200)]/40 blur-3xl dark:bg-[var(--primary-700)]/20"
            />
          </section>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <div className="space-y-3">
              <section className={GLASS}>
                <div className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                          <Search size={15} />
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-foreground">
                            Motor de busca operacional
                          </h2>
                          <p className="text-[11px] text-muted-foreground">
                            Pesquisa paciente, código, estado, prioridade, atendente, requisição, fatura e qualquer outro campo consumido pela recepção.
                          </p>
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-foreground-2">
                      {search ? `${searchResults.length} resultado(s)` : `${searchRows.length} registos indexados`}
                    </span>
                  </div>

                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Pesquisar qualquer dado da recepção..."
                      className="w-full rounded-xl border border-border bg-background/70 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    {carregando ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin" />
                        A indexar os dados da recepção...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        {search
                          ? "Nenhum registo corresponde à pesquisa introduzida."
                          : "Escreva um termo para procurar no universo operacional da recepção."}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {searchResults.slice(0, 12).map((item) => (
                          <SearchResultCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className={GLASS}>
                <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                  <span className="text-sm font-bold text-foreground">Fila do dia</span>
                  {!carregando && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
                      {workspace.queue.length}
                    </span>
                  )}
                </div>

                <div className="max-h-[32rem] space-y-1.5 overflow-y-auto p-2">
                  {carregando ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Carregando fila...
                    </p>
                  ) : workspace.queue.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum check-in aberto hoje.
                    </div>
                  ) : (
                    workspace.queue.map((item) => {
                      const meta = getManchesterMeta(item.priority);
                      return (
                        <Link
                          key={item.id}
                          href={`/reception/reception-checkins/${item.id}`}
                          className={`flex items-center gap-2 rounded-xl border border-l-4 border-white/20 bg-white/30 px-3 py-2 shadow-sm transition hover:bg-white/45 dark:bg-white/5 dark:hover:bg-white/[0.08] ${meta.accentClass} ${meta.animClass}`}
                        >
                          <span
                            className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold leading-none ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {item.patient_name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {item.patient_code || item.custom_id || `#${item.id}`}
                              {item.attendant ? ` · ${item.attendant}` : ""}
                            </p>
                          </div>
                          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-foreground-2">
                              {item.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {fmtDate(item.arrived_at)}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-3">
              <ChatbotPanel
                messages={chatMessages}
                composer={chatComposer}
                loading={chatLoading}
                error={chatError}
                onComposerChange={setChatComposer}
                onPromptClick={(prompt) => void sendChatMessage(prompt)}
                onSubmit={async (event) => {
                  event.preventDefault();
                  await sendChatMessage(chatComposer);
                }}
                onComposerKeyDown={async (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    await sendChatMessage(chatComposer);
                  }
                }}
              />

              <section className={GLASS}>
                <div className="border-b border-border/60 px-4 py-3">
                  <span className="text-sm font-bold text-foreground">Indicadores auxiliares</span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2">
                  <MiniIndicatorTile
                    label="Pacientes novos"
                    value={workspace.summary.new_patients}
                    href="/patients"
                    accent="text-blue-600 dark:text-blue-400"
                    bar="border-l-blue-500 dark:border-l-blue-400"
                  />
                  <MiniIndicatorTile
                    label="Req. pendentes"
                    value={workspace.summary.pending_requests}
                    href="/requests/pendentes"
                    accent="text-amber-600 dark:text-amber-400"
                    bar="border-l-amber-500 dark:border-l-amber-400"
                  />
                  <MiniIndicatorTile
                    label="Faturas abertas"
                    value={workspace.summary.open_invoices}
                    href="/billing/invoices?status=EMIT"
                    accent="text-rose-600 dark:text-rose-400"
                    bar="border-l-rose-500 dark:border-l-rose-400"
                  />
                  <MiniIndicatorTile
                    label="Recibos hoje"
                    value={workspace.summary.receipts_generated_today}
                    href="/payments/receipts"
                    accent="text-emerald-600 dark:text-emerald-400"
                    bar="border-l-emerald-500 dark:border-l-emerald-400"
                  />
                </div>
              </section>

              <section className={GLASS}>
                <div className="border-b border-border/60 px-4 py-3">
                  <span className="text-sm font-bold text-foreground">Atalhos</span>
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  {atalhos.map((atalho) => (
                    <Link
                      key={atalho.href}
                      href={atalho.href}
                      className="group flex items-center gap-2 rounded-xl border border-white/20 bg-white/25 px-3 py-2 shadow-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <atalho.icon size={14} className="text-muted-foreground" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {atalho.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {atalho.description}
                        </p>
                      </div>
                      <ChevronRight
                        size={12}
                        className="shrink-0 text-muted-foreground transition group-hover:text-foreground"
                      />
                    </Link>
                  ))}
                </div>
              </section>

              <section className={GLASS}>
                <div className="border-b border-border/60 px-4 py-3">
                  <span className="text-sm font-bold text-foreground">Marcações</span>
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  {marcacoesPorSector.map((sector) => (
                    <Link
                      key={sector.href}
                      href={sector.href}
                      className="group flex items-center gap-2 rounded-xl border border-white/20 bg-white/25 px-3 py-2 transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08]"
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sector.iconBg}`}
                      >
                        <sector.icon size={14} className={sector.iconColor} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {sector.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {sector.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {(loadingNotes || approvedNotes.length > 0 || rejectedNotes.length > 0) && (
            <div className="grid gap-3 lg:grid-cols-2">
              <ReceptionDecidedSection
                title="Notas de crédito aprovadas"
                icon={<CheckCircle2 size={13} className="text-emerald-600" />}
                rows={approvedNotes}
                loading={loadingNotes}
                emptyMsg="Nenhuma nota de crédito aprovada."
                tone="emerald"
              />
              <ReceptionDecidedSection
                title="Notas de crédito rejeitadas"
                icon={<XCircle size={13} className="text-red-500" />}
                rows={rejectedNotes}
                loading={loadingNotes}
                emptyMsg="Nenhuma nota de crédito rejeitada."
                tone="red"
              />
            </div>
          )}
        </div>
      </AppLayout>

      {showWizard && (
        <PatientIntakeWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => setShowWizard(false)}
        />
      )}
    </>
  );
}

function HeroMetricCard({
  title,
  value,
  icon: Icon,
  accent,
  iconBg,
  iconColor,
  href,
}: {
  title: string;
  value: React.ReactNode;
  icon: typeof Users;
  accent: string;
  iconBg: string;
  iconColor: string;
  href?: string;
}) {
  const content = (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/45 px-3 py-3 pl-4 shadow-sm transition hover:bg-white/60 dark:bg-white/[0.07] dark:hover:bg-white/[0.1]">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <div className="mt-1 text-2xl font-bold leading-none text-foreground">
            {value}
          </div>
        </div>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={15} className={iconColor} />
        </span>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function SearchResultCard({ item }: { item: ReceptionSearchRow }) {
  const statusMeta = item.status ? STATUS_META[item.status] : null;
  const priorityMeta = item.priority ? PRIORITY_META[item.priority] ?? PRIORITY_META.NOR : null;

  return (
    <Link
      href={`/reception/reception-checkins/${item.id}`}
      className="block rounded-xl border border-white/20 bg-white/25 px-3 py-3 shadow-sm transition hover:border-[var(--primary-300)] hover:bg-white/45 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.patient_name || "Paciente sem nome"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {item.patient_code || item.custom_id || `#${item.id}`}
            {item.attendant_name ? ` · ${item.attendant_name}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          {statusMeta ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {item.status_display || statusMeta.label}
            </span>
          ) : null}
          {priorityMeta ? (
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${priorityMeta.cls}`}
            >
              {item.priority_display || priorityMeta.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.request_code ? (
          <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
            REQ {item.request_code}
          </span>
        ) : null}
        {item.invoice_code ? (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            FAT {item.invoice_code}
          </span>
        ) : null}
        {item.reason ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {item.reason}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>Chegada: {fmtDate(item.arrived_at)}</span>
        {item.invoice_total ? (
          <span>
            Total: <MoneyValue value={item.invoice_total} />
          </span>
        ) : null}
        {item.invoice_status_display || item.invoice_status ? (
          <span>Fatura: {item.invoice_status_display || item.invoice_status}</span>
        ) : null}
      </div>
    </Link>
  );
}

function ChatbotPanel({
  messages,
  composer,
  loading,
  error,
  onComposerChange,
  onPromptClick,
  onSubmit,
  onComposerKeyDown,
}: {
  messages: ReceptionChatMessage[];
  composer: string;
  loading: boolean;
  error: string | null;
  onComposerChange: (value: string) => void;
  onPromptClick: (prompt: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => Promise<void>;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [loading, messages]);

  return (
    <section className={`${GLASS} flex min-h-[34rem] flex-col overflow-hidden`}>
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
            <Bot size={15} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Chatbot Substrato</h2>
            <p className="text-[11px] text-muted-foreground">
              Espaço de conversa operacional com contexto vivo da recepção.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-dashed border-border bg-white/20 px-4 py-4 text-sm text-muted-foreground dark:bg-white/[0.03]">
                Pergunte pelo estado da fila, atrasos, falta de faturação ou próxima acção recomendada.
              </div>
              <div className="flex flex-wrap gap-2">
                {chatPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onPromptClick(prompt)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/35 px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-white/55 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                  >
                    <Sparkles size={11} className="text-violet-500" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              const isError = message.role === "error";
              return (
                <div
                  key={message.id}
                  className={isUser ? "ml-auto w-full max-w-[88%]" : "mr-auto w-full max-w-[92%]"}
                >
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isUser
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                        : isError
                          ? "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                          : "border border-white/20 bg-white/60 text-foreground dark:border-white/10 dark:bg-white/[0.06]"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })
          )}

          {loading ? (
            <div className="mr-auto w-full max-w-[92%]">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.06]">
                <Loader2 size={14} className="animate-spin" />
                A pensar...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border/60 p-3">
          {error ? (
            <p className="mb-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}
          <form onSubmit={(event) => void onSubmit(event)} className="space-y-2">
            <textarea
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={(event) => void onComposerKeyDown(event)}
              rows={3}
              placeholder="Escreva uma pergunta para o chatbot Substrato..."
              className="w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/ai"
                className="text-[11px] font-medium text-[var(--primary-600)] hover:underline dark:text-[var(--primary-400)]"
              >
                Abrir IA completa
              </Link>
              <button
                type="submit"
                disabled={loading || !composer.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={13} />
                Enviar
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function MiniIndicatorTile({
  label,
  value,
  href,
  accent,
  bar,
}: {
  label: string;
  value: number | string;
  href?: string;
  accent?: string;
  bar?: string;
}) {
  const inner = (
    <div
      className={`flex flex-col gap-0.5 rounded-xl border border-l-4 border-white/20 bg-white/25 px-3 py-2 backdrop-blur-sm dark:bg-white/5 ${bar ?? "border-l-border"}`}
    >
      <span className="text-[10px] font-medium leading-none text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold leading-tight ${accent ?? "text-foreground"}`}>{value}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }

  return inner;
}

function ReceptionDecidedSection({
  title,
  icon,
  rows,
  loading,
  emptyMsg,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  rows: CreditNoteRow[];
  loading: boolean;
  emptyMsg: string;
  tone: "emerald" | "red";
}) {
  const accentBorder =
    tone === "emerald"
      ? "border-l-emerald-500 dark:border-l-emerald-400"
      : "border-l-red-500 dark:border-l-red-400";
  const borderColor =
    tone === "emerald"
      ? "border-emerald-200 dark:border-emerald-800/50"
      : "border-red-200 dark:border-red-800/50";
  const textColor =
    tone === "emerald"
      ? "text-emerald-800 dark:text-emerald-300"
      : "text-red-800 dark:text-red-300";
  const subTextColor =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-700 dark:text-red-400";
  const amountBg =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";

  return (
    <section className={GLASS}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <div className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted">{icon}</div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {!loading && rows.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
            {rows.length}
          </span>
        )}
      </div>
      <div className="p-2">
        {loading ? (
          <p className="text-[11px] text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            {emptyMsg}
          </div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`relative rounded-lg border border-l-4 ${borderColor} bg-white/30 ${accentBorder} px-2.5 py-2 shadow-sm backdrop-blur-sm dark:bg-white/[0.06]`}
              >
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <div className="min-w-0">
                    <span className={`text-xs font-bold ${textColor}`}>
                      {r.custom_id || `#${r.id}`}
                    </span>
                    {r.invoice_code && (
                      <span className={`ml-1.5 text-[11px] ${subTextColor}`}>{r.invoice_code}</span>
                    )}
                    {r.patient_name && (
                      <span className={`ml-1.5 text-[11px] ${subTextColor}`}>· {r.patient_name}</span>
                    )}
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${amountBg}`}>
                    <MoneyValue value={r.amount} />
                  </span>
                </div>
                {r.reason && <p className={`mt-1 text-[11px] ${subTextColor}`}>{r.reason}</p>}
                <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] ${subTextColor}`}>
                  {r.reviewed_by_name && (
                    <span>
                      Decidido por: <strong>{r.reviewed_by_name}</strong>
                    </span>
                  )}
                  {r.reviewed_at && <span>{fmtDate(r.reviewed_at)}</span>}
                </div>
                {r.decision_note && (
                  <p className={`mt-1 text-[11px] italic ${subTextColor}`}>&quot;{r.decision_note}&quot;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
