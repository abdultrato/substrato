"use client";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function CreateAiKnowledgeEntryPage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo AiKnowledgeEntry</h1>
        
        <AutoForm
          endpoint="/api/v1/ai_assistant/ai-knowledge-entries/"
          method="post"
          submitLabel="Criar AiKnowledgeEntry"
          onSuccess={(data) => router.push(`./ai-knowledge-entries/${data.id}`),}
        />
      </div>
    </AppLayout>
  );
}
