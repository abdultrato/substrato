"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreatePatientPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Patient</h1>
        
        <AutoForm
          endpoint="/api/v1/clinical/patients/"
          method="post"
          submitLabel="Criar Patient"
          onSuccess={(data) => router.push(`./patients/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
