# Padrões de Manutenção do Frontend

Actualizado: 2026-05-25

Este documento define o padrão para evoluir o frontend do Substrato sem degradar contrato, navegação, segurança visual ou consistência de UI.

## Estrutura de uma alteração frontend

Uma alteração frontend completa deve responder a quatro perguntas:

1. Que rota, workspace ou componente muda?
2. Que contrato API ou schema é consumido?
3. Que permissões, idioma, tenant ou workspace são relevantes?
4. Que validação prova que a alteração não quebrou o fluxo?

## Onde colocar código novo

| Necessidade | Local preferido |
|---|---|
| Página operacional | `frontend-next/app/<workspace-ou-modulo>/page.tsx`. |
| CRUD específico de recurso | `frontend-next/app/<modulo>/<recurso>/`. |
| CRUD genérico | `components/resources/` e `lib/resources/`. |
| Componente visual reutilizável | `components/ui/`. |
| Shell/layout autenticado | `components/layout/`. |
| Navegação/warmup/feedback | `components/navigation/`. |
| Formulário gerado | `components/form/` e `lib/openapi/formBuilder.ts`. |
| Chamada HTTP manual | `lib/api/index.ts` ou wrapper local fino. |
| Alias de endpoint | `lib/openapi/endpointResolver.ts` e teste. |
| Regra RBAC/workspace | `lib/rbac.ts` e `lib/workspaceScope.ts`. |
| Estado de sessão | `hooks/useAuth.tsx`, `lib/auth.ts`, `lib/session.ts`. |
| Validação reutilizável | `lib/validators/`. |
| Teste de contrato/comportamento | `frontend-next/__tests__/`. |

## Regras para páginas

- Usar `AppLayout` em páginas autenticadas.
- Declarar `requiredGroups` quando a página pertence a grupo específico.
- Usar `useLanguage().t(pt, en)` para texto visível quando a página já segue i18n.
- Usar `apiFetch` para chamadas HTTP, salvo cliente gerado com motivo explícito.
- Tratar loading, erro, vazio e sucesso.
- Não acoplar regra de negócio crítica apenas à UI; backend deve validar também.
- Não criar rota duplicada quando alias central resolve o caso.

## Regras para API

- Centralizar aliases em `endpointResolver`/`apiFetch`.
- Não fazer `fetch` directo sem headers de idioma, credenciais, actividade e tratamento de erro.
- Usar `responseType: "blob"` para PDFs/ficheiros.
- Evitar cache em mutações e em dados sensíveis.
- Depois de mutação, invalidar cache ou forçar refetch quando a página depende de dados actualizados.
- Testar alias novo e cenário de erro quando o fluxo for crítico.

## Regras para formulários

- Usar `AutoForm` para CRUD simples suportado por OpenAPI.
- Bloquear campos internos, tenant, auditoria, versionamento e soft delete.
- Usar UX específica para stock, facturação, pagamentos, resultados clínicos, avaliações académicas e banco de sangue.
- Mostrar contexto do utilizador/sector quando o backend impõe regra de solicitante.
- Mapear erros DRF por campo sempre que possível.

## Regras para componentes

- Criar componente em `components/ui/` apenas se for reutilizável.
- Manter props explícitas e tipadas.
- Evitar dependência oculta de rota global dentro de componente base.
- Não hardcodar cores que já têm token.
- Não duplicar `Button`, `Card`, `Modal`, `DataTable`, `StatusBadge` ou inputs base.
- Adicionar estados acessíveis para disabled/loading.

## Regras de i18n

- Escrever PT-PT natural nos textos portugueses.
- Preservar identificadores técnicos, rotas, nomes de ficheiros e tokens em inglês quando são código.
- Enviar `Accept-Language` via helper central.
- Não fazer substituições globais cegas em ficheiros de código.

## Regras de segurança client-side

- O frontend pode esconder UI sem permissão, mas o backend deve bloquear de facto.
- Não guardar tokens sensíveis em localStorage/sessionStorage.
- Não logar passwords, tokens, dados clínicos completos ou payloads financeiros sensíveis.
- Não expor dados de outro tenant por filtros client-side.
- Não confiar em `is_staff`/`is_superuser` para além da UX; backend decide autorização final.

## Regras de performance

- Preferir request dedupe/cache central em `apiFetch` a soluções locais.
- Usar `NavigationWarmup`/prefetch para rotas críticas, não para todo o universo de rotas.
- Evitar carregar listas enormes sem paginação.
- Evitar cálculos pesados em render; usar memoização quando necessário.
- Não usar `useEffect` sem dependências correctas.

## Regras de testes

| Alteração | Teste esperado |
|---|---|
| Alias de endpoint | `api-index.test.ts` ou teste específico. |
| Formulário gerado | `form-builder.test.ts` ou teste de cobertura do recurso. |
| Workspace/RBAC | `workspace-scope.test.ts` ou teste de acesso. |
| Cache/retry/request activity | `request-activity.test.ts`, `retry.test.ts` ou teste de API. |
| Validador | `validators.test.ts`. |
| Fluxo farmácia/pagamento | Teste específico de HTTP/contrato. |
| Componente com regra | Teste com Testing Library/Vitest quando aplicável. |

## Checklist antes de commit

1. `git status --short` limpo de artefactos acidentais.
2. `npm --prefix frontend-next run lint -- --max-warnings=0` quando há código TS/TSX/JS.
3. `npm --prefix frontend-next run type-check` quando há código ou types/schema.
4. `npm --prefix frontend-next run test -- --run` ou testes focados.
5. `npm --prefix frontend-next run build` se mudou config, routing global, providers ou Next runtime.
6. `git diff --check` sem erros.
7. Documentação actualizada quando muda contrato, rota, workspace, componente base ou regra operacional.

## Anti-padrões a corrigir quando encontrados

- `fetch` directo duplicando `apiFetch`.
- Alias resolvido dentro de página local.
- Página protegida sem `requiredGroups` quando deveria ter.
- Formulário que permite editar `tenant` ou campos internos.
- PDF tratado como JSON.
- Mutação que deixa cache stale sem invalidação.
- Texto hardcoded só em uma língua dentro de página bilingue.
- Componente base com estilos hardcoded e sem tokens.
- Teste que valida apenas render superficial de fluxo crítico.

## Critério de pronto

Uma alteração frontend está pronta quando:

- A rota/componente usa a camada certa.
- A chamada API passa pela camada central ou cliente gerado de forma consistente.
- A permissão visual e o workspace foram considerados.
- O fluxo crítico tem teste ou validação manual documentada.
- O build/lint/type-check/test relevante passou.
- A documentação foi actualizada quando o contrato mudou.

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
