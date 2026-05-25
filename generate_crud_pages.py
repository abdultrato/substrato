#!/usr/bin/env python3
"""
Gerador automático de páginas CRUD para o frontend Next.js
Lê SUBSTRATO_MAPEAMENTO_COMPLETO.json e gera páginas para TODOS os modelos
"""

import json
import logging
from pathlib import Path
import sys
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Constantes
FRONTEND_PATH = Path("frontend-next/app")
MAPEAMENTO_FILE = "SUBSTRATO_MAPEAMENTO_COMPLETO.json"

# Templates de páginas (usando Template para evitar conflito de chaves)
TEMPLATE_PAGE_LIST = '''\"use client\";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";

type $ModelNamePluralList = { items: any[]; meta: any };

export default function $ModuleName$ModelNamePluralPage() {
  useAuthGuard();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["$module", "$model_plural", page, search],
    queryFn: async () => {
      return await apiFetchList<any>(`/api/v1/$module/$model_plural/?page=$${page}&search=$${search}`);
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar $ModelNamePlural</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">$ModelNamePlural</h1>
          <Link
            href="./$model_plural/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Novo $ModelName
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
                      href={`./$model_plural/$${item.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                    <button
                      onClick={() => window.location.href = `./$model_plural/$${item.id}/edit`}
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
'''

TEMPLATE_PAGE_CREATE = '''\"use client\";

import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function Create$ModelNamePage() {
  useAuthGuard();
  const router = useRouter();

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Novo $ModelName</h1>

        <AutoForm
          endpoint="/api/v1/$module/$model_plural/"
          method="post"
          submitLabel="Criar $ModelName"
          onSuccess={(data) => router.push(`./$model_plural/$${data.id}`)}
        />
      </div>
    </AppLayout>
  );
}
'''

TEMPLATE_PAGE_DETAIL = '''\"use client\";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import AutoForm from "@/components/form/AutoForm";

export default function $ModelNameDetailPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["$module", "$model_plural", id],
    queryFn: async () => {
      return await apiFetch(`/api/v1/$module/$model_plural/$${id}/`);
    },
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar $ModelName</div>;
  if (!item) return <div>$ModelName não encontrado</div>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{item.name || item.title || `$ModelName #$${id}`}</h1>
          <div className="space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </button>
            <button
              onClick={async () => {
                if (confirm("Tem certeza?")) {
                  await apiFetch(`/api/v1/$module/$model_plural/$${id}/`, { method: "DELETE" });
                  router.push(`./$model_plural`);
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

        {isEditing ? (
          <AutoForm
            endpoint={`/api/v1/$module/$model_plural/$${id}/`}
            method="put"
            initialValues={item}
            submitLabel="Salvar $ModelName"
            onSuccess={(data) => {
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
'''

def camel_to_kebab(name: str) -> str:
    """Converte CamelCase para kebab-case"""
    result = []
    for i, char in enumerate(name):
        if char.isupper() and i > 0:
            result.append("-")
            result.append(char.lower())
        else:
            result.append(char.lower())
    return "".join(result)


def pluralize(name: str) -> str:
    """Pluraliza um nome simples (não perfeito, mas funcional)"""
    if name.endswith("y"):
        return name[:-1] + "ies"
    if name.endswith(("s", "x", "z")):
        return name + "es"
    return name + "s"


def create_crud_pages(model_info: dict[str, Any], module: str) -> None:
    """Cria as páginas CRUD para um modelo"""
    model_name = model_info["nome"]
    model_name_kebab = camel_to_kebab(model_name)
    model_plural = pluralize(model_name_kebab)

    module_path = FRONTEND_PATH / module / model_plural

    # Cria diretório base
    module_path.mkdir(parents=True, exist_ok=True)
    (module_path / "new").mkdir(exist_ok=True)
    (module_path / "[id]").mkdir(exist_ok=True)

    # Página de listagem
    list_page = TEMPLATE_PAGE_LIST.format(
        ModelName=model_name,
        ModelNamePlural=pluralize(model_name),
        ModuleName=module.title(),
        module=module,
        model_plural=model_plural,
    )
    with open(module_path / "page.tsx", "w", encoding="utf-8") as f:
        f.write(list_page)

    # Página de criação
    create_page = TEMPLATE_PAGE_CREATE.format(
        ModelName=model_name,
        module=module,
        model_plural=model_plural,
    )
    with open(module_path / "new" / "page.tsx", "w", encoding="utf-8") as f:
        f.write(create_page)

    # Página de detalhe/edição
    detail_page = TEMPLATE_PAGE_DETAIL.format(
        ModelName=model_name,
        module=module,
        model_plural=model_plural,
    )
    with open(module_path / "[id]" / "page.tsx", "w", encoding="utf-8") as f:
        f.write(detail_page)

    # Layout do módulo (index)
    layout = '''\"use client\";

export default function Layout({ children }) {
  return children;
}
'''
    with open(module_path / "layout.tsx", "w", encoding="utf-8") as f:
        f.write(layout)

    logger.info("✅ %s/%s - 3 páginas CRUD criadas", module, model_plural)


def generate_menu_sidebar() -> str:
    """Gera menu/sidebar com todos os modelos"""
    menu_code = '''"use client";

import Link from "next/link";
import { useState } from "react";

const MODULES = {
'''

    # Lê mapeamento
    with open(MAPEAMENTO_FILE, encoding="utf-8") as f:
        mapeamento = json.load(f)

    modelos_backend = mapeamento.get("modelos_backend", {})

    for module, info in modelos_backend.items():
        modelos = info.get("modelos", [])
        menu_code += f'  "{module}": [\n'

        for modelo in modelos:
            model_name = modelo["nome"]
            model_plural = pluralize(camel_to_kebab(model_name))
            menu_code += f'    {{ nome: "{model_name}", href: "/{module}/{model_plural}" }},\n'

        menu_code += "  ],\n"

    menu_code += '''};

export default function CrudSidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Modelos</h2>
      {Object.entries(MODULES).map(([module, items]) => (
        <div key={module} className="mb-4">
          <button
            onClick={() => setExpanded(p => ({ ...p, [module]: !p[module] }))}
            className="w-full text-left font-semibold text-sm py-2 hover:bg-gray-800 px-2 rounded"
          >
            📦 {module.charAt(0).toUpperCase() + module.slice(1)}
          </button>
          {expanded[module] && (
            <div className="ml-4 space-y-1">
              {items.map((item: any) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm py-1 hover:text-blue-400 text-gray-300"
                >
                  • {item.nome}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
'''
    return menu_code


def main():
    """Função principal"""
    logger.info("🚀 Iniciando geração de páginas CRUD...")

    # Carrega mapeamento
    try:
        with open(MAPEAMENTO_FILE, encoding="utf-8") as f:
            mapeamento = json.load(f)
    except FileNotFoundError:
        logger.error("❌ Arquivo %s não encontrado!", MAPEAMENTO_FILE)
        sys.exit(1)

    modelos_backend = mapeamento.get("modelos_backend", {})
    total_modelos = 0
    total_paginas = 0

    # Gera páginas para cada módulo
    for module, info in modelos_backend.items():
        modelos = info.get("modelos", [])
        logger.info("\n📁 Processando módulo: %s (%s modelos)", module, len(modelos))

        for modelo in modelos:
            try:
                create_crud_pages(modelo, module)
                total_modelos += 1
                total_paginas += 3
            except Exception as exc:
                logger.warning("⚠️ Erro ao processar %s/%s: %s", module, modelo["nome"], exc)

    # Gera menu sidebar
    logger.info("\n📋 Gerando menu sidebar...")
    sidebar_code = generate_menu_sidebar()
    sidebar_path = FRONTEND_PATH / "components" / "CrudModelsMenu.tsx"
    sidebar_path.parent.mkdir(parents=True, exist_ok=True)
    with open(sidebar_path, "w", encoding="utf-8") as f:
        f.write(sidebar_code)
    logger.info("✅ Menu sidebar criado em %s", sidebar_path)

    # Resumo
    logger.info("\n%s", "=" * 60)
    logger.info("✅ GERAÇÃO CONCLUÍDA!")
    logger.info("%s", "=" * 60)
    logger.info("📊 Estatísticas:")
    logger.info("   • Modelos processados: %s", total_modelos)
    logger.info("   • Páginas geradas: %s (3 por modelo)", total_paginas)
    logger.info("   • Estrutura: LIST, CREATE, DETAIL/EDIT/DELETE")
    logger.info("%s", "=" * 60)
    logger.info("\n🔗 Como usar:")
    logger.info("   1. Importe CrudModelsMenu no seu layout")
    logger.info("   2. Visite /app/nome-do-modulo para ver a listagem")
    logger.info("   3. Clique em 'Novo' para criar")
    logger.info("   4. Clique em 'Ver' para detalhar")
    logger.info("   5. AutoForm cuidará de validação e submit")
    logger.info("\n📁 Todos os arquivos em: %s", FRONTEND_PATH)


if __name__ == "__main__":
    main()
