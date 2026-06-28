"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Layers, ListChecks, Stethoscope } from "lucide-react";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { GROUPS } from "@/lib/rbac";

const ENDPOINT = "/nursing/procedure_item/";
const LIST_HREF = "/nursing/procedure-items";
const COMPACT_FIELDS = ["quantity", "position"];

const guidance = [
  {
    title: "Procedimento",
    description: "Associe o item ao procedimento clínico correto.",
    icon: Stethoscope,
    tone: "from-sky-500 to-cyan-500",
    surface: "border-sky-200/40 from-sky-100/[0.18] via-white/[0.07] to-cyan-100/[0.10] dark:border-sky-800/25 dark:from-sky-950/[0.12] dark:via-white/[0.025] dark:to-cyan-950/[0.08]",
    titleTone: "text-sky-800 dark:text-sky-200",
  },
  {
    title: "Item e quantidade",
    description: "Defina o catálogo, a quantidade e a posição de execução.",
    icon: Layers,
    tone: "from-violet-500 to-indigo-500",
    surface: "border-violet-200/40 from-violet-100/[0.18] via-white/[0.07] to-indigo-100/[0.10] dark:border-violet-800/25 dark:from-violet-950/[0.12] dark:via-white/[0.025] dark:to-indigo-950/[0.08]",
    titleTone: "text-violet-800 dark:text-violet-200",
  },
  {
    title: "Acompanhamento",
    description: "O estado operacional será acompanhado na ficha do item.",
    icon: ListChecks,
    tone: "from-emerald-500 to-teal-500",
    surface: "border-emerald-200/40 from-emerald-100/[0.18] via-white/[0.07] to-teal-100/[0.10] dark:border-emerald-800/25 dark:from-emerald-950/[0.12] dark:via-white/[0.025] dark:to-teal-950/[0.08]",
    titleTone: "text-emerald-800 dark:text-emerald-200",
  },
];

export default function CreateProcedureItemPage() {
  const router = useRouter();
  const config = getResourceFormConfig("nursing", "procedure_item", ENDPOINT);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <header className="relative overflow-hidden rounded-2xl border border-sky-200/40 bg-gradient-to-br from-sky-100/[0.18] via-white/[0.07] to-indigo-100/[0.12] p-4 shadow-xl shadow-sky-950/5 backdrop-blur-2xl dark:border-sky-800/25 dark:from-sky-950/[0.12] dark:via-white/[0.025] dark:to-indigo-950/[0.08]">
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/25">
                <ClipboardCheck size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                  Execução de enfermagem
                </p>
                <h1 className="text-xl font-bold text-foreground">Novo item de procedimento</h1>
                <p className="text-xs text-muted-foreground">
                  Registe um item clínico e vincule-o ao procedimento do paciente.
                </p>
              </div>
            </div>

            <Link
              href={LIST_HREF}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/40 bg-white/25 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-lg transition hover:bg-white/45 dark:border-white/10 dark:bg-white/5"
            >
              <ArrowLeft size={13} /> Voltar aos itens
            </Link>
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-3">
          {guidance.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`flex min-w-0 items-start gap-2.5 rounded-xl border bg-gradient-to-br p-3 shadow-md shadow-slate-900/5 backdrop-blur-2xl ${item.surface}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.tone} text-white shadow-sm`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <h2 className={`text-xs font-semibold ${item.titleTone}`}>{item.title}</h2>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </article>
            );
          })}
        </section>

        <AutoForm
          endpoint={ENDPOINT}
          method="post"
          submitLabel="Criar item"
          config={config}
          presentation="modern-nursing"
          compactFields={COMPACT_FIELDS}
          onSuccess={(data) => {
            const id = data?.id ?? data?.pk;
            router.push(id ? `${LIST_HREF}/${encodeURIComponent(String(id))}` : LIST_HREF);
          }}
        />
      </div>
    </AppLayout>
  );
}
