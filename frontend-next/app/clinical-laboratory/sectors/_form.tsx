"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Microscope, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/sector/";
const BASE_PATH = "/clinical-laboratory/sectors";

type LabSector = {
  id: number;
  custom_id?: string | null;
  code?: string;
  name?: string;
  active?: boolean;
};

const inputCls =
  "w-full rounded-lg border border-border bg-background/85 px-3 py-2 text-sm text-foreground outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function SectorForm({ id }: { id?: string }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [record, setRecord] = useState<LabSector | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editing || !id) return;
    setLoading(true);
    apiFetch<LabSector>(`${ENDPOINT}${id}/`)
      .then((data) => {
        setRecord(data);
        setCode(data.code || "");
        setName(data.name || "");
        setActive(Boolean(data.active));
      })
      .catch((err: any) => setError(err?.message || "Erro ao carregar sector."))
      .finally(() => setLoading(false));
  }, [editing, id]);

  function validate() {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Código obrigatório.";
    if (!name.trim()) next.name = "Nome obrigatório.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        active,
      };
      const saved = await apiFetch<LabSector>(editing ? `${ENDPOINT}${id}/` : ENDPOINT, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      router.push(`${BASE_PATH}/${saved.id || id}`);
    } catch (err: any) {
      setError(err?.message || "Erro ao guardar sector.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/70 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/20">
                  <Microscope size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">
                    Catálogo laboratorial <span className="mx-0.5">/</span> Sectores
                  </p>
                  <h1 className="text-sm font-bold text-foreground">
                    {editing ? name || record?.name || "Editar sector" : "Novo sector"}
                  </h1>
                  <p className="text-[11px] text-muted-foreground">
                    {editing ? record?.custom_id || `#${id}` : "Criar sector técnico do laboratório"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={editing && id ? `${BASE_PATH}/${id}` : BASE_PATH}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/40 px-3 text-xs text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {editing ? "Guardar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Section title="Dados do sector">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Código</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className={`${inputCls} ${fieldErrors.code ? "border-red-300 focus:border-red-400" : ""}`}
                  />
                  {fieldErrors.code ? <span className="text-[11px] text-red-600">{fieldErrors.code}</span> : null}
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Nome</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`${inputCls} ${fieldErrors.name ? "border-red-300 focus:border-red-400" : ""}`}
                  />
                  {fieldErrors.name ? <span className="text-[11px] text-red-600">{fieldErrors.name}</span> : null}
                </label>
              </div>
            </Section>

            <div className="space-y-3">
              <Section title="Estado">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Sector ativo</p>
                    <p className="text-[11px] text-muted-foreground">Controla a exposição no catálogo do laboratório.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive((value) => !value)}
                    aria-pressed={active}
                    className={`inline-flex h-7 min-w-[90px] items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {active ? "Ativo" : "Inativo"}
                  </button>
                </label>
              </Section>

              <Section title="Resumo">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-medium text-foreground">{code.trim() || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Nome</span>
                    <span className="font-medium text-foreground">{name.trim() || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Estado</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px]">
                      <CheckCircle2 size={11} className={active ? "text-emerald-500" : "text-red-500"} />
                      {active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}
      </form>
    </AppLayout>
  );
}
