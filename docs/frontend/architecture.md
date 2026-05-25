# Arquitectura do Frontend

Actualizado: 2026-05-25

O frontend activo do Substrato vive em `frontend-next/`. É uma aplicação Next.js 15 com App Router, React 18, TypeScript, Tailwind CSS, React Query e Vitest. A aplicação funciona como cliente operacional para módulos clínicos, financeiros, académicos, farmacêuticos, administrativos e de monitorização.

## Stack

| Tecnologia | Papel |
|---|---|
| Next.js 15 | App Router, build standalone, proxy/rewrite para backend e optimização de rotas. |
| React 18 | Componentização, providers, hooks e UI interactiva. |
| TypeScript | Tipagem de componentes, hooks, clientes e contratos gerados. |
| Tailwind CSS | Tokens visuais, temas e classes utilitárias. |
| React Query | Cache e orquestração de dados client-side quando usado por páginas/componentes. |
| Vitest | Testes unitários e de contrato frontend. |
| OpenAPI codegen | Cliente e modelos gerados a partir do schema backend. |
| Zod | Validação em fluxos onde aplicável. |

## Camadas principais

| Camada | Caminho | Responsabilidade |
|---|---|---|
| App Router | `frontend-next/app/` | Rotas, layouts, páginas de módulos, workspaces e CRUD gerado/manual. |
| Providers globais | `app/layout.tsx`, `app/providers.tsx` | Tema, idioma, autenticação, React Query, toasts, telemetria e actividade de requests. |
| Layout e navegação | `components/layout/`, `components/navigation/` | Shell autenticado, sidebar, header, footer, warmup e feedback de navegação. |
| UI base | `components/ui/` | Cards, botões, inputs, tabelas, modais, badges, toasts e indicadores. |
| Formulários | `components/form/`, `lib/openapi/formBuilder.ts` | AutoForm, campos reutilizáveis e formulários derivados de OpenAPI. |
| API | `lib/api/index.ts`, `lib/api-client/` | Chamadas HTTP, aliases, cache, retry, telemetry, blob/text/json e cliente gerado. |
| Estado local/global | `hooks/`, `lib/session.ts`, `lib/queryClient.ts` | Sessão, idioma, tema, paginação, workspace, módulos e utilitários. |
| Segurança client-side | `lib/rbac.ts`, `lib/workspaceScope.ts`, `hooks/useAuthGuard.ts` | Grupos, workspaces acessíveis, redirect de acesso e restrição por escopo. |
| OpenAPI/recursos | `schema.generated.json`, `lib/openapi/`, `lib/resources/` | Canonicalização de endpoints, specs de formulário e páginas de recurso. |
| Testes | `__tests__/` | Contratos de API, formulários, idioma, cache, workspace e validadores. |

## Runtime global

`app/layout.tsx` define:

- CSS global em `app/globals.css`.
- Fontes `Inter` e `Plus Jakarta Sans` via `next/font/google`.
- Script inicial para idioma e tema antes da hidratação.
- `AuthProvider` para sessão de utilizador.
- `Providers` para idioma, React Query, i18n, navegação, telemetria, indicador de actividade e toasts.

`app/providers.tsx` envolve a aplicação com:

- `LanguageProvider`.
- `QueryClientProvider`.
- `AutoTranslateTree`.
- `NavigationWarmup`.
- `NavigationClickFeedback`.
- `FrontendErrorTelemetry`.
- `RequestActivityIndicator`.
- `ToastContainer`.

## Proxy e rewrites

`next.config.js` usa `BACKEND_URL` ou `NEXT_PUBLIC_BACKEND_URL`, com fallback para `http://127.0.0.1:8000`.

Rewrites principais:

- `/api`, `/api/`, `/api/:path*` para backend Django.
- `/admin`, `/admin/`, `/admin/:path*` para Django Admin.
- `/pdf`, `/pdf/`, `/pdf/:path*` para views de PDF.
- `/static/:path*` e `/media/:path*` para assets servidos pelo backend.
- `/health/live` e `/health/ready` para health checks backend.

`trailingSlash: true` evita loops entre Next.js e Django em endpoints que dependem de barra final.

## Build e artefactos

- Desenvolvimento: `distDir` é `.next-dev`.
- Produção/build: `distDir` é `.next`.
- `output: "standalone"` prepara runtime empacotável.
- `dev:clean-cache` remove `.next-dev` antes de `next dev`, reduzindo erros por chunks antigos.
- `next typegen` actualiza tipos de rotas e pode tocar `next-env.d.ts`; validar diff antes de commitar alterações geradas.

## Segurança de headers

`next.config.js` aplica headers para:

- Content Security Policy.
- `Referrer-Policy`.
- `X-Content-Type-Options`.
- `X-Frame-Options`.
- `X-DNS-Prefetch-Control`.
- `Permissions-Policy`.
- HSTS em produção.

A CSP permite `unsafe-inline` por compatibilidade com Next/Tailwind e `unsafe-eval` apenas em desenvolvimento.

## Autenticação client-side

- `hooks/useAuth.tsx` mantém o estado React da sessão.
- `lib/session.ts` persiste o utilizador em storage local disponível.
- `lib/auth.ts` executa login/logout e obtém utilizador actual.
- Tokens são tratados por cookies HttpOnly no backend; o frontend guarda apenas dados de sessão necessários para UI.
- `apiFetch` tenta refresh em fluxos autorizados e limpa sessão quando a autenticação deixa de ser válida.

## Workspaces e autorização visual

- `lib/rbac.ts` define grupos, workspaces e regras de acesso por grupo.
- `lib/workspaceScope.ts` separa escopos `education`, `healthcare` e `neutral`.
- `AppLayout` aplica `requiredGroups`, redirect por escopo e bloqueio visual de rotas não permitidas.
- A autorização client-side melhora UX, mas a autorização final continua no backend via JWT/RBAC.

## Fronteiras de responsabilidade

| Situação | Local preferido |
|---|---|
| Nova página CRUD gerada | `app/<modulo>/<recurso>/` usando componentes de recursos/formulário. |
| Página operacional específica | `app/<workspace-ou-modulo>/page.tsx` com `AppLayout`. |
| Chamada HTTP | `lib/api/index.ts` ou cliente gerado em `lib/api-client/`. |
| Alias de endpoint | `lib/openapi/endpointResolver.ts` e, se necessário, `lib/api/index.ts`. |
| Formulário derivado de schema | `lib/openapi/formBuilder.ts` e `components/form/AutoForm.tsx`. |
| Regra de grupo/workspace | `lib/rbac.ts` e `lib/workspaceScope.ts`. |
| Estado de idioma/tema | Hooks globais em `hooks/` e script inicial do layout. |
| UI reutilizável | `components/ui/` antes de criar componente local. |
| Telemetria/erros | `components/monitoring/` e `lib/monitoring/`. |

## Regras de evolução

- Não fazer `fetch` directo em páginas novas sem motivo claro; usar `apiFetch` para manter aliases, idioma, cache, telemetry e actividade de requests.
- Não duplicar grupos ou permissões em páginas; usar `GROUPS` e helpers de `lib/rbac.ts`.
- Não criar estilos globais específicos de página; preferir componentes e tokens Tailwind existentes.
- Não quebrar aliases PT/EN; páginas amigáveis devem resolver para endpoints canónicos do backend.
- Não alterar `next.config.js` sem testar rewrites de `/api`, `/admin`, `/pdf`, `/health` e assets.
