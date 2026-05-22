"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateParentCategoryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ParentCategory</h1>
        
        <AutoForm
          endpoint="/api/v1/pharmacy/parent-categories/"
          method="post"
          submitLabel="Criar ParentCategory"
          onSuccess={(data) => router.push(`./parent-categories/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
