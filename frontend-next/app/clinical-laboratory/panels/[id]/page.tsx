"use client";

import { useEffect, useState, type ReactNode, type ElementType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  Clock,
  FlaskConical,
  ListChecks,
  Loader2,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabTestPanel = {
  id: number; custom_id: string; code: string; name: string;
  package_price: string; profile_type: string; occupation: string;
  active: boolean; tests: number[];
};

type LabTestLite = { id: number; name: string; code: string; active: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
  standard: "Painel padrão",
  occupational: "Perfil ocupacional",
};

function fmtPrice(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function SectionCard({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabPanelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [panel, setPanel] = useState<LabTestPanel | null>(null);
  const [testMap, setTestMap] = useState<Record<number, LabTestLite>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const [panelData, testsData] = await Promise.all([
          apiFetch<LabTestPanel>(`/clinical_laboratory/panel/${id}/`),
          apiFetchList<LabTestLite>("/clinical_laboratory/test/", { pageSize: 500 }),
        ]);
        setPanel(panelData);
        const map: Record<number, LabTestLite> = {};
        for (const t of testsData.items) map[t.id] = t;
        setTestMap(map);
      } catch (e: any) { setError(e?.message || "Erro ao carregar."); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function toggleActive() {
    if (!panel) return;
    setToggling(true);
    try {
      const action = panel.active ? "inativar" : "ativar";
      const updated = await apiFetch<LabTestPanel>(`/clinical_laboratory/panel/${id}/${action}/`, { method: "POST" });
      setPanel(updated);
    } catch (e: any) { alert(e?.message || "Erro ao alterar estado."); }
    finally { setToggling(false); }
  }

  if (loading) return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Carregando…
      </div>
    </AppLayout>
  );

  if (error || !panel) return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">
        {error || "Painel não encontrado."}
      </div>
    </AppLayout>
  );

  const tests = (panel.tests ?? []).map((tid) => testMap[tid]).filter(Boolean) as LabTestLite[];

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <ListChecks size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold leading-tight text-foreground">{panel.name}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    panel.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400"
                  }`}>{panel.active ? "Ativo" : "Inativo"}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{panel.code} · {panel.custom_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleActive} disabled={toggling}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50">
                {toggling ? <Loader2 size={13} className="animate-spin" /> : panel.active ? <ToggleLeft size={13} /> : <ToggleRight size={13} className="text-emerald-500" />}
                {panel.active ? "Inativar" : "Ativar"}
              </button>
              <Link href={`/clinical-laboratory/panels/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard icon={ListChecks} title="Identificação">
            <div className="divide-y divide-border/30">
              <InfoRow label="Tipo de perfil" value={PROFILE_LABELS[panel.profile_type] ?? panel.profile_type} />
              {panel.profile_type === "occupational" && (
                <InfoRow label="Função / ocupação" value={panel.occupation || "—"} />
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Clock} title="Preço e composição">
            <div className="divide-y divide-border/30">
              <InfoRow label="Preço do pacote" value={<span className="text-base font-bold text-foreground">{fmtPrice(panel.package_price)}</span>} />
              <InfoRow label="Nº de exames" value={`${panel.tests?.length ?? 0}`} />
            </div>
          </SectionCard>
        </div>

        {/* Exames incluídos */}
        <SectionCard icon={FlaskConical} title={`Exames incluídos · ${panel.tests?.length ?? 0}`}>
          {tests.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Nenhum exame associado a este painel.</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {tests.map((t) => (
                <Link key={t.id} href={`/clinical-laboratory/tests/${t.id}`}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2 transition hover:border-violet-300/50 hover:bg-muted/40">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-mono text-muted-foreground">{t.code}</span>
                    <span className="block truncate text-xs font-medium text-foreground">{t.name}</span>
                  </span>
                  <ChevronRight size={13} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

      </div>
    </AppLayout>
  );
}
