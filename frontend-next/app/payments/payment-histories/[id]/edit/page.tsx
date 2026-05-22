"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function PaymentHistoriesEditPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const endpointBase = "/payments/payment-histories/";

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["payments", "payment-histories", id, "edit"],
    queryFn: async () => await apiFetch(`${endpointBase}${id}/`),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar PaymentHistories</div>;
  if (!item) return <div>PaymentHistories não encontrado</div>;

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Editar PaymentHistories</h1>
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
