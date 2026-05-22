"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { hasWriteContract } from "@/lib/openapi/writeContract";

type NursingVitalSignsList = { items: any[]; meta: any };

export default function NursingNursingVitalSignsPage() {
  useAuthGuard();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const canCreate = hasWriteContract("/nursing/nursing-vital-signs/", "post");
  const canEdit = hasWriteContract("/nursing/nursing-vital-signs/{id}/", "put");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["nursing", "nursing-vital-signs", page, search],
    queryFn: async () => {
      return await apiFetchList<any>("/nursing/nursing-vital-signs/", { page, pageSize, query: { search: search || undefined } });
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar NursingVitalSigns</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">NursingVitalSigns</h1>
          {canCreate ? (
          <Link
            href="./new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Novo NursingVitalSign
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
