"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TestTubes } from "lucide-react";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useLanguage } from "@/hooks/useLanguage";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/afb_smear/";
const LIST_HREF = "/clinical-laboratory/afb-smears";

const GLASS =
  "rounded-2xl border border-white/20 bg-white/[0.18] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]";
export default function AfbSmearCreateForm() {
  useAuthGuard();
  const router = useRouter();
  const { t } = useLanguage();

  const config = getResourceFormConfig("clinical_laboratory", "afb_smear", ENDPOINT);

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-[97vw] max-w-none space-y-2">
        <section className={`relative overflow-hidden p-4 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 via-cyan-500 to-emerald-500" />
          <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-24 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/20">
                <TestTubes size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  {t("Laboratório clínico", "Clinical laboratory")}
                </p>
                <h1 className="text-lg font-bold text-foreground sm:text-xl">
                  {t("Nova baciloscopia (BAAR)", "New AFB smear")}
                </h1>
                <p className="mt-0.5 max-w-4xl text-sm text-muted-foreground">
                  {t(
                    "Registe a leitura da lâmina com rastreabilidade do pedido, da amostra e da graduação observada.",
                    "Record the slide reading with traceability for the order, sample, and observed grade."
                  )}
                </p>
              </div>
            </div>

            <Link
              href={LIST_HREF}
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-white/25 bg-white/20 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <ArrowLeft size={16} />
              {t("Voltar", "Back")}
            </Link>
          </div>
        </section>

        <section className={`p-3 ${GLASS}`}>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-white/35 pb-2 dark:border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("Dados da baciloscopia", "AFB smear data")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  "As 3 etapas estão abertas em simultâneo, em cartões separados, para um registo mais direto.",
                  "All 3 steps stay open at once in separate cards for a more direct workflow."
                )}
              </p>
            </div>
            <span className="rounded-full border border-sky-200/50 bg-sky-100/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 backdrop-blur-sm dark:border-sky-700/30 dark:bg-sky-950/18 dark:text-sky-300">
              97vw
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
      </div>
    </AppLayout>
  );
}
