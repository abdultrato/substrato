"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, FlaskConical, TestTubes } from "lucide-react";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useLanguage } from "@/hooks/useLanguage";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/afb_smear/";
const LIST_HREF = "/clinical-laboratory/afb-smears";

const GLASS =
  "rounded-2xl border border-white/30 bg-white/65 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]";
const GLASS_SOFT =
  "rounded-xl border border-white/35 bg-white/55 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

export default function AfbSmearCreateForm() {
  useAuthGuard();
  const router = useRouter();
  const { t } = useLanguage();

  const config = getResourceFormConfig("clinical_laboratory", "afb_smear", ENDPOINT);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className={`relative overflow-hidden p-5 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 via-cyan-500 to-emerald-500" />
          <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-24 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/20">
                <TestTubes size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  {t("Laboratório clínico", "Clinical laboratory")}
                </p>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {t("Nova baciloscopia (BAAR)", "New AFB smear")}
                </h1>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {t(
                    "Registe a leitura da lâmina com rastreabilidade do pedido, da amostra e da graduação observada.",
                    "Record the slide reading with traceability for the order, sample, and observed grade."
                  )}
                </p>
              </div>
            </div>

            <Link
              href={LIST_HREF}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/40 bg-white/70 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
            >
              <ArrowLeft size={16} />
              {t("Voltar", "Back")}
            </Link>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className={`p-5 ${GLASS}`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/35 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("Dados da baciloscopia", "AFB smear data")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "Preencha o vínculo operacional primeiro e depois a leitura microscópica.",
                    "Fill in the operational traceability first, then the microscopic reading."
                  )}
                </p>
              </div>
              <span className="rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-700/30 dark:bg-sky-950/25 dark:text-sky-300">
                BAAR
              </span>
            </div>

            <AutoForm
              endpoint={ENDPOINT}
              method="post"
              submitLabel={t("Guardar baciloscopia", "Save AFB smear")}
              config={config}
              onSuccess={() => router.push(LIST_HREF)}
            />
          </section>

          <aside className="space-y-3">
            <section className={`p-4 ${GLASS_SOFT}`}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardList size={16} className="text-sky-600 dark:text-sky-300" />
                {t("Fluxo sugerido", "Suggested flow")}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t("1. Escolha o item do pedido antes de informar o resultado.", "1. Choose the order item before entering the result.")}</li>
                <li>{t("2. Associe a amostra e o executante para manter a rastreabilidade.", "2. Link the sample and performer to keep traceability.")}</li>
                <li>{t("3. Registe a graduação e a contagem de forma curta e padronizada.", "3. Record grade and count in a short, standardized way.")}</li>
              </ul>
            </section>

            <section className={`p-4 ${GLASS_SOFT}`}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <FlaskConical size={16} className="text-emerald-600 dark:text-emerald-300" />
                {t("Leitura microscópica", "Microscopic reading")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Use `Coloração`, `Graduação` e `Contagem BAAR` em conjunto para descrever a observação principal da lâmina.",
                  "Use `Stain`, `Grade`, and `AFB count` together to describe the slide's primary observation."
                )}
              </p>
            </section>

            <section className={`p-4 ${GLASS_SOFT}`}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <TestTubes size={16} className="text-amber-600 dark:text-amber-300" />
                {t("Rastreabilidade", "Traceability")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Se a leitura foi feita fora do fluxo principal, use `Observações` para anotar contexto, qualidade da amostra ou necessidade de repetição.",
                  "If the reading happened outside the main flow, use `Notes` to capture context, sample quality, or repeat needs."
                )}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
