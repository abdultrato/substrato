"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateProfessionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Profession</h1>
        
        <AutoForm
          endpoint="/api/v1/human_resources/professions/"
          method="post"
          submitLabel="Criar Profession"
          onSuccess={(data) => router.push(`./professions/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
