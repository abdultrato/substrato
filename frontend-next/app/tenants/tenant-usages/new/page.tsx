"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateTenantUsagePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo TenantUsage</h1>
        
        <AutoForm
          endpoint="/api/v1/tenants/tenant-usages/"
          method="post"
          submitLabel="Criar TenantUsage"
          onSuccess={(data) => router.push(`./tenant-usages/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
