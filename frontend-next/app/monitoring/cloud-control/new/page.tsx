"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AutoForm from "@/components/form/AutoForm";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import useAuthGuard from "@/hooks/useAuthGuard";
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/monitoring/cloud_control/";
const LIST_HREF = "/monitoring/cloud-control";

export default function MonitoringCloudControlCreatePage() {
  const { loading } = useAuthGuard();
  const router = useRouter();

  if (loading) return null;

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("monitoring")}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title="Novo cloud control"
          actions={
            <Link
              href={LIST_HREF}
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              Voltar
            </Link>
          }
        />

        <AutoForm
          endpoint={ENDPOINT}
          method="post"
          submitLabel="Criar"
          config={getResourceFormConfig("monitoring", "cloud_control", ENDPOINT)}
          onSuccess={() => router.push(LIST_HREF)}
        />
      </div>
    </AppLayout>
  );
}
