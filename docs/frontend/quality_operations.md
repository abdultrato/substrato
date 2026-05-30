# Qualidade e Operação do Frontend

Actualizado: 2026-05-25

Este documento define comandos, validação e práticas operacionais para manter o frontend Next.js estável.

## Scripts principais

Todos os comandos abaixo usam `frontend-next/` como pacote.

| Comando | Finalidade |
|---|---|
| `npm --prefix frontend-next run dev` | Limpa `.next-dev` e inicia `next dev` em `0.0.0.0:5000`. |
| `npm --prefix frontend-next run build` | Build de produção Next.js. |
| `npm --prefix frontend-next run start` | Serve build em `0.0.0.0:5000`. |
| `npm --prefix frontend-next run lint` | ESLint em JS/TS/TSX. |
| `npm --prefix frontend-next run type-check` | `next typegen` e `tsc --noEmit`. |
| `npm --prefix frontend-next run test -- --run` | Vitest em modo não interactivo. |
| `npm --prefix frontend-next run generate:schema` | Gera schema frontend a partir do backend. |
| `npm --prefix frontend-next run generate:api` | Gera cliente TypeScript a partir de OpenAPI. |
| `npm --prefix frontend-next run build:admin-css` | Gera CSS minificado do Django Admin. |

## Validação mínima

Para alteração só documental:

```bash
git diff --check
```

Para alteração de frontend sem contrato API:

```bash
npm --prefix frontend-next run lint -- --max-warnings=0
npm --prefix frontend-next run type-check
npm --prefix frontend-next run test -- --run
```

Para alteração de contrato API/OpenAPI:

```bash
npm --prefix frontend-next run generate:schema
npm --prefix frontend-next run generate:api
npm --prefix frontend-next run lint -- --max-warnings=0
npm --prefix frontend-next run type-check
npm --prefix frontend-next run test -- --run
```

Para alteração de runtime/configuração:

```bash
npm --prefix frontend-next run build
```

## Testes existentes

Suites em `frontend-next/__tests__/`:

| Suite | Foco |
|---|---|
| `access-redirect.test.ts` | Redireccionamento e intenção de navegação. |
| `api-client.test.ts` | Cliente API gerado/manual. |
| `api-index.test.ts` | `apiFetch`, aliases, cache e contrato HTTP. |
| `autofrm-contract-coverage.test.ts` | Cobertura de contratos do AutoForm. |
| `form-builder.test.ts` | Construção de specs a partir de OpenAPI. |
| `language-runtime.test.ts` | Idioma e runtime de tradução. |
| `modules-catalog.test.ts` | Catálogo de módulos. |
| `payments-api-actions.test.ts` | Acções de pagamentos. |
| `pharmacy.http.test.ts` | Contratos HTTP de farmácia. |
| `request-activity.test.ts` | Indicador/estado de requests. |
| `resource-form-config-bloodbank.test.ts` | Configuração de formulários do banco de sangue. |
| `retry.test.ts` | Retry/timeouts. |
| `schemas.farmacia.test.ts` | Schemas de farmácia. |
| `typed-client-pharmacy-nursing.test.ts` | Cliente tipado em farmácia/enfermagem. |
| `validators.test.ts` | Validadores. |
| `workspace-scope.test.ts` | Escopo de workspace. |

## Dev server

`dev` executa `dev:clean-cache` antes de iniciar. Isto é importante porque o projecto separa artefactos:

- `.next-dev`: desenvolvimento.
- `.next`: build/produção.

Se aparecer erro como chunk antigo em `.next-dev`, limpar `.next-dev` é o primeiro passo antes de alterar código.

## Ambiente

Variáveis relevantes:

| Variável | Papel |
|---|---|
| `BACKEND_URL` | Backend usado por rewrites Next.js. |
| `NEXT_PUBLIC_BACKEND_URL` | Backend exposto ao browser quando necessário. |
| `FRONTEND_COVERAGE_STATEMENTS` | Threshold de statements no Vitest coverage. |
| `FRONTEND_COVERAGE_BRANCHES` | Threshold de branches. |
| `FRONTEND_COVERAGE_FUNCTIONS` | Threshold de functions. |
| `FRONTEND_COVERAGE_LINES` | Threshold de lines. |

## Artefactos gerados

| Ficheiro/pasta | Origem | Regra |
|---|---|---|
| `schema.json` | Backend OpenAPI bruto. | Rever diffs quando backend muda. |
| `schema.generated.json` | Conversão para consumo frontend. | Não editar manualmente. |
| `model_catalog.json` | Catálogo de modelos/recursos. | Regenerar junto ao schema quando necessário. |
| `lib/api-client/` | `openapi-typescript-codegen`. | Não editar manualmente sem justificação. |
| `.next-dev/` | Dev server. | Não commitar. |
| `.next/` | Build. | Não commitar. |
| `next-env.d.ts` | Next typegen. | Pode alternar referência `.next`/`.next-dev`; validar antes de commitar. |

## Troubleshooting

| Sintoma | Causa provável | Acção |
|---|---|---|
| `Cannot find module './vendor-chunks/...` | Cache dev antigo em `.next-dev`. | Executar `npm --prefix frontend-next run dev:clean-cache`. |
| Schema de endpoint não encontrado | Alias ausente ou ordem errada em `endpointResolver`. | Confirmar path em `schema.generated.json` e adicionar alias centralizado. |
| `vitest`/`tsc`/`eslint` não reconhecido | Dependências não instaladas. | Executar `npm --prefix frontend-next install` ou `npm install` dentro de `frontend-next`. |
| PDF descarregado como JSON | `responseType` errado ou backend devolveu job assíncrono. | Usar `responseType: "blob"` e verificar endpoint síncrono. |
| Página mostra dados antigos depois de mutação | Cache GET não invalidado. | Invalidar cache ou desligar cache no request afectado. |
| Erro ao ler ficheiro `[id]` no PowerShell | Brackets tratados como wildcard. | Usar `Get-Content -LiteralPath`. |

## Checklist antes de publicar

1. `git status --short` revisto.
2. Sem ficheiros gerados acidentais de `.next`, `.next-dev`, logs ou cache.
3. `lint` e `type-check` verdes para alteração de código.
4. Testes focados verdes para a área alterada.
5. `build` executado quando configuração, routing global ou runtime mudarem.
6. `git diff --check` sem erros.
7. Documentação actualizada se o contrato, rota, workspace, API ou componente base mudou.

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
