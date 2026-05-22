"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateLedgerEntryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo LedgerEntry</h1>
        
        <AutoForm
          endpoint="/api/v1/accounting/ledger-entries/"
          method="post"
          submitLabel="Criar LedgerEntry"
          onSuccess={(data) => router.push(`./ledger-entries/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
