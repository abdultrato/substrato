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
  "rounded-lg border border-white/20 bg-white/[0.10] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025]";
export default function AfbSmearCreateForm() {
  useAuthGuard();
  const router = useRouter();
  const { t } = useLanguage();

  const config = getResourceFormConfig("clinical_laboratory", "afb_smear", ENDPOINT);

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-[97vw] max-w-none space-y-1.5">
        <section className={`relative overflow-hidden px-3 py-2.5 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 via-cyan-500 to-emerald-500" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/20">
                <TestTubes size={18} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground sm:text-lg">
                  {t("Nova baciloscopia (BAAR)", "New AFB smear")}
                </h1>
                <p className="text-xs text-muted-foreground">{t("Laboratório clínico", "Clinical laboratory")}</p>
              </div>
            </div>

            <Link
              href={LIST_HREF}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/20 bg-white/[0.10] px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/[0.18] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <ArrowLeft size={16} />
              {t("Voltar", "Back")}
            </Link>
          </div>
        </section>

        <section className={`p-2 ${GLASS}`}>
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
