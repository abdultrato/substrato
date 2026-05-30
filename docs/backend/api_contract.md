# Contrato da API Backend

Actualizado: 2026-05-25

A API pública do backend é exposta principalmente por Django REST Framework em `/api/v1/`. O contrato deve ser estável para o frontend Next.js, integrações externas e ferramentas operacionais.

## Entradas HTTP principais

| Endpoint | Origem | Finalidade |
|---|---|---|
| `/` | `platform/urls.py` | Redirecciona para `/admin/login/?next=/admin/`. |
| `/admin/` | Django admin | Gestão administrativa com Jazzmin e permissões Django/RBAC. |
| `/api/v1/` | `api/v1/urls.py` | API REST versionada. |
| `/api/schema/` | DRF Spectacular | Schema OpenAPI. |
| `/api/docs/` | Swagger UI | Documentação interactiva em desenvolvimento/admin. |
| `/api/redoc/` | ReDoc | Documentação OpenAPI alternativa. |
| `/pdf/` | `tasks.generate_pdf.urls` | PDFs gerados por views dedicadas. |
| `/health/live` | `platform/urls.py` | Liveness: processo responde. |
| `/health/ready` | `platform/urls.py` | Readiness: DB e Redis quando activado. |
| `/metrics` | `platform/urls.py` | Métricas Prometheus, protegidas por token quando configurado. |

## Routing DRF

O ficheiro `api/v1/routing/routes.py` agrega `VIEWSET_MAP` por módulo e regista rotas como:

```text
/api/v1/<grupo>/<modelo>/
/api/v1/<grupo>/<modelo>/<id>/
```

Exemplos:

```text
/api/v1/clinical/patient/
/api/v1/pharmacy/lot/
/api/v1/education/exam_attempt/
/api/v1/billing/invoice/
```

O `router.trailing_slash = "/?"` em `api/v1/urls.py` aceita endpoints com ou sem barra final. Isto evita falhas em `POST`, `PUT` e `PATCH` quando proxies ou o Next.js normalizam a URL.

## Permissões

- Por padrão, todos os ViewSets registados no router recebem `RBACPermission`.
- Excepções devem ser explícitas em `permission_exceptions` dentro de `api/v1/routing/routes.py`.
- `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` exige autenticação.
- `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` usa `security.authenticacao.JWTAuth`.
- O header esperado é `Authorization: Bearer <token>`.

## Autenticação e sessão

- JWT é fornecido por `rest_framework_simplejwt` com access e refresh configurados em `SIMPLE_JWT`.
- O tempo de sessão ociosa é controlado por `SESSION_IDLE_TIMEOUT_MINUTES`.
- O login tem throttling por scope `login` com taxa padrão `5/min`.
- Password reset usa tokens com TTL em `PASSWORD_RESET_TOKEN_TTL_MINUTES`.

## Serializers

Serializers em `api/v1/<modulo>/serializers.py` são responsáveis por:

- Validar tipos, obrigatoriedade e relações.
- Normalizar aliases PT/EN ou legados quando suportado pelo módulo.
- Bloquear campos que não devem ser controlados pelo cliente.
- Chamar validações de domínio quando não há local mais adequado.
- Preservar compatibilidade de resposta com o frontend.

Regra: se uma validação depende de estado persistido e afecta invariantes de negócio, considerar mover para modelo ou serviço e chamar pelo serializer/viewset.

## ViewSets e Views

ViewSets vivem em `api/v1/<modulo>/viewsets.py` e `api/v1/<modulo>/viewsets_impl/core.py` quando o módulo é grande. A divisão esperada é:

- `viewsets.py`: mapa público `VIEWSET_MAP` e imports de ViewSets.
- `viewsets_impl/core.py`: implementação concreta de CRUD, acções e queries.
- `filters.py`: filtros declarativos.
- `serializers.py`: contrato de entrada/saída.

Acções customizadas devem ter nome estável, permissões claras e teste de contrato. Quando retornam ficheiros, devem declarar `content_type`, `Content-Disposition` quando aplicável e caminho assíncrono se suportado.

## Mixins de API

`api/v1/viewset_mixins.py` contém dois componentes importantes:

- `ValidatedSearchOrderingMixin`: remove campos inválidos de `search_fields` e `ordering_fields` para evitar 500 em runtime.
- `TenantScopedQuerysetMixin`: filtra queryset por tenant e força tenant correcto em criação/actualização para evitar injecção por payload.

Todos os ViewSets com dados tenant-aware devem usar a lógica de tenant centralizada em vez de filtros manuais repetidos.

## Filtros, ordenação e pesquisa

- O backend usa `django_filters`, `SearchFilter` e `OrderingFilter` por padrão.
- Campos de pesquisa/ordenação devem existir no modelo ou ser explicitamente declarados como campos virtuais permitidos.
- Pesquisa avançada em QuerySets deve usar managers em `core/models/managers.py` quando possível.
- Em ambiente não-PostgreSQL, a pesquisa deve degradar de forma segura para `icontains` ou retornar queryset vazio controlado.

## Erros

O exception handler global é `api.v1.exceptions.custom_exception_handler`. A API deve devolver erros estruturados e previsíveis. Evitar devolver tracebacks, nomes internos de tabela ou payloads sensíveis.

## OpenAPI

O schema é exposto por `drf_spectacular` quando instalado:

```bash
python manage.py spectacular --file frontend-next/schema.json
python scripts/convert_schema_json.py
```

O `Makefile` inclui targets `schema`, `types` e `schema-types`. Alterações de contrato API que afectam o frontend devem regenerar schema/tipos quando esse fluxo estiver a ser usado.

## Compatibilidade frontend/backend

- O frontend usa aliases e normalizações centralizadas. No backend, preservar compatibilidade em serializers, `api/v1/compat.py` e middleware de path quando aplicável.
- Não renomear prefixos canónicos sem camada de alias. Exemplo: `external_entities` é prefixo canónico; paths amigáveis devem ser alias, não substituição directa.
- Endpoints que retornam blob/PDF devem responder com binário quando o cliente pede blob. JSON de job assíncrono deve ficar atrás de parâmetro explícito.

## Exportações e PDFs

- Exportações assíncronas devem usar a infra de jobs existente (`queue_export_if_requested` e módulos de export quando aplicável).
- Endpoints de relatório devem separar montagem de payload, decisão síncrona/assíncrona e geração do ficheiro.
- PDFs devem ser testados pelo menos por status code, content type e assinatura mínima do binário.

## Regras para novo endpoint

1. Definir modelo/serviço dono da regra.
2. Criar serializer com validação mínima e aliases necessários.
3. Criar ViewSet com permissões, filtros e tenant scope.
4. Registar em `VIEWSET_MAP` do módulo.
5. Garantir que `api/v1/routing/routes.py` inclui o grupo.
6. Adicionar teste de CRUD ou teste do caso de uso principal.
7. Actualizar `module_catalog.md` se for novo módulo ou recurso importante.
8. Regenerar schema/tipos quando o contrato for consumido pelo frontend.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Orienta a evolução do backend Django/DRF/Celery, incluindo domínio, API, dados, segurança, tarefas e operação.

**Valor que protege.** Protege regras de negócio, tenant, RBAC, auditoria, compatibilidade de API e previsibilidade das migrações.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir endpoints críticos, migrations, jobs assíncronos, permissões e testes mínimos para tenants piloto.

**Para production-ready.** Exige contratos OpenAPI fiáveis, métricas, alertas, rollback de deploy/migração e validação por production_readiness_check.
