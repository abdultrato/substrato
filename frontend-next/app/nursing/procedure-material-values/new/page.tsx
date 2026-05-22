"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateProcedureMaterialValuePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ProcedureMaterialValue</h1>
        
        <AutoForm
          endpoint="/api/v1/nursing/procedure-material-values/"
          method="post"
          submitLabel="Criar ProcedureMaterialValue"
          onSuccess={(data) => router.push(`./procedure-material-values/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
