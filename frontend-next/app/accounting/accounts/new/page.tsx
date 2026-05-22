"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAccountPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Account</h1>
        
        <AutoForm
          endpoint="/api/v1/accounting/accounts/"
          method="post"
          submitLabel="Criar Account"
          onSuccess={(data) => router.push(`./accounts/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
