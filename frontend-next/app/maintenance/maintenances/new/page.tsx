"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateMaintenancePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Maintenance</h1>
        
        <AutoForm
          endpoint="/api/v1/maintenance/maintenances/"
          method="post"
          submitLabel="Criar Maintenance"
          onSuccess={(data) => router.push(`./maintenances/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
