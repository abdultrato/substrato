"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreatePaymentPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo Payment</h1>
        
        <AutoForm
          endpoint="/api/v1/payments/payments/"
          method="post"
          submitLabel="Criar Payment"
          onSuccess={(data) => router.push(`./payments/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
