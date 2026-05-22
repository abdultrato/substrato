"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateNursingEvolutionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo NursingEvolution</h1>
        
        <AutoForm
          endpoint="/api/v1/nursing/nursing-evolutions/"
          method="post"
          submitLabel="Criar NursingEvolution"
          onSuccess={(data) => router.push(`./nursing-evolutions/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
