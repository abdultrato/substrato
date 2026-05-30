# Componentes e Design System

Actualizado: 2026-05-25

O frontend usa Tailwind CSS com componentes reutilizáveis em `frontend-next/components/`. O objectivo é manter uma interface operacional consistente sem bloquear páginas específicas que exigem UX própria.

## Estrutura de componentes

| Pasta | Responsabilidade |
|---|---|
| `components/ui/` | Componentes base: botões, cards, inputs, tabelas, badges, modais, toasts e indicadores. |
| `components/layout/` | Shell principal autenticado: `AppLayout`, `Sidebar`, `Header`, `Footer`, containers e headers. |
| `components/navigation/` | Navegação alternativa/warmup, sidebar mobile, feedback e prefetch. |
| `components/form/` | `AutoForm` e campos reutilizáveis para formulários. |
| `components/resources/` | Páginas e cartões de recursos gerados por catálogo. |
| `components/ai/` | Painéis do assistente IA, evidências, tarefas, ferramentas e investigações. |
| `components/i18n/` | Switch de idioma e tradução automática de árvore. |
| `components/monitoring/` | Telemetria de erros do frontend. |
| `components/auth/` | Estados de autorização, como acesso negado. |
| `components/workspace/` | Hub/selector de workspaces. |

## Tokens visuais

`tailwind.config.js` define:

- Paleta `substrato` com tons de violeta/azul institucional.
- Aliases `slate` e `gray` mapeados para a paleta Substrato.
- Cores via CSS variables: `background`, `foreground`, `card`, `muted`, `border`, `primary`, `ring`.
- Fontes `sans` e `display` por variáveis CSS.
- Radius e sombras por variáveis.
- Animações `fade-in` e `scale-in`.

`app/globals.css` é a fonte dos tokens globais de tema. Alterações de tema devem preservar modo claro/escuro, contraste e legibilidade.

## Layout principal

`components/layout/AppLayout.tsx` é o shell para páginas autenticadas. Responsabilidades:

- Aplicar `useAuthGuard`.
- Verificar `requiredGroups`.
- Controlar sidebar desktop/mobile.
- Persistir estado da sidebar.
- Aplicar restrição por workspace (`education` vs `healthcare`).
- Redireccionar tentativas de navegação sem acesso.
- Renderizar `AccessDenied` quando aplicável.

Páginas operacionais devem usar `AppLayout`, salvo login, acesso negado ou páginas públicas.

## Navegação

- `Sidebar` apresenta a navegação principal.
- `NavigationWarmup` prepara rotas comuns para percepção de velocidade.
- `NavigationClickFeedback` dá feedback em navegações internas.
- `RequestActivityIndicator` mostra actividade de requests HTTP.

Ao adicionar rota importante, verificar se deve entrar no menu, no catálogo de módulos ou apenas em links contextuais.

## UI base

Preferir componentes em `components/ui/` antes de criar HTML local:

- `Button`, `Card`, `MetricCard`, `ActionTile` para acções e painéis.
- `DataTable`, `Pagination`, `SearchInput` para listagens.
- `TextInput`, `SelectInput`, `CheckboxInput`, `RadioGroup`, `TextAreaInput` para inputs.
- `Badge`, `StatusBadge`, `MoneyValue` para valores formatados.
- `Modal`, `ConfirmDialog`, `Toast`, `ToastContainer` para feedback e confirmação.
- `LoadingSpinner`, `EmptyState` para estados de carregamento/vazio.

## Formulários

`components/form/` contém componentes de formulário usados pelo `AutoForm` e por páginas específicas:

- `AutoForm` para formulários gerados por OpenAPI.
- `FormField`, `FormInput`, `FormSelect`, `FormTextarea`, `FormCheckbox` para composição.
- `FormActions` para acções padrão.
- `Etapas` para fluxos em etapas.

Regras:

- Campos de tenant, auditoria e soft delete devem ser readonly ou invisíveis quando apropriado.
- Formulários críticos devem mostrar contexto operacional antes da submissão.
- Erros de backend devem ser apresentados de forma accionável.

## i18n

A aplicação usa abordagem pragmática:

- Texto controlado por `useLanguage().t(pt, en)` em páginas/componentes.
- `AutoTranslateTree` ajuda em conteúdo não explicitamente traduzido.
- `GlobalLanguageSwitch` permite alternância.
- O idioma também influencia `Accept-Language` enviado ao backend.

Regra: não substituir identificadores técnicos, rotas ou nomes de ficheiro durante tradução.

## IA

Componentes em `components/ai/` mostram:

- Acções sugeridas.
- Evidências.
- Investigações.
- Tarefas operacionais.
- Trace de ferramentas.

Estes componentes devem ser tratados como UI de decisão assistida: mostrar contexto e evitar executar acções irreversíveis sem confirmação quando a política backend exige confirmação.

## Monitorização

`FrontendErrorTelemetry` e telemetria de API reportam erros. Cuidados:

- Não incluir passwords, tokens ou dados clínicos completos em telemetria.
- Evitar loops de telemetria ao reportar erro no próprio endpoint de monitoring.
- Mostrar feedback ao utilizador quando a falha impede acção operacional.

## Regras de design

- Preservar a linguagem visual existente do Substrato, em vez de introduzir tema paralelo por página.
- Preferir composição com componentes base e tokens CSS/Tailwind.
- Não usar cores hardcoded quando já existe token equivalente.
- Usar estados de loading, vazio, erro e sucesso de forma explícita.
- Garantir responsividade mobile/desktop em páginas novas.
- Evitar tabelas largas sem scroll, paginação ou layout alternativo.

## Checklist para componente novo

1. Confirmar se já existe componente em `components/ui/`, `layout`, `form` ou `resources`.
2. Definir props tipadas e sem dependência desnecessária de rota global.
3. Garantir estados `loading`, `empty`, `error` quando aplicável.
4. Usar `t(pt, en)` se houver texto visível.
5. Usar tokens Tailwind existentes.
6. Adicionar teste quando o componente contém regra, permissão, transformação de dados ou contrato de API.

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
