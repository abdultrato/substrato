# Documentação do Frontend

Actualizado: 2026-05-25

Esta pasta documenta o frontend do Substrato como aplicação de produto e superfície de integração com o backend. O frontend activo é `frontend-next/`, uma aplicação Next.js 15 com React 18, TypeScript, Tailwind CSS, Vitest, React Query e cliente API gerado a partir de OpenAPI.

## Âmbito

Inclui:

- `frontend-next/app/`: App Router, layouts e páginas por módulo.
- `frontend-next/components/`: componentes reutilizáveis de UI, layout, navegação, formulários, IA e monitorização.
- `frontend-next/hooks/`: estado de autenticação, idioma, tema, paginação, recursos e workspace.
- `frontend-next/lib/`: cliente API, OpenAPI, RBAC, sessão, cache, telemetria, validadores, recursos e utilitários.
- `frontend-next/styles/`: CSS auxiliar, incluindo CSS do admin.
- `frontend-next/__tests__/`: testes Vitest de contrato, API, formulários, idioma, cache, workspace e validações.
- `frontend-next/schema.json`, `schema.generated.json`, `model_catalog.json` e `lib/api-client/`: artefactos de contrato gerados a partir do backend.
- Ficheiros de configuração do frontend: `next.config.js`, `tailwind.config.js`, `tailwind.admin.config.js`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.json` e `package.json`.

Não inclui `frontend/` como aplicação web activa: neste checkout essa pasta não contém TypeScript/React/HTML/CSS de runtime; é uma superfície legada Python e não o frontend Next.js.

## Índice

- [Arquitectura](architecture.md): camadas, runtime, providers, proxy, autenticação e fronteiras.
- [Catálogo de rotas](route_catalog.md): inventário do App Router por módulo e padrão de páginas.
- [API, estado e contratos](api_state_contract.md): `apiFetch`, OpenAPI, aliases, cache, formulários gerados, auth, idioma e RBAC.
- [Componentes e design system](components_design_system.md): componentes, layout, UI, formulários, navegação, i18n e regras visuais.
- [Qualidade e operação](quality_operations.md): comandos, testes, build, dev server, artefactos gerados e troubleshooting.
- [Padrões de manutenção](contribution_standard.md): como alterar rotas, páginas, API, formulários e componentes sem degradar o produto.

## Leitura recomendada

1. Comece por `architecture.md` para compreender o runtime e as fronteiras.
2. Use `route_catalog.md` para localizar o módulo ou rota a alterar.
3. Antes de mexer em chamadas HTTP, leia `api_state_contract.md`.
4. Antes de criar UI nova, leia `components_design_system.md`.
5. Antes de publicar, use `quality_operations.md` e `contribution_standard.md` como checklist.

## Regra de manutenção

Sempre que uma rota, workspace, cliente API, contrato OpenAPI, componente base, regra de RBAC, estado global ou fluxo crítico for alterado, esta documentação deve ser actualizada no mesmo commit.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Orienta o frontend Next.js como superfície de produto, navegação, formulários, estado, acessibilidade e integração com a API.

**Valor que protege.** Protege consistência visual, contratos API/frontend, feedback ao utilizador e segurança por RBAC sem esconder erros reais.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve validar rotas críticas, formulários gerados, cache, autenticação, idioma e estados de erro antes de tenants piloto.

**Para production-ready.** Exige lint, type-check, testes, build, telemetria de erros e compatibilidade com os contratos gerados do backend.
