"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateCoveragePlanPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo CoveragePlan</h1>
        
        <AutoForm
          endpoint="/api/v1/insurer/coverage-plans/"
          method="post"
          submitLabel="Criar CoveragePlan"
          onSuccess={(data) => router.push(`./coverage-plans/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
