"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";

type IntegrationEquipmentsList = { items: any[]; meta: any };

export default function Equipment_IntegrationsIntegrationEquipmentsPage() {
  useAuthGuard();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment_integrations", "integration-equipments", page, search],
    queryFn: async () => {
      return await apiFetchList<any>("/api/v1/equipment_integrations/integration-equipments/?page={page}&search={search}");
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar IntegrationEquipments</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">IntegrationEquipments</h1>
          <Link
            href="./integration-equipments/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Novo IntegrationEquipment
          </Link>
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
                      href={`./integration-equipments/${item.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                    <button
                      onClick={() => window.location.href = `./integration-equipments/${item.id}/edit`}
                      className="text-green-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil((data?.meta.count || 0) / pageSize)}
          onPageChange={setPage}
        />
      </div>
    </AppLayout>
  );
}
