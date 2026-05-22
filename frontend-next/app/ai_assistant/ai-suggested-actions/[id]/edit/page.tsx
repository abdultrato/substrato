"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function AiSuggestedActionsEditPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const endpointBase = "/ai_assistant/ai-suggested-actions/";

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["ai_assistant", "ai-suggested-actions", id, "edit"],
    queryFn: async () => await apiFetch(`${endpointBase}${id}/`),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar AiSuggestedActions</div>;
  if (!item) return <div>AiSuggestedActions não encontrado</div>;

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Editar AiSuggestedActions</h1>
        <AutoForm
          endpoint={`${endpointBase}${id}/`}
          method="put"
          initialValues={item}
          submitLabel="Guardar alterações"
          onSuccess={() => router.push(`../`)}
        />
      </div>
    </AppLayout>
  );
}
