"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateTenantConfigurationPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo TenantConfiguration</h1>
        
        <AutoForm
          endpoint="/api/v1/tenants/tenant-configurations/"
          method="post"
          submitLabel="Criar TenantConfiguration"
          onSuccess={(data) => router.push(`./tenant-configurations/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
