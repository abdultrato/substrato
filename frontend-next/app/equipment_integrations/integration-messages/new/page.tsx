"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateIntegrationMessagePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo IntegrationMessage</h1>
        
        <AutoForm
          endpoint="/api/v1/equipment_integrations/integration-messages/"
          method="post"
          submitLabel="Criar IntegrationMessage"
          onSuccess={(data) => router.push(`./integration-messages/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
