"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  DollarSign,
  Edit2,
  FlaskConical,
  Loader2,
  TestTube2,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [
  GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM, GROUPS.LABORATORIO, GROUPS.RECEPCAO,
];

interface SampleDetail { id: number; name: string; }

interface ExamField {
  id: number;
  name: string;
  unit: string;
  type: string;
  reference_min?: string | null;
  reference_max?: string | null;
  critical_min?: string | null;
  critical_max?: string | null;
  position?: number;
}

interface LabExam {
  id: number;
  custom_id: string;
  name: string;
  turnaround_hours: number;
  price: string;
  vat_percentage: string;
  applies_vat_by_default: boolean;
  method: string;
  sector: string;
  sample_type: number | null;
  sample_type_name: string | null;
  sample_options: number[];
  sample_options_details: SampleDetail[];
  created_at: string;
  updated_at: string;
}

const SECTOR_CHIP: Record<string, string> = {
  Hematologia:        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  Bioquimica:         "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  Microbiologia:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  Imunologia:         "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  Serologia:          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700/40 dark:bg-purple-900/20 dark:text-purple-300",
  BiologiaMolecular:  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  Virologia:          "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300",
  Coagulacao:         "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  Urinalise:          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  Hormonios:          "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",
};

const SECTOR_BAR: Record<string, string> = {
  Hematologia: "bg-rose-500", Bioquimica: "bg-amber-500", Microbiologia: "bg-emerald-500",
  Imunologia: "bg-violet-500", Serologia: "bg-purple-500", BiologiaMolecular: "bg-indigo-500",
  Virologia: "bg-cyan-500", Coagulacao: "bg-red-500", Urinalise: "bg-blue-500", Hormonios: "bg-pink-500",
};

function chipFor(sector: string) {
  return SECTOR_CHIP[sector] ?? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400";
}
function barFor(sector: string) {
  return SECTOR_BAR[sector] ?? "bg-slate-400";
}
function fmtPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? n.toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MT" : price;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-sky-600 dark:text-sky-400" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-44 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export default function ExamDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [exam, setExam]       = useState<LabExam | null>(null);
  const [fields, setFields]   = useState<ExamField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch<LabExam>(`/clinical/lab-exams/${id}/`),
      apiFetchList<ExamField>("/clinical/examfield/", { page: 1, pageSize: 200, query: { exam: id } }),
    ])
      .then(([examData, { items }]) => {
        setExam(examData);
        setFields([...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
      })
      .catch(() => setError("Exame não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !exam) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar exame."}
      </div>
    </AppLayout>
  );

  const bar  = barFor(exam.sector);
  const chip = chipFor(exam.sector);
  const priceTotal = exam.applies_vat_by_default
    ? Number(exam.price) * (1 + Number(exam.vat_percentage) / 100)
    : Number(exam.price);

  return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-md shadow-sky-500/30">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/exams" className="hover:underline">Exames</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{exam.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{exam.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chip}`}>
                  {exam.sector}
                </span>
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300">
                  <Clock size={9} className="mr-1" />{exam.turnaround_hours}h TAT
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/exams/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-cyan-700">
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={FlaskConical} title="Identificação" accent={bar}>
            <div className="space-y-0.5">
              <Row label="Nome" value={<span className="font-semibold">{exam.name}</span>} />
              <Row label="Referência" value={<span className="font-mono text-[10px]">{exam.custom_id}</span>} />
              <Row label="Setor" value={
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${chip}`}>{exam.sector}</span>
              } />
              <Row label="Método" value={exam.method} />
            </div>
          </Card>

          {/* Preço e IVA */}
          <Card icon={DollarSign} title="Preço e facturação" accent="bg-sky-500">
            <div className="space-y-0.5">
              <Row label="Preço base" value={<span className="font-semibold text-sky-700 dark:text-sky-300">{fmtPrice(exam.price)}</span>} />
              <Row label="IVA (%)" value={`${exam.vat_percentage}%`} />
              <Row label="IVA por padrão" value={exam.applies_vat_by_default ? "✅ Sim" : "☐ Não"} />
              {exam.applies_vat_by_default && (
                <Row label="Total c/ IVA" value={
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {priceTotal.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
                  </span>
                } />
              )}
            </div>
          </Card>

          {/* Amostra */}
          <Card icon={TestTube2} title="Amostra" accent="bg-cyan-500">
            <div className="space-y-0.5">
              <Row label="Amostra principal" value={exam.sample_type_name || "—"} />
              {exam.sample_options_details?.length > 0 && (
                <Row label="Amostras alternativas" value={
                  <div className="flex flex-wrap gap-1">
                    {exam.sample_options_details.map((s) => (
                      <span key={s.id} className="rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                        {s.name}
                      </span>
                    ))}
                  </div>
                } />
              )}
              <Row label="Tempo de resposta" value={`${exam.turnaround_hours} horas`} />
            </div>
          </Card>

          {/* Registo */}
          <Card icon={ClipboardList} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Criado em" value={fmtDate(exam.created_at)} />
              <Row label="Actualizado" value={fmtDate(exam.updated_at)} />
            </div>
          </Card>

          {/* Analitos / campos de resultado */}
          <div className="lg:col-span-2">
            <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-indigo-500 to-violet-600" />
              <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
                <ClipboardList size={11} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-[11px] font-semibold text-foreground">Analitos e valores de referência</h2>
                <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                  {fields.length}
                </span>
              </div>
              {fields.length === 0 ? (
                <p className="px-4 py-5 text-center text-[11px] text-muted-foreground">Nenhum analito definido para este exame.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border/50 bg-white/10 dark:bg-white/5">
                        <th className="px-4 py-1.5 text-left font-semibold text-foreground">#</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Analito</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Tipo</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-foreground">Unidade</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-emerald-600 dark:text-emerald-400">Ref. mín</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-emerald-600 dark:text-emerald-400">Ref. máx</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-red-600 dark:text-red-400">Crítico mín</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-red-600 dark:text-red-400">Crítico máx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {fields.map((f, i) => (
                        <tr key={f.id} className="hover:bg-white/20 dark:hover:bg-white/5">
                          <td className="px-4 py-1.5 text-center text-[10px] text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-foreground">{f.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{f.type}</td>
                          <td className="px-3 py-1.5 font-mono text-muted-foreground">{f.unit || "—"}</td>
                          <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-400">{f.reference_min ?? "—"}</td>
                          <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-400">{f.reference_max ?? "—"}</td>
                          <td className="px-3 py-1.5 font-semibold text-red-600 dark:text-red-400">{f.critical_min ?? "—"}</td>
                          <td className="px-3 py-1.5 font-semibold text-red-600 dark:text-red-400">{f.critical_max ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
