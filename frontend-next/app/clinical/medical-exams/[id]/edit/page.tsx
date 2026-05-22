"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function MedicalExamsEditPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const endpointBase = "/clinical/medical-exams/";

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["clinical", "medical-exams", id, "edit"],
    queryFn: async () => await apiFetch(`${endpointBase}${id}/`),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar MedicalExams</div>;
  if (!item) return <div>MedicalExams não encontrado</div>;

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Editar MedicalExams</h1>
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
