"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateProcedureAuthorizationPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo ProcedureAuthorization</h1>
        
        <AutoForm
          endpoint="/api/v1/insurer/procedure-authorizations/"
          method="post"
          submitLabel="Criar ProcedureAuthorization"
          onSuccess={(data) => router.push(`./procedure-authorizations/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
