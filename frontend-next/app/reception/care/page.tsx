"use client";

import Link from "next/link";

import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

export default function ReceptionCarePage() {
  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title="Recepcao / Atendimento"
          subtitle="Este recurso aceita criacao de atendimento e consulta por identificador; a API atual nao expoe listagem de atendimentos."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/reception/care/new"
                className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md"
              >
                Novo atendimento
              </Link>
              <Link
                href="/reception"
                className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
              >
                Voltar
              </Link>
            </div>
          }
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--gray-700)] shadow-sm">
          Abra um atendimento novo ou acesse um atendimento existente pelo link direto com identificador.
        </div>
      </div>
    </AppLayout>
  );
}
