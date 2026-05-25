# Catálogo de Módulos do Backend

Actualizado: 2026-05-25

Este catálogo foi construído a partir da árvore real do repositório. Serve para localizar rapidamente onde cada responsabilidade vive e para orientar revisões módulo a módulo.

## Raízes técnicas

| Raiz | Ficheiros Python | Finalidade |
|---|---:|---|
| `api/` | 221 | Camada HTTP/DRF, serializers, viewsets e routing v1. |
| `apps/` | 341 | Aplicações Django de domínio, modelos, admin, sinais e comandos. |
| `core/` | 74 | Base técnica comum: modelos base, mixins, constantes, ORM, eventos, validações e utilitários. |
| `services/` | 51 | Serviços de aplicação e domínio usados por views, tarefas e integrações. |
| `tasks/` | 34 | Geração de PDFs, jobs assíncronos e tarefas operacionais. |
| `infrastructure/` | 56 | Adaptadores de infra: middleware, contexto, cache, storage, base de dados, outbox e resiliência. |
| `security/` | 28 | Autenticação, RBAC, permissões, auditoria de acesso, rate limit e sanitização. |
| `platform/` | 12 | Configuração Django real por ambiente, URLs, Celery e WSGI/ASGI. |
| `plataforma/` | 3 | Compatibilidade para carregar settings do pacote `platform` local. |
| `application/` | 55 | Camada de casos de uso quando separada do Django app. |
| `domain/` | 65 | Entidades, regras e contratos independentes de framework. |
| `events/` | 15 | Eventos de domínio por módulo. |
| `integrations/` | 34 | Conectores/adaptadores para sistemas externos. |
| `observability/` | 12 | Métricas, tracing e apoio operacional. |
| `configuration/` | 14 | Configuração auxiliar. |
| `quality/` | 2 | Ferramentas e artefactos de qualidade. |
| `audit/` | 3 | Auditoria auxiliar/legada. |
| `shared/` | 2 | Código partilhado sem pertença clara a um módulo. |
| `system/` | 14 | Código de sistema/suporte. |
| `users/` | 5 | Compatibilidade/legado relacionado com utilizadores. |

## Aplicações Django

| Aplicação | Py app | Py API | Py serviços | Modelos | Serializers | ViewSets/Views | Serviços | Testes | Responsabilidade principal |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `accounting` | 19 | 6 | 2 | 7 | 4 | 5 | 2 | 1 | Plano de contas, lançamentos, saldos e reconciliação financeira. |
| `ai_assistant` | 41 | 0 | 0 | 15 | 0 | 0 | 0 | 0 | Sessões, mensagens, conhecimento, ferramentas e governação do assistente IA. |
| `audit_activities` | 9 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | Actividade de utilizador e rastreio de acções. |
| `billing` | 13 | 6 | 5 | 6 | 3 | 3 | 5 | 1 | Facturas, itens, histórico, cálculo e integração com pagamentos/seguradoras. |
| `bloodbank` | 11 | 6 | 0 | 19 | 10 | 7 | 0 | 0 | Dadores, doações, unidades, stock, armazenamento e transfusões. |
| `clinical` | 27 | 13 | 5 | 19 | 13 | 10 | 5 | 2 | Pacientes, exames, requisições, resultados e histórico clínico. |
| `consultations` | 13 | 6 | 0 | 5 | 7 | 5 | 0 | 0 | Consultas, especialidades, feriados, preços e estado operacional. |
| `education` | 27 | 6 | 2 | 24 | 20 | 19 | 2 | 0 | Cursos, inscrições, turmas, avaliações, exames, presenças e conteúdos. |
| `equipment` | 9 | 6 | 0 | 3 | 4 | 4 | 0 | 0 | Cadastro e estado operacional de equipamentos. |
| `equipment_integrations` | 18 | 5 | 0 | 14 | 19 | 11 | 0 | 1 | Worklist, inbox, credenciais, mensagens e mapeamentos de equipamentos. |
| `external_entities` | 9 | 6 | 0 | 1 | 1 | 1 | 0 | 0 | Empresas e entidades externas usadas por seguros, contratos e parceiros. |
| `human_resources` | 18 | 6 | 0 | 17 | 11 | 12 | 0 | 0 | Funcionários, profissões, escalas, ausências, horas extra, folha salarial e processos disciplinares. |
| `identity` | 23 | 6 | 0 | 4 | 3 | 3 | 0 | 0 | Utilizadores, perfis profissionais, tokens de reposição e bootstrap RBAC. |
| `incidents` | 8 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | Incidentes operacionais e tipos. |
| `inspections` | 8 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | Inspecções diárias e estado de funcionamento. |
| `insurer` | 12 | 7 | 7 | 5 | 4 | 4 | 7 | 1 | Seguradoras, planos, cobertura, autorizações e co-pagamentos. |
| `maintenance` | 8 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | Manutenção e tipos de manutenção. |
| `maternity` | 8 | 6 | 0 | 2 | 1 | 1 | 0 | 0 | Gravidez e estado de acompanhamento materno. |
| `medical_records` | 10 | 6 | 0 | 4 | 2 | 2 | 0 | 0 | Registos médicos e prescrições associadas. |
| `monitoring` | 14 | 6 | 0 | 3 | 1 | 4 | 0 | 0 | Erros de sistema, outbox transaccional e controlo cloud/export jobs. |
| `notifications` | 18 | 6 | 3 | 5 | 3 | 3 | 3 | 1 | Notificações, templates, canais e logs de entrega. |
| `nursing` | 23 | 6 | 0 | 19 | 17 | 16 | 0 | 1 | Enfermagem, sinais vitais, procedimentos, prescrições, internamentos e materiais. |
| `payments` | 12 | 6 | 2 | 8 | 4 | 4 | 2 | 1 | Pagamentos, recibos, transacções, histórico e reconciliação. |
| `pharmacy` | 18 | 6 | 3 | 14 | 8 | 7 | 3 | 1 | Produtos, lotes, stock, movimentos, vendas e requisições de material. |
| `reception` | 8 | 6 | 0 | 3 | 9 | 3 | 0 | 1 | Check-in, prioridades e estado de recepção. |
| `surgery` | 10 | 6 | 0 | 9 | 5 | 5 | 0 | 0 | Procedimentos cirúrgicos, cirurgias pequenas/grandes, estado e custos. |
| `tenants` | 14 | 6 | 3 | 10 | 5 | 5 | 3 | 1 | Tenants, planos, subscrições, uso, configuração e feature flags. |

## Mapa por módulo

### `accounting`

- Código de domínio: `apps/accounting/`.
- API: `api/v1/accounting/`.
- Serviços: `services/accounting/`.
- Entidades principais: `Account`, `LedgerEntry`, `LedgerLine`, `AccountBalance`, `FinancialReconciliation`.
- Cuidados: lançamentos financeiros devem ser transaccionais, auditáveis e consistentes com facturação/pagamentos.

### `ai_assistant`

- Código de domínio: `apps/ai_assistant/`.
- Serviços internos: `apps/ai_assistant/services/`.
- Ferramentas: `apps/ai_assistant/tools/`.
- Entidades principais: `AiSession`, `AiMessage`, `AiToolCall`, `AiKnowledgeEntry`, `AiOperationalTask`, `AiPolicyEvent`.
- Cuidados: não permitir acções destrutivas sem confirmação quando `AI_ACTION_CONFIRMATION_REQUIRED` estiver activo; manter redacção de dados sensíveis e limites por utilizador.

### `audit_activities`

- Código de domínio: `apps/audit_activities/`.
- Entidade principal: `UserActivity`.
- Cuidados: actividade de utilizador deve ser append-only sempre que possível e nunca bloquear o fluxo principal por erro não crítico.

### `billing`

- Código de domínio: `apps/billing/`.
- API: `api/v1/billing/`.
- Serviços: `services/billing/`.
- Entidades principais: `Invoice`, `InvoiceItem`, `InvoiceHistory`.
- Cuidados: cálculo de factura deve ser determinístico, testado e alinhado com pagamentos, seguradora e contabilidade.

### `bloodbank`

- Código de domínio: `apps/bloodbank/`.
- API: `api/v1/bloodbank/`.
- Entidades principais: dadores, doações, unidades de sangue, stock, armazenamento, manutenção e transfusões.
- Cuidados: estados de doação, devolução ao stock, aviação e transfusão devem ser tratados como máquina de estados, não apenas como labels de UI.

### `clinical`

- Código de domínio: `apps/clinical/`.
- API: `api/v1/clinical/`.
- Serviços: `services/clinical/`.
- Entidades principais: `Patient`, `LabRequest`, `LabRequestItem`, `Result`, `ResultItem`, `MedicalExam`, `LabExam`.
- Cuidados: criação de resultados a partir de requisições deve preservar tenant, paciente, exame, itens e histórico clínico.

### `consultations`

- Código de domínio: `apps/consultations/`.
- API: `api/v1/consultations/`.
- Entidades principais: consulta médica, especialidade e feriado.
- Cuidados: preços e disponibilidade dependem de especialidade, feriados e regras de tenant.

### `education`

- Código de domínio: `apps/education/`.
- API: `api/v1/education/`.
- Serviços: `services/education/`.
- Entidades principais: curso, turma, inscrição, avaliação, exame, tentativa, submissão, presença, conteúdo e fase final.
- Cuidados: regras académicas devem ficar em modelo/serviço; tentativas, reprovação, repetição anual e datas devem ter testes de regressão.

### `equipment` e `equipment_integrations`

- Cadastro de equipamentos: `apps/equipment/` e `api/v1/equipment/`.
- Integrações: `apps/equipment_integrations/`, `api/v1/equipment_integrations/`.
- Entidades principais: equipamento, credencial, routing, ordem, item, mensagem, documento e mapeamento de analitos.
- Cuidados: credenciais devem ser revogáveis, mensagens devem ser idempotentes e resultados externos devem ser validados antes de criar resultado clínico.

### `external_entities`

- Código de domínio: `apps/external_entities/`.
- API: `api/v1/external_entities/`.
- Entidade principal: `Company`.
- Cuidados: usar aliases centralizados para compatibilidade quando o frontend ou integrações chamarem `entities` em vez de `external_entities`.

### `human_resources`

- Código de domínio: `apps/human_resources/`.
- API: `api/v1/human_resources/`.
- Entidades principais: funcionário, profissão, cargo, escala, ausência, horas extra, folha salarial, dependentes e processos disciplinares.
- Cuidados: salário base, salário líquido, horas ordinárias/extraordinárias e descontos devem ser calculados em camada testável.

### `identity`

- Código de domínio: `apps/identity/`.
- API: `api/v1/identity/` e `api/v1/auth/`.
- Segurança: `security/`.
- Entidades principais: `User`, `ProfessionalProfile`, `PasswordResetToken`.
- Cuidados: grupos, permissões, superuser allowlist e tenant devem ser tratados como controlo de acesso, não apenas como filtros de UI.

### `insurer`

- Código de domínio: `apps/insurer/`.
- API: `api/v1/insurer/`.
- Serviços: `services/insurer/`.
- Entidades principais: seguradora, plano de cobertura, plano por tenant e autorização de procedimento.
- Cuidados: cálculo de cobertura/co-pagamento deve ser determinístico e auditável.

### `maintenance`, `incidents` e `inspections`

- Código: `apps/maintenance/`, `apps/incidents/`, `apps/inspections/`.
- Responsabilidade: manutenção, incidentes e inspecções operacionais.
- Cuidados: estes módulos são candidatos a reforço de API/serializers se passarem a ser usados no frontend operacional.

### `maternity`

- Código de domínio: `apps/maternity/`.
- API: `api/v1/maternity/`.
- Entidade principal: gravidez/acompanhamento.
- Cuidados: dados clínicos sensíveis devem respeitar tenant, auditoria e permissões.

### `medical_records`

- Código de domínio: `apps/medical_records/`.
- API: `api/v1/medical_records/`.
- Entidades principais: entrada de registo médico e item de prescrição.
- Cuidados: nunca expor registos de outro tenant; preservar histórico clínico e autoria.

### `monitoring`

- Código de domínio: `apps/monitoring/`.
- API: `api/v1/monitoring/`.
- Entidades principais: erro de sistema e outbox transaccional.
- Cuidados: monitorização não deve vazar dados sensíveis em payloads de erro.

### `notifications`

- Código de domínio: `apps/notifications/`.
- API: `api/v1/notifications/`.
- Serviços: `services/notifications/`.
- Entidades principais: notificação, template e log de entrega.
- Cuidados: canais desactivados por configuração devem retornar estado explícito e não falhar silenciosamente.

### `nursing`

- Código de domínio: `apps/nursing/`.
- API: `api/v1/nursing/`.
- Entidades principais: sinais vitais, procedimentos, prescrição, evolução, enfermaria, cama e internamento.
- Cuidados: materiais, prescrições e internamentos activos devem ter validação de disponibilidade e estado.

### `payments`

- Código de domínio: `apps/payments/`.
- API: `api/v1/payments/`.
- Serviços: `services/payments/`.
- Entidades principais: pagamento, recibo, transacção, histórico e reconciliação.
- Cuidados: métodos de pagamento e reconciliação devem ser consistentes com billing e accounting.

### `pharmacy`

- Código de domínio: `apps/pharmacy/`.
- API: `api/v1/pharmacy/`.
- Serviços: `services/pharmacy/`.
- Entidades principais: produto, categoria, lote, movimento, venda, requisição de material e item de requisição.
- Cuidados: stock deve ser tratado de forma transaccional; PDFs devem ter resposta síncrona quando o cliente espera blob e fila assíncrona quando solicitado.

### `reception`

- Código de domínio: `apps/reception/`.
- API: `api/v1/reception/`.
- Entidade principal: check-in de recepção.
- Cuidados: prioridade e estado de atendimento alimentam fluxos clínicos e operacionais.

### `surgery`

- Código de domínio: `apps/surgery/`.
- API: `api/v1/surgery/`.
- Entidades principais: procedimento cirúrgico, cirurgia pequena, cirurgia grande e cirurgia base.
- Cuidados: custos, VAT e segmentação pequena/grande devem continuar compatíveis com IA, billing e frontend.

### `tenants`

- Código de domínio: `apps/tenants/`.
- API: `api/v1/tenants/`.
- Serviços: `services/tenants/`.
- Entidades principais: tenant, plano, subscrição, uso, configuração e feature flag.
- Cuidados: limites e estado comercial devem ser aplicados por middleware/serviço, não apenas por UI.

## Regras para manter o catálogo

- Ao adicionar uma aplicação em `apps/`, também adicionar entrada neste documento.
- Ao adicionar API pública em `api/v1/<modulo>/`, documentar contrato em `api_contract.md` e o módulo aqui.
- Ao mover regra para `services/`, documentar dono da regra e testes esperados.
- Ao adicionar módulo sem testes, registar risco e plano de cobertura em `docs/technical_debt_register.md`.
