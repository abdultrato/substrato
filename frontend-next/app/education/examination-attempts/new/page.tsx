"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateExaminationAttemptPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ExaminationAttempt</h1>
        
        <AutoForm
          endpoint="/api/v1/education/examination-attempts/"
          method="post"
          submitLabel="Criar ExaminationAttempt"
          onSuccess={(data) => router.push(`./examination-attempts/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
