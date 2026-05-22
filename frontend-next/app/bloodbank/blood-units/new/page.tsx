"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateBloodUnitPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo BloodUnit</h1>
        
        <AutoForm
          endpoint="/api/v1/bloodbank/blood-units/"
          method="post"
          submitLabel="Criar BloodUnit"
          onSuccess={(data) => router.push(`./blood-units/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
