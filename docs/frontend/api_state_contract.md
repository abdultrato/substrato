# API, Estado e Contratos do Frontend

Actualizado: 2026-05-25

O frontend comunica com o backend por duas vias principais: o helper `apiFetch` em `frontend-next/lib/api/index.ts` e o cliente gerado em `frontend-next/lib/api-client/`. O contrato base vem de OpenAPI e é materializado em `schema.json`, `schema.generated.json`, `model_catalog.json` e modelos TypeScript gerados.

## Cliente API principal

`lib/api/index.ts` é a camada preferida para chamadas manuais. Responsabilidades:

- Normalizar aliases de rotas antes do request.
- Adicionar `Content-Type` e `Accept-Language`.
- Suportar `responseType: "json" | "blob" | "text"`.
- Emitir actividade de request para a UI.
- Enviar telemetria de erros de API.
- Fazer retry/refresh quando aplicável.
- Servir cache client-side para GET JSON quando permitido.
- Suportar timeout e retry em timeout quando o chamador configurar.

Regra: páginas novas devem usar `apiFetch` salvo quando usam explicitamente o cliente gerado e mantêm o mesmo comportamento de idioma, sessão e erros.

## Aliases e canonicalização

Há dois pontos principais:

| Ficheiro | Papel |
|---|---|
| `lib/openapi/endpointResolver.ts` | Resolve aliases dinâmicos e estáticos com base no OpenAPI. |
| `lib/api/index.ts` | Reescreve URLs amigáveis/legadas antes de chamar `/api/v1`. |

Aliases estáticos existentes incluem recursos como:

- `/external_entities/companies/` -> `/external_entities/empresa/`.
- `/clinical/results/` -> `/clinical/resultitem/`.
- `/nursing/procedimento/` -> `/nursing/procedure/`.
- `/ai_assistant/ai-investigations/` -> `/ai/assistant/investigations/`.

Regras:

- Alias específico deve vir antes de alias genérico.
- Alias confirmado por backend deve ser testado em `__tests__/api-index.test.ts` ou teste equivalente.
- Não corrigir alias dentro de página individual se a rota puder ser chamada por outros componentes.

## OpenAPI e formulários

`lib/openapi/formBuilder.ts` cria specs de formulário a partir de `schema.generated.json`.

Responsabilidades:

- Encontrar o path OpenAPI correcto para endpoint/alias.
- Resolver `$ref`, `allOf`, `oneOf` e `anyOf`.
- Mapear tipos OpenAPI para campos de formulário.
- Extrair labels de enum quando disponíveis.
- Marcar campos internos/readonly como não submetíveis.
- Bloquear campos de tenant, auditoria, soft delete e versionamento.

Campos sempre readonly incluem `id`, `custom_id`, `tenant`, `tenant_id`, `created_at`, `updated_at`, `deleted`, `version`, `created_by`, `updated_by` e aliases portugueses equivalentes.

## AutoForm

`components/form/AutoForm.tsx` renderiza formulários com base nos specs. Deve ser usado quando:

- O recurso tem CRUD simples.
- O OpenAPI expõe schema suficiente.
- Não há regra operacional que exija UX própria.

Não usar `AutoForm` sozinho quando:

- O fluxo altera stock, pagamento, factura, resultado clínico ou avaliação académica.
- A página precisa mostrar contexto operacional antes de guardar.
- Há permissões por campo ou regras de negócio complexas.

## Cliente gerado

`lib/api-client/` é gerado por `openapi-typescript-codegen`. Contém:

- `core/`: request, erro, promise cancelável e configuração OpenAPI.
- `models/`: tipos e enums gerados.
- `services/`: serviços gerados quando presentes no output.
- `index.ts`: export central.

Regra: não editar manualmente ficheiros gerados sem documentar a razão. Preferir regenerar a partir do schema.

## Geração de schema e tipos

Comandos:

```bash
npm --prefix frontend-next run generate:schema
npm --prefix frontend-next run generate:api
```

Ou pelo `Makefile`:

```bash
make schema
make types
make schema-types
```

Após alteração de contrato backend:

1. Gerar schema.
2. Gerar tipos quando necessário.
3. Rever diffs de ficheiros gerados.
4. Executar testes de contrato frontend.
5. Actualizar documentação se mudar endpoint, payload ou alias.

## Sessão e autenticação

| Ficheiro | Responsabilidade |
|---|---|
| `hooks/useAuth.tsx` | Estado React da sessão e provider. |
| `hooks/useAuthGuard.ts` | Protecção de rotas autenticadas. |
| `lib/auth.ts` | Login, logout e fetch do utilizador actual. |
| `lib/session.ts` | Persistência local do utilizador normalizado. |
| `lib/tokens.ts` | Compatibilidade/limpeza de tokens quando aplicável. |

O backend envia tokens em cookies HttpOnly. O frontend guarda dados mínimos do utilizador para UX e revalida sessão em background.

## RBAC e workspaces

`lib/rbac.ts` define:

- Grupos (`GROUPS`).
- Sinónimos de grupos.
- Hierarquia de gestão de utilizadores.
- Workspaces disponíveis por grupo.
- Workspace default por utilizador.

`lib/workspaceScope.ts` define:

- Escopos `education`, `healthcare` e `neutral`.
- Persistência de escopo activo.
- Filtragem de módulos por escopo.
- Bloqueio/redirect quando uma rota não pertence ao escopo seleccionado.

A autorização visual não substitui RBAC backend.

## Idioma

- `hooks/useLanguage.tsx` mantém idioma activo.
- `lib/language.ts` normaliza idioma e converte para backend.
- `components/i18n/AutoTranslateTree.tsx` aplica traduções automáticas na árvore.
- `Accept-Language` é enviado por `apiFetch` e chamadas de auth.

Regra: texto novo exposto ao utilizador deve ter PT e EN quando a página usa `t(pt, en)`.

## Estado de actividade e telemetria

- `lib/requestActivity.ts` gera eventos de início/fim de request.
- `components/ui/RequestActivityIndicator.tsx` apresenta actividade ao utilizador.
- `lib/monitoring/telemetry.ts` reporta erros/telemetria de frontend.
- `components/monitoring/FrontendErrorTelemetry.tsx` captura erros globais do browser.

Chamadas directas com `fetch` devem ligar actividade/telemetria manualmente ou migrar para `apiFetch`.

## Cache client-side

`apiFetch` suporta cache para GET JSON com TTL e `staleWhileRevalidate`. Regras:

- Usar cache apenas para leituras idempotentes.
- Invalidar ou evitar cache depois de mutações no mesmo recurso.
- Não cachear respostas sensíveis sem necessidade.
- Testar fluxos onde cache pode esconder actualizações recentes.

## Downloads e blobs

Para PDFs e ficheiros:

```ts
await apiFetch(url, { responseType: "blob" })
```

Não tratar PDF como JSON. O backend deve devolver `application/pdf` no caminho síncrono e JSON apenas quando a operação assíncrona for explicitamente solicitada.

## Contratos que devem ter teste

- Alias de rota ou endpoint.
- `apiFetch` com JSON, blob, erro e cache.
- Form specs gerados por OpenAPI.
- Regras de workspace/RBAC.
- Validações de formulário críticas.
- Fluxos financeiros, clínicos, farmácia, educação e monitorização.

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
