"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateLabExamFieldPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo LabExamField</h1>
        
        <AutoForm
          endpoint="/api/v1/clinical/lab-exam-fields/"
          method="post"
          submitLabel="Criar LabExamField"
          onSuccess={(data) => router.push(`./lab-exam-fields/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
