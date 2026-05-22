"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAiSuggestedActionPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo AiSuggestedAction</h1>
        
        <AutoForm
          endpoint="/api/v1/ai_assistant/ai-suggested-actions/"
          method="post"
          submitLabel="Criar AiSuggestedAction"
          onSuccess={(data) => router.push(`./ai-suggested-actions/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
