"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateMaterialRequisitionItemPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo MaterialRequisitionItem</h1>
        
        <AutoForm
          endpoint="/api/v1/pharmacy/material-requisition-items/"
          method="post"
          submitLabel="Criar MaterialRequisitionItem"
          onSuccess={(data) => router.push(`./material-requisition-items/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
