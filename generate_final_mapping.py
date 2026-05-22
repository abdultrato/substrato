#!/usr/bin/env python
"""Gerar JSON estruturado final para mapeamento completo do Substrato."""
import json
import os
import sys

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform.settings')

import django
django.setup()

from django.apps import apps

# Ler mapeamento gerado
with open('mapeamento_completo.json', 'r', encoding='utf-8') as f:
    mapeamento = json.load(f)

# Ler schema.json
with open('frontend-next/schema.json', 'r', encoding='utf-8') as f:
    schema = json.load(f)

# 1. Agrupar modelos por app
modelos_backend_agrupado = {}
for modelo in mapeamento['modelos_backend']:
    app = modelo['app']
    if app not in modelos_backend_agrupado:
        modelos_backend_agrupado[app] = []
    modelos_backend_agrupado[app].append(modelo)

# 2. AutoForm info
autoform_info = {
    "localizado": "frontend-next/components/form/AutoForm.tsx",
    "como_funciona": (
        "AutoForm é um componente React reutilizável que gera formulários dinâmicos baseados "
        "no schema OpenAPI gerado automaticamente. Funciona da seguinte forma:\n"
        "1. Recebe 'endpoint' (rota da API) e 'method' (post/put/patch)\n"
        "2. Chama buildFormSpec(endpoint, method) que:\n"
        "   - Busca o path no schema.json\n"
        "   - Extrai o requestBody schema dos components\n"
        "   - Mapeia tipos OpenAPI para tipos de formulário (text, number, date, select, etc)\n"
        "3. Constrói schema Zod para validação client-side\n"
        "4. Renderiza campos com tipos específicos (input, select, checkbox, textarea)\n"
        "5. Valida e envia via apiFetch ao servidor\n"
        "6. Suporta etapas/wizard mode quando config.etapas é fornecido\n"
        "7. Permite customização via ResourceFormConfig: labels, hints, field order, readonly fields"
    ),
    "tipos_campo_suportados": [
        "text", "number", "integer", "boolean", "date", "datetime",
        "select", "array-string"
    ],
    "features": [
        "Validação Zod automática",
        "Multi-step forms (etapas)",
        "Campos read-only configuráveis",
        "Componentes de widget customizável (textarea)",
        "Suporte a localStorage para lembrar valores",
        "Enum labels from x-choices ou x-enumNames",
        "Tratamento de erros e mensagens de sucesso",
        "Integração com schema.json gerado pelo drf-spectacular"
    ]
}

# 3. Schema generation
schema_generation = {
    "script": "generate_schema.py",
    "output": "frontend-next/schema.json",
    "tipo": "OpenAPI 3.0.2",
    "gerador": "drf-spectacular",
    "comando": "python generate_schema.py",
    "url_schema_custom": "frontend-next/schema.generated.json",
    "funcionalidade": (
        "Script que executa à cada build para sincronizar schema da API com frontend.\n"
        "Lê todos os viewsets registrados em api/v1/routing/routes.py\n"
        "Extrai schemas de request/response de cada endpoint\n"
        "Gera arquivo OpenAPI JSON que AutoForm utiliza"
    ),
    "como_funciona": {
        "1_coleta": "Iterates através de todos os VIEWSET_GROUPS em routes.py",
        "2_análise": "Para cada viewset, extrai serializers (request/response schemas)",
        "3_mapping": "Mapeia models Django → serializers → OpenAPI schemas",
        "4_geração": "Compila tudo em um único arquivo schema.json",
        "5_output": "Salva em frontend-next/schema.json (42k linhas)"
    }
}

# 4. Endpoints por módulo
endpoints_resumido = {}
for modulo, rotas in mapeamento['endpoints_por_modulo'].items():
    endpoints_resumido[modulo] = {
        "total_endpoints": len(rotas),
        "rotas_amostra": [r['rota'] for r in rotas[:3]],
        "metodos_disponíveis": list(set(
            m for r in rotas for m in r['metodos']
        ))
    }

# 5. Modelos por app - versão condensada
modelos_resumido = {}
for app, modelos in modelos_backend_agrupado.items():
    modelos_resumido[app] = {
        "total_modelos": len(modelos),
        "modelos": [
            {
                "nome": m["modelo"],
                "tabela": m["tabela"],
                "campos_total": m["campos_total"],
                "campos_principais": m["campos"][:8],
                "endpoint_existe": m["endpoint_existe"]
            }
            for m in modelos
        ]
    }

# JSON FINAL ESTRUTURADO
resultado_final = {
    "titulo": "Mapeamento Completo - Substrato ERP",
    "data_geracao": "2026-05-22",
    "versao_api": "1.0.0",
    
    "resumo_geral": {
        "total_modelos": mapeamento['resumo']['total_modelos'],
        "total_apps": mapeamento['resumo']['total_apps'],
        "total_endpoints_modulos": mapeamento['resumo']['total_endpoints_modulos'],
        "total_endpoints": sum(len(r) for r in mapeamento['endpoints_por_modulo'].values()),
        "arquitetura": "Django REST Framework + Next.js + OpenAPI/Swagger"
    },
    
    "modelos_backend": modelos_resumido,
    
    "endpoints_por_modulo": endpoints_resumido,
    
    "autoform_info": autoform_info,
    
    "schema_generation": schema_generation,
    
    "fluxo_crud_completo": {
        "CREATE": {
            "método": "POST",
            "endpoint": "/api/v1/{modulo}/{modelo}/",
            "frontend": "AutoForm com method='post' + endpoint",
            "passos": [
                "1. User acessa página de criar novo recurso",
                "2. Componente carrega AutoForm({endpoint, method: 'post'})",
                "3. AutoForm busca schema no schema.json",
                "4. Renderiza formulário com campos do requestBody",
                "5. User preenche dados",
                "6. Validação Zod no client",
                "7. POST /api/v1/{modulo}/{modelo}/",
                "8. Django valida + salva",
                "9. Retorna dados criado + ID",
                "10. Toast de sucesso"
            ]
        },
        "READ": {
            "método": "GET",
            "endpoint": "/api/v1/{modulo}/{modelo}/ ou /{id}/",
            "frontend": "useEffect + fetch",
            "passos": [
                "1. GET /api/v1/{modulo}/{modelo}/{id}/",
                "2. Backend retorna serializer instance",
                "3. Frontend renderiza em leitura ou form"
            ]
        },
        "UPDATE": {
            "método": "PUT/PATCH",
            "endpoint": "/api/v1/{modulo}/{modelo}/{id}/",
            "frontend": "AutoForm com method='put' + initialValues",
            "passos": [
                "1. Carregar dados via GET",
                "2. AutoForm com initialValues populadas",
                "3. Campos read-only: id, created_at, etc",
                "4. User edita",
                "5. PUT/PATCH para atualizar",
                "6. Backend valida",
                "7. Retorna dados atualizados"
            ]
        },
        "DELETE": {
            "método": "DELETE",
            "endpoint": "/api/v1/{modulo}/{modelo}/{id}/",
            "frontend": "Botão + confirmação",
            "passos": [
                "1. User clica 'Deletar'",
                "2. Modal de confirmação",
                "3. DELETE /api/v1/{modulo}/{modelo}/{id}/",
                "4. Soft-delete (deleted=True, deleted_at=now)",
                "5. Redireciona para lista"
            ]
        }
    },
    
    "stack_tecnológico": {
        "backend": [
            "Django 4.2+",
            "Django REST Framework",
            "drf-spectacular (OpenAPI)",
            "PostgreSQL",
            "Celery + Redis",
            "Docker"
        ],
        "frontend": [
            "Next.js 14+",
            "React 18+",
            "TypeScript",
            "Zod (validação)",
            "Tailwind CSS",
            "Shadcn/ui components"
        ],
        "observabilidade": [
            "Prometheus",
            "Grafana",
            "Sentry"
        ]
    },
    
    "notas_importantes": [
        "Todos os endpoints têm permissões RBAC (RBACPermission)",
        "Multi-tenant: tenant é derivado automaticamente de request.tenant",
        "Campos read-only em frontend: id, created_at, updated_at, created_by, etc",
        "Schema.json tem 42.359 linhas e contém TODOS os endpoints",
        "AutoForm usa formBuilder.ts para mapear OpenAPI → componentes React",
        "Validação dupla: Zod (client) + DRF serializers (server)",
        "Soft-delete padrão: deleted_at, deleted_by, deleted (boolean)",
        "Versionamento automático com field 'version'",
        "Compatibilidade com aliases legados português/inglês nos serializers"
    ],
    
    "exemplo_crud_patient": {
        "listar": "GET /api/v1/clinical/patient/",
        "criar": "POST /api/v1/clinical/patient/",
        "recuperar": "GET /api/v1/clinical/patient/{id}/",
        "atualizar": "PUT /api/v1/clinical/patient/{id}/",
        "deletar": "DELETE /api/v1/clinical/patient/{id}/",
        "campos_principais": [
            "id, custom_id (PAC-000123)",
            "name, birth_date, gender",
            "blood_type (O+, A-, etc)",
            "pregnant, gestational_age_weeks",
            "document_type, document_number",
            "address_street, address_number, address_city",
            "created_at, updated_at"
        ]
    }
}

# Salvar JSON final
with open('SUBSTRATO_MAPEAMENTO_COMPLETO.json', 'w', encoding='utf-8') as f:
    json.dump(resultado_final, f, indent=2, ensure_ascii=False)

print("✓ Arquivo SUBSTRATO_MAPEAMENTO_COMPLETO.json criado com sucesso!")
print(f"  - {resultado_final['resumo_geral']['total_modelos']} modelos mapeados")
print(f"  - {resultado_final['resumo_geral']['total_endpoints']} endpoints catalogados")
print(f"  - AutoForm documentado em detalhes")
print(f"  - Schema generation explicado")
print(f"  - Fluxo CRUD completo descrito")
