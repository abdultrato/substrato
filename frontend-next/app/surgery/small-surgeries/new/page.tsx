"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateSmallSurgeryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo SmallSurgery</h1>
        
        <AutoForm
          endpoint="/api/v1/surgery/small-surgeries/"
          method="post"
          submitLabel="Criar SmallSurgery"
          onSuccess={(data) => router.push(`./small-surgeries/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
