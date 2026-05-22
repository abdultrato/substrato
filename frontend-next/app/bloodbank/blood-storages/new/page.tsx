"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateBloodStoragePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo BloodStorage</h1>
        
        <AutoForm
          endpoint="/api/v1/bloodbank/blood-storages/"
          method="post"
          submitLabel="Criar BloodStorage"
          onSuccess={(data) => router.push(`./blood-storages/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
