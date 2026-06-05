# Catálogo de Rotas do Frontend

Actualizado: 2026-06-05

O frontend usa Next.js App Router em `frontend-next/app/`. Existem centenas de páginas, misturando workspaces manuais, páginas operacionais específicas e CRUD gerado a partir do catálogo/backend.

## Inventário geral

| Superfície | Quantidade | Observação |
|---|---:|---|
| Ficheiros de rota `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` | 643 | Rotas App Router e estados de rota. |
| Ficheiros em `components/` | 67 | Componentes reutilizáveis e shell de aplicação. |
| Hooks em `hooks/` | 17 | Sessão, idioma, tema, recursos, paginação e workspace. |
| Ficheiros TypeScript em `lib/` | 366 | API, OpenAPI, cliente gerado, RBAC, validators e utilitários. |
| Suites Vitest em `__tests__/` | 16 | Testes de contrato e comportamento frontend. |

## Top-level routes

| Topo em `app/` | `page.tsx` | Responsabilidade |
|---|---:|---|
| `access-denied` | 1 | Página de acesso negado. |
| `accounting` | 33 | Contabilidade, lançamentos, saldos, reconciliações e recepção contabilística. |
| `ai` | 5 | Workspace operacional do assistente IA, tarefas e investigações. |
| `ai_assistant` | 32 | CRUD administrativo/gerado de entidades do assistente IA. |
| `audit` | 2 | Auditoria operacional e actividade por utilizador. |
| `audit_activities` | 4 | CRUD gerado de actividades de utilizador. |
| `billing` | 12 | Facturação, itens e histórico. |
| `bloodbank` | 25 | Banco de sangue, doações, unidades, stock e transfusões. |
| `clinical` | 56 | Entidades clínicas canónicas, requisições, resultados, pacientes e exames. |
| `consultations` | 13 | Consultas, especialidades, feriados e fluxo de agenda/preço. |
| `education` | 74 | Área académica, recursos, directoria, professor, estudante, exames e avaliações. |
| `entities` | 4 | Alias amigável para entidades externas/empresas. |
| `equipment` | 4 | Equipamentos. |
| `equipment_integrations` | 32 | Integrações, credenciais, ordens, mensagens e mapeamentos. |
| `exams` | 4 | Alias/atalho de exames clínicos. |
| `external_entities` | 4 | Entidades externas canónicas. |
| `healthcare` | 1 | Hub operacional clínico. |
| `human_resources` | 44 | RH, funcionários, profissões, escalas, folhas salariais e processos. |
| `identity` | 12 | Utilizadores, perfis e tokens. |
| `incidents` | 4 | Incidentes operacionais. |
| `inspections` | 4 | Inspecções diárias. |
| `insurer` | 16 | Seguradoras, planos e autorizações. |
| `invoices` | 3 | Fluxos amigáveis de facturas. |
| `laboratory` | 4 | Workspace laboratorial e resultados. |
| `login` | 1 | Autenticação. |
| `maintenance` | 4 | Manutenção. |
| `maternity` | 5 | Maternidade/gestação. |
| `medical-records` | 3 | Alias amigável de registos médicos. |
| `medical_records` | 8 | Registos médicos canónicos. |
| `medicine` | 3 | Workspace médico. |
| `modules` | 3 | Catálogo/navegação de domínios e módulos técnicos. |
| `monitoring` | 11 | Erros, cloud control, export jobs e monitorização. |
| `notifications` | 14 | Notificações, templates e logs. |
| `nursing` | 63 | Enfermagem, procedimentos, enfermarias, internamentos e sinais vitais. |
| `occupational-medicine` | 1 | Workspace de medicina ocupacional. |
| raiz `page.tsx` | 1 | Entrada principal/dashboard. |
| `patients` | 5 | Alias/atalho de pacientes. |
| `payments` | 21 | Pagamentos, recibos, transacções e reconciliações. |
| `pharmacy` | 41 | Farmácia, produtos, lotes, stock, vendas e requisições. |
| `profile` | 1 | Perfil do utilizador. |
| `receipts` | 1 | Atalho de recibos. |
| `reception` | 5 | Recepção e check-in. |
| `requests` | 5 | Atalho de requisições clínicas. |
| `resources` | 6 | Páginas genéricas de recursos por grupo/recurso. |
| `settings` | 1 | Definições. |
| `statistics` | 1 | Estatísticas. |
| `substrato` | 1 | Página institucional/interna do produto. |
| `surgery` | 18 | Cirurgia e procedimentos cirúrgicos. |
| `tenants` | 24 | Tenants, subscrições, planos, uso e feature flags. |
| `workspaces` | 1 | Selector de workspaces. |

## Padrões de rota

### Workspaces

Rotas de workspace agregam métricas e acções de alto nível:

- `/workspaces/`
- `/healthcare/`
- `/education/`
- `/education/teacher/`
- `/education/directoria/`
- `/education/student/`
- `/medicine/`
- `/laboratory/`
- `/nursing/`
- `/pharmacy/`
- `/accounting/`
- `/occupational-medicine/`

Estas páginas devem usar `AppLayout`, respeitar `requiredGroups` e carregar dados via `apiFetch`.

### CRUD gerado/manual por módulo

Padrão comum:

```text
/app/<modulo>/<recurso>/page.tsx
/app/<modulo>/<recurso>/new/page.tsx
/app/<modulo>/<recurso>/[id]/page.tsx
/app/<modulo>/<recurso>/[id]/edit/page.tsx
```

Alguns módulos usam `new`, outros `novo` ou páginas específicas. Ao criar rota nova, manter o padrão do módulo onde a rota vive.

### Recursos genéricos

`app/resources/` e `components/resources/GeneratedResourcePages.tsx` suportam navegação e CRUD baseados no catálogo de recursos. Usar quando o recurso segue CRUD padrão e não precisa de UX operacional própria.

### Catálogo por domínios

`app/modules/` mostra a organização lógica em `lib/domainModules.ts`, alinhada com o catálogo backend de domínios. A navegação por domínio não move nem renomeia os apps técnicos do frontend; cada módulo lógico aponta para recursos reais em `lib/modules.ts` e para endpoints existentes no OpenAPI.

Domínios expostos:

- `clinical`: pacientes, consultas, prontuário, odontologia, cirurgia, maternidade, especialidades e patologia.
- `diagnostics`: laboratório, radiologia, banco de sangue, diagnósticos especializados e farmácia clínica.
- `hospitalization`: emergência, internamento, cuidados intensivos e bloco operatório.
- `care`: enfermagem, fisioterapia, terapias e lacunas planejadas de nutrição/psicologia/serviços sociais.
- `operations`: inventário, compras, farmácia, equipamentos, manutenção, inspeções, incidentes e transporte.
- `administration`: finanças, faturação, pagamentos, seguros, crédito, RH e payroll.
- `platform`: tenants, identidade, utilizadores, permissões, auditoria, notificações, integrações e documentos planejados.
- `analytics` e `public_health`: monitorização/relatórios e saúde pública.

Regra: adicionar módulo lógico primeiro em `lib/domainModules.ts` e mapear para `groupKey/resourceKey` já presente em `lib/modules.ts`; criar rota nova apenas quando o recurso exigir UX própria.

### Aliases amigáveis

Existem rotas amigáveis em inglês ou português que apontam para recursos canónicos do backend:

- `patients` -> paciente clínico.
- `requests` -> requisições clínicas.
- `exams` -> exames.
- `entities` -> entidades externas.
- `medical-records` -> `medical_records`.
- `invoices`, `receipts`, `payments` -> fluxos financeiros.

Aliases devem ser tratados em `lib/openapi/endpointResolver.ts` e `lib/api/index.ts`, não por hacks locais em cada página.

## Rotas protegidas

Rotas com dados operacionais devem ser protegidas por:

- `useAuthGuard()` no layout/shell.
- `AppLayout requiredGroups={[...]}` quando a página exige grupos específicos.
- `lib/workspaceScope.ts` para restringir escopo `education` vs `healthcare`.
- Backend RBAC como controlo final.

## Convenções para páginas

- Páginas devem ser client components (`"use client"`) quando usam hooks, estado, `apiFetch` ou interacção.
- Páginas puramente estáticas podem permanecer server components.
- Listagens devem usar componentes reutilizáveis (`DataTable`, `Pagination`, `SearchInput`, `StatusBadge`) quando aplicável.
- Formulários CRUD devem usar `AutoForm` quando o contrato OpenAPI é suficiente.
- Fluxos críticos devem ter UI explícita, não apenas formulário genérico.

## Rotas que exigem cuidado especial

| Rota | Motivo |
|---|---|
| `app/recursos/[group]/[resource]/novo/page.tsx` | Lookup dinâmico de schema/formulário; sensível a aliases OpenAPI. |
| `app/resources/` | CRUD genérico e navegação por catálogo; qualquer alteração afecta múltiplos módulos. |
| `app/login/page.tsx` | Autenticação, tempo de resposta e sessão. |
| `app/pharmacy/` | Stock, PDFs, requisições e resposta blob/JSON. |
| `app/invoices/` e `app/billing/` | Facturação e contratos financeiros. |
| `app/clinical/`, `app/patients/`, `app/requests/`, `app/exams/` | Dados clínicos e compatibilidade de aliases. |
| `app/education/` | Separação de áreas professor/directoria/estudante e regras académicas. |
| `app/monitoring/` | Telemetria e erros; não deve vazar dados sensíveis. |

## Regras para adicionar rota

1. Confirmar se a rota é workspace, CRUD específico, CRUD genérico ou alias.
2. Definir `requiredGroups` e escopo de workspace.
3. Usar `apiFetch` ou cliente gerado; evitar `fetch` directo.
4. Garantir que o endpoint existe em `schema.generated.json` ou adicionar alias em `endpointResolver`.
5. Usar componentes base do design system.
6. Adicionar teste quando a rota toca contrato de API, formulário gerado, RBAC ou fluxo financeiro/clínico/farmácia/educação.
7. Actualizar este catálogo quando criar novo topo ou fluxo crítico.

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
