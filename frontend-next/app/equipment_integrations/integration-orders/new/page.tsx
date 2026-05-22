"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateIntegrationOrderPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo IntegrationOrder</h1>
        
        <AutoForm
          endpoint="/api/v1/equipment_integrations/integration-orders/"
          method="post"
          submitLabel="Criar IntegrationOrder"
          onSuccess={(data) => router.push(`./integration-orders/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
