"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateTransactionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Transaction</h1>
        
        <AutoForm
          endpoint="/api/v1/payments/transactions/"
          method="post"
          submitLabel="Criar Transaction"
          onSuccess={(data) => router.push(`./transactions/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
