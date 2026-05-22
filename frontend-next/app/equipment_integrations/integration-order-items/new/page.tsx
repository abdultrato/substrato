"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateIntegrationOrderItemPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo IntegrationOrderItem</h1>
        
        <AutoForm
          endpoint="/api/v1/equipment_integrations/integration-order-items/"
          method="post"
          submitLabel="Criar IntegrationOrderItem"
          onSuccess={(data) => router.push(`./integration-order-items/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
