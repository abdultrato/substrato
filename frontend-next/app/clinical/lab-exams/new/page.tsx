"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateLabExamPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo LabExam</h1>
        
        <AutoForm
          endpoint="/api/v1/clinical/lab-exams/"
          method="post"
          submitLabel="Criar LabExam"
          onSuccess={(data) => router.push(`./lab-exams/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
