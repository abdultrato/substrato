# Documentação do Backend

Actualizado: 2026-05-25

Esta pasta documenta o backend do Substrato como código de produto e operação. O objectivo é permitir que um programador, operador ou auditor compreenda a estrutura real do backend sem ter de abrir ficheiro por ficheiro antes de começar.

## Âmbito

Inclui o código Python/Django do repositório:

- `api/`: camada HTTP, DRF, serializers, viewsets, routing e respostas.
- `apps/`: aplicações Django de domínio, modelos, admin, sinais e comandos.
- `core/`: modelos base, mixins, constantes, ORM, eventos e utilitários comuns.
- `services/`: serviços de aplicação/domínio chamados por APIs, tarefas e integrações.
- `tasks/`: geração de PDFs, tarefas assíncronas e jobs operacionais.
- `infrastructure/`: middleware, contexto, cache, storage, outbox, base de dados e resiliência.
- `security/`: autenticação, permissões, RBAC, auditoria de acesso, throttling e sanitização.
- `platform/` e `plataforma/`: settings Django, URLs, ASGI/WSGI, Celery e compatibilidade de import.
- `application/`, `domain/`, `events/`, `integrations/`, `observability/`, `configuration/`, `quality/`, `shared/`, `system/`, `audit/` e `users/`: camadas auxiliares e de evolução arquitectural.

Exclui o frontend (`frontend-next/`) e artefactos gerados como `__pycache__`, `.next`, `staticfiles` e migrações geradas quando o foco é documentação de código activo.

## Índice

- [Arquitectura](architecture.md): visão por camadas, ciclo de request, settings, Celery e fronteiras entre pacotes.
- [Catálogo de módulos](module_catalog.md): inventário por raiz técnica e por aplicação Django.
- [Contrato da API](api_contract.md): rotas, autenticação, serializers, viewsets, filtros, OpenAPI e compatibilidade frontend/backend.
- [Dados, tenancy e domínio](data_tenancy.md): modelos base, soft delete, tenant scope, managers, transacções e migrações.
- [Segurança e operação](security_operations.md): RBAC, JWT, middlewares, health checks, observabilidade, deployment e runbooks.
- [Padrões de manutenção](contribution_standard.md): regras para evoluir backend sem degradar qualidade, testes ou documentação.

## Leitura recomendada

1. Comece por `architecture.md` para perceber as fronteiras entre camadas.
2. Use `module_catalog.md` para localizar o módulo que vai alterar.
3. Antes de mexer em endpoints, leia `api_contract.md`.
4. Antes de mexer em modelos, tenants, dados ou migrations, leia `data_tenancy.md`.
5. Antes de publicar ou operar, leia `security_operations.md`.
6. Antes de abrir uma alteração grande, use `contribution_standard.md` como checklist.

## Regra de manutenção

Sempre que um novo módulo, endpoint, serviço crítico, tarefa assíncrona, regra de tenant ou política de segurança for criado, esta documentação deve ser actualizada no mesmo commit. Documentação atrasada é tratada como dívida técnica.

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
