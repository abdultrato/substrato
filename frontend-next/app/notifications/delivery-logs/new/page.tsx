"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateDeliveryLogPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo DeliveryLog</h1>
        
        <AutoForm
          endpoint="/api/v1/notifications/delivery-logs/"
          method="post"
          submitLabel="Criar DeliveryLog"
          onSuccess={(data) => router.push(`./delivery-logs/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
