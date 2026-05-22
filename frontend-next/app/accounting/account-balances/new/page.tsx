"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAccountBalancePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo AccountBalance</h1>
        
        <AutoForm
          endpoint="/api/v1/accounting/account-balances/"
          method="post"
          submitLabel="Criar AccountBalance"
          onSuccess={(data) => router.push(`./account-balances/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
