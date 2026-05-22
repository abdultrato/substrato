"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAiMessagePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo AiMessage</h1>
        
        <AutoForm
          endpoint="/ai_assistant/ai-messages/"
          method="post"
          submitLabel="Criar AiMessage"
          onSuccess={(data) => router.push(`../${data.id}`)}
        />
      </div>
    </AppLayout>
  );
}
