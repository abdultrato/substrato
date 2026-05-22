"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAiPolicyEventPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo AiPolicyEvent</h1>
        
        <AutoForm
          endpoint="/api/v1/ai_assistant/ai-policy-events/"
          method="post"
          submitLabel="Criar AiPolicyEvent"
          onSuccess={(data) => router.push(`./ai-policy-events/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
