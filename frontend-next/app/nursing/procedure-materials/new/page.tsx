"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateProcedureMaterialPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ProcedureMaterial</h1>
        
        <AutoForm
          endpoint="/api/v1/nursing/procedure-materials/"
          method="post"
          submitLabel="Criar ProcedureMaterial"
          onSuccess={(data) => router.push(`./procedure-materials/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
