"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateNursingRecordPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo NursingRecord</h1>
        
        <AutoForm
          endpoint="/api/v1/nursing/nursing-records/"
          method="post"
          submitLabel="Criar NursingRecord"
          onSuccess={(data) => router.push(`./nursing-records/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
