"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateTransactionalOutboxEventPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo TransactionalOutboxEvent</h1>
        
        <AutoForm
          endpoint="/api/v1/monitoring/transactional-outbox-events/"
          method="post"
          submitLabel="Criar TransactionalOutboxEvent"
          onSuccess={(data) => router.push(`./transactional-outbox-events/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
