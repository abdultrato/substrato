"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { hasWriteContract } from "@/lib/openapi/writeContract";

type MedicalResultFilesList = { items: any[]; meta: any };

export default function ClinicalMedicalResultFilesPage() {
  useAuthGuard();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const canCreate = hasWriteContract("/clinical/medical-result-files/", "post");
  const canEdit = hasWriteContract("/clinical/medical-result-files/{id}/", "put");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["clinical", "medical-result-files", page, search],
    queryFn: async () => {
      return await apiFetchList<any>("/clinical/medical-result-files/", { page, pageSize, query: { search: search || undefined } });
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar MedicalResultFiles</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">MedicalResultFiles</h1>
          {canCreate ? (
          <Link
            href="./new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Novo MedicalResultFile
          </Link>
          ) : null}
        </div>

        <input
          type="text"
          placeholder="Pesquisar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        />

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item: any) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{item.name || item.title || "—"}</td>
                  <td className="px-4 py-2 space-x-2">
                    <Link
                      href={`./${item.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                    {canEdit ? (
                    <button
                      onClick={() => window.location.href = `./${item.id}/edit`}
                      className="text-green-600 hover:underline"
                    >
                      Editar
                    </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data?.meta?.totalPages || 1}
          onChange={setPage}
        />
      </div>
    </AppLayout>
  );
}
