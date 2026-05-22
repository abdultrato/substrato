"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateUserActivityPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo UserActivity</h1>
        
        <AutoForm
          endpoint="/audit_activities/user-activities/"
          method="post"
          submitLabel="Criar UserActivity"
          onSuccess={(data) => router.push(`../${data.id}`)}
        />
      </div>
    </AppLayout>
  );
}
