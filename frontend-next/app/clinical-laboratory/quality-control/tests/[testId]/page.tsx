"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ChevronRight,
  FileText,
  FlaskConical,
  LineChart as LineChartIcon,
  Loader2,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/quality_control/";

type LabTestField = {
  id: number;
  test: number;
  code?: string;
  name: string;
  unit?: string;
};

type QualityControl = {
  id: number;
  custom_id?: string | null;
  test: number;
  test_name?: string;
  test_code?: string;
  field_name?: string;
  control_type?: string;
  result_mode?: string;
  material_name?: string;
  expected_result: string;
  observed_result: string;
  deviation?: string | null;
  unit?: string;
  material_lot?: string;
  equipment?: string;
  method?: string;
  decision: "APROVADO" | "REJEITADO" | "REVISAO" | "INCOMPLETO";
  decision_display?: string;
  status?: "RASCUNHO" | "AVALIADO" | "REVISTO" | "BLOQUEADO";
  status_display?: string;
  reviewed_at?: string | null;
  approved_for_use: boolean;
  corrective_action_required: boolean;
  run_at?: string;
};

type AnalyteGroup = {
  key: string;
  name: string;
  code?: string;
  unit?: string;
  records: QualityControl[];
  latest?: QualityControl;
  approved: number;
  rejected: number;
  maxDeviation: number | null;
};

type LeveyJenningsPoint = {
  label: string;
  value: number;
  runAt?: string;
  recordId: number;
  customId?: string | null;
  expected: string;
  observed: string;
  decision: string;
};

type LeveyJenningsChart = {
  points: LeveyJenningsPoint[];
  mean: number;
  sd: number;
  unit: string;
};

const decisionClass: Record<QualityControl["decision"], string> = {
  APROVADO: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  REJEITADO: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  REVISAO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  INCOMPLETO: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-300",
};

const accent = [
  { bar: "bg-cyan-500", icon: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/20" },
  { bar: "bg-fuchsia-500", icon: "from-fuchsia-500 to-rose-500", glow: "shadow-fuchsia-500/20" },
  { bar: "bg-violet-500", icon: "from-violet-500 to-indigo-500", glow: "shadow-violet-500/20" },
  { bar: "bg-emerald-500", icon: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/20" },
  { bar: "bg-amber-500", icon: "from-amber-400 to-orange-500", glow: "shadow-amber-500/20" },
];

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function parseDecimal(value?: string | null) {
  if (!value) return null;
  const num = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function fmtRef(value?: string | null) {
  const parsed = parseDecimal(value);
  return parsed === null ? "-" : parsed.toFixed(1);
}

function fmtChartValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "relatorio";
}

function latestOf(records: QualityControl[]) {
  return records.reduce<QualityControl | undefined>((latest, record) => {
    if (!latest) return record;
    if (!record.run_at) return latest;
    if (!latest.run_at) return record;
    return new Date(record.run_at).getTime() > new Date(latest.run_at).getTime() ? record : latest;
  }, undefined);
}

function runSecond(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  date.setMilliseconds(0);
  return date.toISOString();
}

function runTime(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function matchesParam(recordValue: string | undefined, paramValue: string | null) {
  if (!paramValue) return true;
  return (recordValue || "") === paramValue;
}

function matchesRunWindow(record: QualityControl, searchParams: Pick<URLSearchParams, "get">) {
  const runFrom = runTime(searchParams.get("run_from"));
  const runTo = runTime(searchParams.get("run_to"));
  if (runFrom !== null || runTo !== null) {
    const recordTime = runTime(record.run_at);
    if (recordTime === null) return false;
    return recordTime >= (runFrom ?? recordTime) && recordTime <= (runTo ?? recordTime);
  }
  return matchesParam(runSecond(record.run_at), searchParams.get("run_second"));
}

function sameAnalyte(record: QualityControl, group: AnalyteGroup) {
  return (record.field_name || "Exame completo").trim() === group.name;
}

function buildLeveyJenningsChart(group: AnalyteGroup, allRecords: QualityControl[]): LeveyJenningsChart | null {
  const points = allRecords
    .filter((record) => sameAnalyte(record, group))
    .map((record) => ({
      record,
      value: parseDecimal(record.observed_result),
      time: runTime(record.run_at),
    }))
    .filter((item): item is { record: QualityControl; value: number; time: number | null } => item.value !== null)
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    .slice(-12)
    .map((item, index) => ({
      label: String(index + 1),
      value: item.value,
      runAt: item.record.run_at,
      recordId: item.record.id,
      customId: item.record.custom_id,
      expected: item.record.expected_result,
      observed: item.record.observed_result,
      decision: item.record.decision_display || item.record.decision,
    }));

  if (points.length < 3) return null;
  const mean = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const variance = points.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) / (points.length - 1);
  const sd = Math.sqrt(variance);
  return {
    points,
    mean,
    sd,
    unit: group.unit || group.latest?.unit || "",
  };
}

function LeveyJenningsChartView({ chart }: { chart: LeveyJenningsChart }) {
  const limits = chart.sd > 0
    ? [
        { label: "+3DP", value: chart.mean + chart.sd * 3, color: "#ef4444" },
        { label: "+2DP", value: chart.mean + chart.sd * 2, color: "#f59e0b" },
        { label: "+1DP", value: chart.mean + chart.sd, color: "#38bdf8" },
        { label: "Media", value: chart.mean, color: "#10b981" },
        { label: "-1DP", value: chart.mean - chart.sd, color: "#38bdf8" },
        { label: "-2DP", value: chart.mean - chart.sd * 2, color: "#f59e0b" },
        { label: "-3DP", value: chart.mean - chart.sd * 3, color: "#ef4444" },
      ]
    : [{ label: "Media", value: chart.mean, color: "#10b981" }];

  return (
    <div className="mt-2 rounded-md border border-cyan-200/60 bg-cyan-50/50 p-2 dark:border-cyan-800/40 dark:bg-cyan-950/20">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase text-cyan-800 dark:text-cyan-200">Levey-Jennings</span>
        <span className="text-[9px] text-muted-foreground">
          media {fmtChartValue(chart.mean)}{chart.unit ? ` ${chart.unit}` : ""} · DP {fmtChartValue(chart.sd)}
        </span>
      </div>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={chart.points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={42} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(value) => [`${fmtChartValue(Number(value))}${chart.unit ? ` ${chart.unit}` : ""}`, "Obtido"]}
              labelFormatter={(label) => `Registo ${label}`}
              contentStyle={{ borderRadius: 8, border: "1px solid rgba(148, 163, 184, 0.35)", fontSize: 11 }}
            />
            {limits.map((limit) => (
              <ReferenceLine key={limit.label} y={limit.value} stroke={limit.color} strokeDasharray={limit.label === "Media" ? "0" : "4 4"} strokeOpacity={0.75} />
            ))}
            <Line type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2} dot={{ r: 3, fill: "#0891b2" }} activeDot={{ r: 4 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 text-[8px] text-muted-foreground">
        <span>n={chart.points.length}</span>
        <span className="text-center">alerta ±2DP</span>
        <span className="text-right">rejeicao ±3DP</span>
      </div>
    </div>
  );
}

function openPdfReport(filename: string, title: string, body: string) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; font-size: 11px; }
    header { border-bottom: 2px solid #0891b2; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 18px; color: #0f172a; }
    h2 { margin: 14px 0 8px; font-size: 13px; color: #0f172a; }
    .meta { color: #475569; margin-top: 4px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px; }
    .label { color: #64748b; text-transform: uppercase; font-size: 8px; font-weight: 700; }
    .value { margin-top: 3px; font-size: 13px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
    th { background: #ecfeff; color: #155e75; font-size: 9px; text-transform: uppercase; }
    svg { width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 8px; }
    footer { margin-top: 14px; color: #64748b; font-size: 9px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Gerado em ${escapeHtml(new Date().toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }))} · Gestão da Qualidade Laboratorial</div>
  </header>
  ${body}
  <footer>Documento de apoio ao controlo de qualidade. Rever conforme POP/SGQ aplicável.</footer>
  <script>
    document.title = ${JSON.stringify(filename)};
    window.onload = () => { window.focus(); window.print(); };
  </script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function buildChartSvg(chart: LeveyJenningsChart) {
  const width = 920;
  const height = 360;
  const pad = { top: 24, right: 28, bottom: 42, left: 62 };
  const values = chart.points.map((point) => point.value);
  const limitValues = chart.sd > 0
    ? [chart.mean - chart.sd * 3, chart.mean - chart.sd * 2, chart.mean - chart.sd, chart.mean, chart.mean + chart.sd, chart.mean + chart.sd * 2, chart.mean + chart.sd * 3]
    : [chart.mean];
  const min = Math.min(...values, ...limitValues);
  const max = Math.max(...values, ...limitValues);
  const span = max - min || 1;
  const yMin = min - span * 0.08;
  const yMax = max + span * 0.08;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (chart.points.length === 1 ? plotW / 2 : (index / (chart.points.length - 1)) * plotW);
  const y = (value: number) => pad.top + ((yMax - value) / (yMax - yMin)) * plotH;
  const linePath = chart.points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const limits = chart.sd > 0
    ? [
        ["+3DP", chart.mean + chart.sd * 3, "#ef4444"],
        ["+2DP", chart.mean + chart.sd * 2, "#f59e0b"],
        ["+1DP", chart.mean + chart.sd, "#38bdf8"],
        ["Media", chart.mean, "#10b981"],
        ["-1DP", chart.mean - chart.sd, "#38bdf8"],
        ["-2DP", chart.mean - chart.sd * 2, "#f59e0b"],
        ["-3DP", chart.mean - chart.sd * 3, "#ef4444"],
      ] as const
    : [["Media", chart.mean, "#10b981"]] as const;

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico Levey-Jennings">
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#94a3b8" />
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#94a3b8" />
    ${limits.map(([label, value, color]) => `<line x1="${pad.left}" y1="${y(value).toFixed(1)}" x2="${width - pad.right}" y2="${y(value).toFixed(1)}" stroke="${color}" stroke-dasharray="${label === "Media" ? "0" : "6 5"}" stroke-width="1.4" /><text x="${width - pad.right + 4}" y="${(y(value) + 3).toFixed(1)}" font-size="10" fill="${color}">${label}</text>`).join("")}
    <path d="${linePath}" fill="none" stroke="#0891b2" stroke-width="3" />
    ${chart.points.map((point, index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(point.value).toFixed(1)}" r="4" fill="#0891b2" /><text x="${x(index).toFixed(1)}" y="${height - 20}" text-anchor="middle" font-size="10" fill="#475569">${escapeHtml(point.label)}</text>`).join("")}
    <text x="12" y="18" font-size="11" fill="#475569">Obtido (${escapeHtml(chart.unit || "unidade")})</text>
  </svg>`;
}

function generateChartPdf(group: AnalyteGroup, chart: LeveyJenningsChart, title: string) {
  const reportTitle = `Grafico Levey-Jennings - ${group.name}`;
  const body = `
    <div class="meta">${escapeHtml(title)} · Analito: ${escapeHtml(group.name)}</div>
    <div class="summary">
      <div class="box"><div class="label">Pontos</div><div class="value">${chart.points.length}</div></div>
      <div class="box"><div class="label">Media</div><div class="value">${fmtChartValue(chart.mean)} ${escapeHtml(chart.unit)}</div></div>
      <div class="box"><div class="label">Desvio padrao</div><div class="value">${fmtChartValue(chart.sd)}</div></div>
      <div class="box"><div class="label">Regra</div><div class="value">±2DP / ±3DP</div></div>
    </div>
    ${buildChartSvg(chart)}
  `;
  openPdfReport(`grafico_lj_${slug(group.name)}.pdf`, reportTitle, body);
}

function generateTablePdf(group: AnalyteGroup, chart: LeveyJenningsChart | null, title: string) {
  const rows = (chart?.points || group.records.map((record, index) => ({
    label: String(index + 1),
    value: parseDecimal(record.observed_result) ?? 0,
    runAt: record.run_at,
    recordId: record.id,
    customId: record.custom_id,
    expected: record.expected_result,
    observed: record.observed_result,
    decision: record.decision_display || record.decision,
  }))).map((point) => `
    <tr>
      <td>${escapeHtml(point.label)}</td>
      <td>${escapeHtml(point.customId || `#${point.recordId}`)}</td>
      <td>${escapeHtml(fmtDate(point.runAt))}</td>
      <td>${escapeHtml(point.expected)}</td>
      <td>${escapeHtml(point.observed)}</td>
      <td>${escapeHtml(fmtChartValue(point.value))}</td>
      <td>${escapeHtml(point.decision)}</td>
    </tr>
  `).join("");
  const body = `
    <div class="meta">${escapeHtml(title)} · Analito: ${escapeHtml(group.name)}</div>
    <h2>Tabela de registos de controlo</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Registo</th><th>Data</th><th>Esperado</th><th>Obtido</th><th>Valor numerico</th><th>Conclusao</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  openPdfReport(`tabela_cq_${slug(group.name)}.pdf`, `Tabela CQ - ${group.name}`, body);
}

export default function QualityControlTestDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = String((params as any)?.testId || "");
  const [fields, setFields] = useState<LabTestField[]>([]);
  const [records, setRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingKey, setValidatingKey] = useState<string | null>(null);
  const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetchList<LabTestField>("/clinical_laboratory/test_field/", {
        page: 1,
        pageSize: 300,
        query: { test: testId, active: true },
        clientCache: true,
        clientCacheTtlMs: 30000,
      }),
      apiFetchList<QualityControl>(ENDPOINT, {
        page: 1,
        pageSize: 500,
        query: { test: testId },
      }),
    ])
      .then(([fieldResponse, recordResponse]) => {
        setFields(fieldResponse.items);
        setRecords(recordResponse.items);
      })
      .catch((err: any) => setError(err?.message || "Erro ao carregar controlos do exame."))
      .finally(() => setLoading(false));
  }, [testId]);

  const assayRecords = useMemo(
    () =>
      records.filter((record) =>
        matchesRunWindow(record, searchParams) &&
        matchesParam(record.material_lot, searchParams.get("material_lot")) &&
        matchesParam(record.material_name, searchParams.get("material_name")) &&
        matchesParam(record.control_type, searchParams.get("control_type")) &&
        matchesParam(record.result_mode, searchParams.get("result_mode")) &&
        matchesParam(record.equipment, searchParams.get("equipment")) &&
        matchesParam(record.method, searchParams.get("method")),
      ),
    [records, searchParams],
  );

  const groups = useMemo<AnalyteGroup[]>(() => {
    const byName = new Map<string, QualityControl[]>();
    assayRecords.forEach((record) => {
      const key = (record.field_name || "Exame completo").trim();
      byName.set(key, [...(byName.get(key) || []), record]);
    });

    const fieldGroups = fields.map((field) => {
      const recordsForField = byName.get(field.name) || [];
      const latest = latestOf(recordsForField);
      const deviations = recordsForField.map((record) => parseDecimal(record.deviation)).filter((value): value is number => value !== null);
      return {
        key: `field-${field.id}`,
        name: field.name,
        code: field.code,
        unit: field.unit,
        records: recordsForField,
        latest,
        approved: recordsForField.filter((record) => record.decision === "APROVADO").length,
        rejected: recordsForField.filter((record) => record.decision === "REJEITADO").length,
        maxDeviation: deviations.length ? Math.max(...deviations) : null,
      };
    });

    const fieldNames = new Set(fields.map((field) => field.name));
    const extraGroups = Array.from(byName.entries())
      .filter(([name]) => !fieldNames.has(name))
      .map(([name, recordsForField]) => {
        const latest = latestOf(recordsForField);
        const deviations = recordsForField.map((record) => parseDecimal(record.deviation)).filter((value): value is number => value !== null);
        return {
          key: `record-${name}`,
          name,
          records: recordsForField,
          latest,
          approved: recordsForField.filter((record) => record.decision === "APROVADO").length,
          rejected: recordsForField.filter((record) => record.decision === "REJEITADO").length,
          maxDeviation: deviations.length ? Math.max(...deviations) : null,
        };
      });

    return [...fieldGroups, ...extraGroups].filter((group) => group.records.length > 0);
  }, [fields, assayRecords]);

  const latest = latestOf(assayRecords) || latestOf(records);
  const title = latest ? `${latest.test_code ? `${latest.test_code} - ` : ""}${latest.test_name || "Exame"}` : "Controlo de qualidade do exame";
  const rejected = assayRecords.filter((record) => record.decision === "REJEITADO").length;
  const approved = assayRecords.filter((record) => record.decision === "APROVADO").length;

  async function validateAnalyte(group: AnalyteGroup) {
    const canValidate = group.records.length > 0 && group.records.every((record) => record.approved_for_use);
    const alreadyValidated = group.records.length > 0 && group.records.every((record) => record.status === "REVISTO");
    if (!canValidate || alreadyValidated || validatingKey) return;
    setValidatingKey(group.key);
    setError(null);
    const reviewedAt = new Date().toISOString();
    try {
      const updated = await Promise.all(
        group.records.map((record) =>
          apiFetch<QualityControl>(`${ENDPOINT}${record.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ status: "REVISTO", reviewed_at: reviewedAt }),
          }),
        ),
      );
      const byId = new Map(updated.map((record) => [record.id, record]));
      setRecords((prev) => prev.map((record) => byId.get(record.id) || record));
    } catch (err: any) {
      setError(err?.message || "Erro ao validar controlo técnico.");
    } finally {
      setValidatingKey(null);
    }
  }

  function toggleChart(groupKey: string) {
    setVisibleCharts((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-2">
        <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50/80 via-white/70 to-fuchsia-50/60 p-3 shadow-sm backdrop-blur-sm dark:border-cyan-800/30 dark:from-cyan-950/30 dark:via-slate-900/40 dark:to-fuchsia-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-cyan-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white shadow-md shadow-cyan-500/20">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Controlo por analito</p>
                <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
                <p className="text-[11px] text-muted-foreground">{assayRecords.length} registo(s) do ensaio · {groups.length} analito(s)</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/clinical-laboratory/quality-control" className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/40 px-3 text-xs text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]">
                <ArrowLeft size={12} /> Voltar
              </Link>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 pl-2 sm:grid-cols-4">
            {[
              { icon: Beaker, label: "Registos", value: assayRecords.length, color: "text-cyan-500" },
              { icon: CheckCircle2, label: "Aprovados", value: approved, color: "text-emerald-500" },
              { icon: XCircle, label: "Rejeitados", value: rejected, color: "text-red-500" },
              { icon: Activity, label: "Último CQ", value: fmtDate(latest?.run_at), color: "text-fuchsia-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-lg border border-white/50 bg-white/45 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
                  <Icon size={13} className={color} />
                </div>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{loading ? "..." : value}</p>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-white/20 bg-white/30 dark:border-white/10 dark:bg-white/[0.05]">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!loading && groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
            <FlaskConical size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum analito com controlo registado.</p>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {groups.map((group, index) => {
            const latestRecord = group.latest;
            const tone = accent[index % accent.length];
            const canValidate = group.records.length > 0 && group.records.every((record) => record.approved_for_use);
            const validated = group.records.length > 0 && group.records.every((record) => record.status === "REVISTO");
            const isValidating = validatingKey === group.key;
            const chart = buildLeveyJenningsChart(group, records);
            const chartVisible = Boolean(visibleCharts[group.key]);
            return (
              <article key={group.key} className="relative min-h-[168px] rounded-lg border border-white/20 bg-white/45 p-2.5 pl-3.5 shadow-sm backdrop-blur-sm transition hover:-translate-y-px hover:border-white/40 hover:bg-white/60 hover:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]">
                <span className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${tone.bar}`} />
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${tone.icon} text-white shadow-md ${tone.glow}`}>
                    <TestTube2 size={15} />
                  </span>
                  {latestRecord ? (
                    <span className={`shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-semibold ${decisionClass[latestRecord.decision] || decisionClass.INCOMPLETO}`}>
                      {latestRecord.decision_display || latestRecord.decision}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <h2 className="truncate text-xs font-semibold text-foreground">{group.code ? `${group.code} - ` : ""}{group.name}</h2>
                  <p className="truncate text-[10px] text-muted-foreground">{group.records.length} registo(s) · unidade {group.unit || latestRecord?.unit || "não definida"}</p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <span className="rounded-md bg-background/55 px-1.5 py-1">
                    <span className="block truncate text-[8px] font-semibold uppercase text-muted-foreground">Aprovados</span>
                    <strong className="block text-[11px] leading-tight text-foreground">{group.approved}</strong>
                  </span>
                  <span className="rounded-md bg-background/55 px-1.5 py-1">
                    <span className="block truncate text-[8px] font-semibold uppercase text-muted-foreground">Rejeitados</span>
                    <strong className="block text-[11px] leading-tight text-foreground">{group.rejected}</strong>
                  </span>
                  <span className="rounded-md bg-background/55 px-1.5 py-1">
                    <span className="block truncate text-[8px] font-semibold uppercase text-muted-foreground">Maior desvio</span>
                    <strong className="block text-[11px] leading-tight text-foreground">{group.maxDeviation === null ? "-" : fmtRef(String(group.maxDeviation))}</strong>
                  </span>
                </div>
                {latestRecord ? (
                  <div className="mt-2 rounded-md border border-white/30 bg-background/45 p-1.5 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                      <span className="truncate font-mono">{latestRecord.custom_id || `#${latestRecord.id}`}</span>
                      <span className="shrink-0">{fmtDate(latestRecord.run_at)}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <span className="rounded bg-white/50 px-1.5 py-1 dark:bg-white/[0.06]">
                        <span className="block text-[8px] font-semibold uppercase text-muted-foreground">Esperado</span>
                        <strong className="block truncate text-[11px] leading-tight text-foreground">{latestRecord.expected_result}{latestRecord.unit ? ` ${latestRecord.unit}` : ""}</strong>
                      </span>
                      <span className="rounded bg-white/50 px-1.5 py-1 dark:bg-white/[0.06]">
                        <span className="block text-[8px] font-semibold uppercase text-muted-foreground">Obtido</span>
                        <strong className="block truncate text-[11px] leading-tight text-foreground">{latestRecord.observed_result}{latestRecord.unit ? ` ${latestRecord.unit}` : ""}</strong>
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[9px] text-muted-foreground">
                      {latestRecord.material_lot ? `Lote ${latestRecord.material_lot}` : "Sem lote informado"}{latestRecord.corrective_action_required ? " · CAPA requerida" : ""}
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => chart ? toggleChart(group.key) : undefined}
                  disabled={!chart}
                  title={chart ? "Gerar grafico Levey-Jennings" : "Sao necessarios pelo menos 3 registos numericos do mesmo analito"}
                  className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2 text-[10px] font-semibold text-cyan-800 shadow-sm transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none dark:border-cyan-800/40 dark:bg-cyan-950/25 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
                >
                  <LineChartIcon size={11} />
                  {chartVisible ? "Ocultar grafico LJ" : "Gerar grafico LJ"}
                </button>
                {chart && chartVisible ? <LeveyJenningsChartView chart={chart} /> : null}
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => chart ? generateChartPdf(group, chart, title) : undefined}
                    disabled={!chart}
                    title={chart ? "Gerar PDF do grafico Levey-Jennings" : "Sao necessarios pelo menos 3 registos numericos para o grafico"}
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-fuchsia-200 bg-fuchsia-50 px-1.5 text-[9px] font-semibold text-fuchsia-800 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground dark:border-fuchsia-800/40 dark:bg-fuchsia-950/25 dark:text-fuchsia-200"
                  >
                    <LineChartIcon size={10} />
                    PDF grafico
                  </button>
                  <button
                    type="button"
                    onClick={() => generateTablePdf(group, chart, title)}
                    disabled={group.records.length === 0}
                    title="Gerar PDF da tabela de registos do analito"
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 text-[9px] font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground dark:border-violet-800/40 dark:bg-violet-950/25 dark:text-violet-200"
                  >
                    <FileText size={10} />
                    PDF tabela
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => validateAnalyte(group)}
                  disabled={!canValidate || validated || Boolean(validatingKey)}
                  className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                >
                  {isValidating ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  {validated ? "Controlo validado" : canValidate ? "Validar controlo" : "Validação indisponível"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
