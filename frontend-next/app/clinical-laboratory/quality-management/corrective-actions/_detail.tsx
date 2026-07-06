"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileWarning,
  Pencil,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import {
  ACTION_TYPES,
  BASE_PATH,
  EDIT_GROUPS,
  ENDPOINT,
  STATUS_CHOICES,
  T_NONCONFORMITY,
  T_RESPONSIBLE,
  type CorrectiveAction,
  pickLabel,
} from "./_form";

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/25 bg-white/30 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2 pl-4">
        <Icon size={12} className="text-orange-600 dark:text-orange-300" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-3 pl-4 text-xs text-foreground">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function CorrectiveActionDetail({ id }: { id: string }) {
  useAuthGuard();
  const router = useRouter();
  const [record, setRecord] = useState<CorrectiveAction | null>(null);
  const [nonconformityLabel, setNonconformityLabel] = useState("");
  const [responsibleLabel, setResponsibleLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const typeMeta = useMemo(() => ACTION_TYPES.find((item) => item.value === record?.action_type) ?? ACTION_TYPES[0], [record?.action_type]);
  const statusMeta = useMemo(() => STATUS_CHOICES.find((item) => item.value === record?.status) ?? STATUS_CHOICES[0], [record?.status]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    apiFetch<CorrectiveAction>(`${ENDPOINT}${id}/`)
      .then((data) => {
        setRecord(data);
        if (data.nonconformity) {
          apiFetch<Record<string, any>>(`/clinical_laboratory/nonconformity/${data.nonconformity}/`)
            .then((row) => setNonconformityLabel(pickLabel(row, T_NONCONFORMITY)))
            .catch(() => setNonconformityLabel(`Não conformidade #${data.nonconformity}`));
        }
        if (data.responsible) {
          apiFetch<Record<string, any>>(`/identity/user/${data.responsible}/`)
            .then((row) => setResponsibleLabel(pickLabel(row, T_RESPONSIBLE)))
            .catch(() => setResponsibleLabel(`Responsável #${data.responsible}`));
        }
      })
      .catch((err) => setError(err?.message || "Erro ao carregar ação corretiva."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !record) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error || "Ação corretiva não encontrada."}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${statusMeta.bar}`} />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25">
              <Wrench size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management" className="hover:underline">Gestão da qualidade</Link>
                <span>/</span>
                <Link href={BASE_PATH} className="hover:underline">CAPA</Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{record.custom_id || `#${record.id}`}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{record.description || "Ação corretiva/preventiva"}</h1>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeMeta.chip}`}>{typeMeta.label}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.chip}`}>{statusMeta.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`${BASE_PATH}/${record.id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 text-xs font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-700 hover:to-amber-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <Card icon={FileWarning} title="Vínculo da CAPA" accent={typeMeta.bar}>
            <Row label="Não conformidade" value={nonconformityLabel || (record.nonconformity ? `#${record.nonconformity}` : "—")} />
            <Row label="Tipo" value={typeMeta.label} />
            <Row label="Estado" value={statusMeta.label} />
          </Card>

          <Card icon={CalendarDays} title="Prazos" accent={statusMeta.bar}>
            <Row label="Prazo" value={fmtDate(record.due_date)} />
            <Row label="Conclusão" value={fmtDate(record.completion_date)} />
            <Row label="Responsável" value={responsibleLabel || (record.responsible ? `#${record.responsible}` : "—")} />
          </Card>

          <div className="lg:col-span-2">
            <Card icon={ClipboardCheck} title="Plano de ação" accent="bg-orange-500">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{record.description || "—"}</p>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card icon={ShieldCheck} title="Verificação de eficácia" accent="bg-violet-500">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{record.effectiveness_check || "—"}</p>
            </Card>
          </div>

          <Card icon={UserRound} title="Auditoria" accent="bg-slate-400">
            <Row label="Código" value={record.custom_id || `#${record.id}`} />
            <Row label="ID" value={`#${record.id}`} />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
