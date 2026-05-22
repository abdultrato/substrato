"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateDailyInspectionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo DailyInspection</h1>
        
        <AutoForm
          endpoint="/api/v1/inspections/daily-inspections/"
          method="post"
          submitLabel="Criar DailyInspection"
          onSuccess={(data) => router.push(`./daily-inspections/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
