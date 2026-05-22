"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateLabRequestPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo LabRequest</h1>
        
        <AutoForm
          endpoint="/api/v1/clinical/lab-requests/"
          method="post"
          submitLabel="Criar LabRequest"
          onSuccess={(data) => router.push(`./lab-requests/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
