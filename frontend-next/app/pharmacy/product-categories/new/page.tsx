"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateProductCategoryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ProductCategory</h1>
        
        <AutoForm
          endpoint="/api/v1/pharmacy/product-categories/"
          method="post"
          submitLabel="Criar ProductCategory"
          onSuccess={(data) => router.push(`./product-categories/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
