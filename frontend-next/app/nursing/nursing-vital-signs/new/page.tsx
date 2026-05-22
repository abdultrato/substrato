"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateNursingVitalSignPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo NursingVitalSign</h1>
        
        <AutoForm
          endpoint="/api/v1/nursing/nursing-vital-signs/"
          method="post"
          submitLabel="Criar NursingVitalSign"
          onSuccess={(data) => router.push(`./nursing-vital-signs/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
