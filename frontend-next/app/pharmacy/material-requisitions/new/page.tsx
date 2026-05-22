"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateMaterialRequisitionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo MaterialRequisition</h1>
        
        <AutoForm
          endpoint="/api/v1/pharmacy/material-requisitions/"
          method="post"
          submitLabel="Criar MaterialRequisition"
          onSuccess={(data) => router.push(`./material-requisitions/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
