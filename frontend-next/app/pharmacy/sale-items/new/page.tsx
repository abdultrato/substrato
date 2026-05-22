"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateSaleItemPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo SaleItem</h1>
        
        <AutoForm
          endpoint="/api/v1/pharmacy/sale-items/"
          method="post"
          submitLabel="Criar SaleItem"
          onSuccess={(data) => router.push(`./sale-items/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
