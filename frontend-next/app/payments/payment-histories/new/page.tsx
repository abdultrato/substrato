"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreatePaymentHistoryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo PaymentHistory</h1>
        
        <AutoForm
          endpoint="/api/v1/payments/payment-histories/"
          method="post"
          submitLabel="Criar PaymentHistory"
          onSuccess={(data) => router.push(`./payment-histories/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
