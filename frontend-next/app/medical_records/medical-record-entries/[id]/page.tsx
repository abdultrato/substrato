"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";
import { hasWriteContract } from "@/lib/openapi/writeContract";

export default function MedicalRecordEntriesDetailPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const endpointBase = "/medical_records/medical-record-entries/";
  const canEdit = hasWriteContract(`${endpointBase}{id}/`, "put");

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["medical_records", "medical-record-entries", id],
    queryFn: async () => await apiFetch(`${endpointBase}${id}/`),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar MedicalRecordEntries</div>;
  if (!item) return <div>MedicalRecordEntries não encontrado</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{item.name || item.title || `MedicalRecordEntries #${id}`}</h1>
          <div className="space-x-2">
            {canEdit ? (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </button>
            ) : null}
            <button
              onClick={async () => {
                if (confirm("Tem certeza?")) {
                  await apiFetch(`${endpointBase}${id}/`, { method: "DELETE" });
                  router.push(`../`);
                }
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Deletar
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Voltar
            </button>
          </div>
        </div>

        {isEditing && canEdit ? (
          <AutoForm
            endpoint={`${endpointBase}${id}/`}
            method="put"
            initialValues={item}
            submitLabel="Salvar MedicalRecordEntries"
            onSuccess={() => {
              setIsEditing(false);
              window.location.reload();
            }}
          />
        ) : (
          <div className="space-y-2 rounded-lg border p-4">
            {Object.entries(item).map(([key, value]) => (
              <div key={key} className="border-b py-2 last:border-b-0">
                <span className="font-semibold capitalize">{key}:</span> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
