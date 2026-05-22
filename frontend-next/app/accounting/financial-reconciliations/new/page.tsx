"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateFinancialReconciliationPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo FinancialReconciliation</h1>
        
        <AutoForm
          endpoint="/accounting/financial-reconciliations/"
          method="post"
          submitLabel="Criar FinancialReconciliation"
          onSuccess={(data) => router.push(`../${data.id}`)}
        />
      </div>
    </AppLayout>
  );
}
