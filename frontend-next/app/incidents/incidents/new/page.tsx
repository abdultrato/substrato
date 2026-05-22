"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateIncidentPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Incident</h1>
        
        <AutoForm
          endpoint="/api/v1/incidents/incidents/"
          method="post"
          submitLabel="Criar Incident"
          onSuccess={(data) => router.push(`./incidents/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
