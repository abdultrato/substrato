"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateBloodStockMovementPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo BloodStockMovement</h1>
        
        <AutoForm
          endpoint="/api/v1/bloodbank/blood-stock-movements/"
          method="post"
          submitLabel="Criar BloodStockMovement"
          onSuccess={(data) => router.push(`./blood-stock-movements/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
