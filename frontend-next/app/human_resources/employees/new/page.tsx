"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateEmployeePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Employee</h1>
        
        <AutoForm
          endpoint="/api/v1/human_resources/employees/"
          method="post"
          submitLabel="Criar Employee"
          onSuccess={(data) => router.push(`./employees/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
