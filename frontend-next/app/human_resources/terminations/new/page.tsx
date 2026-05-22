"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateTerminationPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Termination</h1>
        
        <AutoForm
          endpoint="/api/v1/human_resources/terminations/"
          method="post"
          submitLabel="Criar Termination"
          onSuccess={(data) => router.push(`./terminations/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
