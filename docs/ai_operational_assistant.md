# IA Operacional do Substrato

## Objetivo
Criar uma IA integrada ao Substrato para apoiar utilizadores finais e equipas operacionais em saúde, educação, finanças, farmácia, enfermagem, administração e monitoramento.

A IA deve funcionar como copiloto de operação, análise e navegação, respeitando sempre tenant, RBAC, auditoria, idioma escolhido pelo utilizador e limites de segurança clínica/financeira.

## Princípios
1. Multi-tenant obrigatório: a IA só pode ler dados do tenant ativo.
2. RBAC obrigatório: a IA herda exatamente as permissões do utilizador autenticado.
3. Auditoria completa: toda pergunta, resposta, ferramenta invocada e ação proposta deve gerar log rastreável.
4. Leitura antes de escrita: a primeira versão deve operar em modo consulta, resumo, recomendação e navegação.
5. Confirmação humana para ações: qualquer criação, alteração, faturamento, notificação ou execução operacional precisa de confirmação explícita.
6. Sem decisão clínica autónoma: a IA pode resumir, sinalizar risco e sugerir investigação, mas não diagnosticar nem prescrever.
7. Sem decisão financeira autónoma: a IA pode preparar cobranças, reconciliações e relatórios, mas não confirmar pagamento sem aprovação.
8. Idioma persistente: todas as respostas devem respeitar PT-PT ou EN conforme a preferência ativa do utilizador.

## Escopo Inicial
### Copiloto administrativo
- Consultar pacientes, requisições, consultas, faturas, pagamentos, recibos e seguradora.
- Explicar estados operacionais: pendente, validado, faturado, pago, cancelado, crítico.
- Abrir links internos e preparar filtros de páginas.

### Assistente operacional
- Ler dados do Command Center.
- Explicar alertas 4xx/5xx, rotas críticas, módulos abaixo de SLO e backlog da outbox.
- Sugerir próximos passos de triagem para administradores.

### Assistente clínico operacional
- Resumir histórico de paciente para utilizadores autorizados.
- Resumir requisições laboratoriais, exames solicitados, estado de amostras e resultados.
- Destacar resultados críticos já marcados pelo sistema.
- Não gerar diagnóstico ou prescrição autónoma.

### Assistente de relatórios
- Gerar resumos executivos, clínicos, financeiros e escolares.
- Preparar filtros por período, módulo, utilizador, setor, estado e tenant.
- Acionar exportações PDF/CSV/Word apenas após confirmação.

### Assistente de navegação
- Converter intenção do utilizador em rota interna.
- Exemplo: "mostrar requisições críticas de hoje" deve abrir a página correta com filtros aplicados.

## Fora de Escopo na Primeira Versão
1. Alterar dados clínicos sem confirmação.
2. Confirmar pagamentos automaticamente.
3. Apagar registos.
4. Enviar mensagens externas sem confirmação.
5. Treinar modelo com dados sensíveis do tenant.
6. Expor dados entre tenants.
7. Usar prompts sem rastreabilidade.

## Arquitetura Base
### Frontend
- Página principal: `/ai`
- Entrada global opcional no footer/header: "Assistente IA".
- Componentes:
  - `AiChatPanel`: conversa principal.
  - `AiContextBar`: contexto ativo, tenant, idioma, módulo e permissões.
  - `AiToolCallCard`: mostra ferramentas consultadas e resultados resumidos.
  - `AiConfirmationDialog`: confirmação antes de qualquer ação.
  - `AiCitationList`: fontes internas usadas na resposta.

### Backend
- App sugerida: `apps/ai_assistant`
- API sugerida: `/api/v1/ai/assistant/`
- Endpoints iniciais:
  - `POST /api/v1/ai/assistant/chat/`
  - `GET /api/v1/ai/assistant/sessions/`
  - `GET /api/v1/ai/assistant/sessions/{id}/`
  - `POST /api/v1/ai/assistant/actions/{id}/confirm/`
  - `POST /api/v1/ai/assistant/actions/{id}/cancel/`

### Serviços
- `AiOrchestrator`: recebe mensagem, resolve contexto e coordena ferramentas.
- `AiPolicyGuard`: aplica RBAC, tenant, limites de segurança e modo leitura/escrita.
- `AiToolRegistry`: lista ferramentas disponíveis por grupo/permissão.
- `AiResponseBuilder`: monta resposta, fontes e ações sugeridas.
- `AiAuditLogger`: grava sessões, mensagens, ferramentas, latência e decisões.

### Modelo de Dados
- `AiSession`
  - tenant, user, title, language, active_module, created_at, updated_at.
- `AiMessage`
  - session, role, content, metadata, token_count, created_at.
- `AiToolCall`
  - session, message, tool_name, input_redacted, output_summary, status, duration_ms.
- `AiSuggestedAction`
  - session, action_type, payload, status, requires_confirmation, confirmed_by, confirmed_at.
- `AiPolicyEvent`
  - session, severity, reason, blocked, metadata.

## Ferramentas Internas da IA
### Leitura
- `search_patients`
- `get_patient_summary`
- `search_lab_requests`
- `get_lab_request_status`
- `search_invoices`
- `search_payments`
- `search_pharmacy_stock`
- `get_command_center_alerts`
- `get_module_health`
- `get_user_activity_summary`
- `get_education_summary`

### Preparação de ações
- `prepare_report_export`
- `prepare_internal_notification`
- `prepare_task_assignment`
- `prepare_filtered_navigation`

### Escrita com confirmação humana
- `confirm_report_export`
- `confirm_internal_notification`
- `confirm_task_assignment`

Nenhuma ferramenta de escrita deve executar diretamente a partir do prompt. A IA prepara a ação, apresenta impacto e aguarda confirmação explícita.

## Segurança e Privacidade
### Proteção de dados
- Nunca enviar campos sensíveis ao provedor de IA sem minimização.
- Redigir dados desnecessários: documento, telefone, email, endereço, IP e identificadores externos quando não forem necessários.
- Preferir resumos internos a payloads completos.
- Usar IDs internos e links de detalhe em vez de expor grandes blocos de dados.

### RBAC
- A IA deve usar as mesmas regras do backend.
- Se o utilizador não tem acesso a um endpoint, a ferramenta correspondente não aparece no registry.
- Tentativas bloqueadas devem gerar `AiPolicyEvent`.

### Auditoria
- Toda conversa deve ser auditável por tenant.
- Toda ferramenta deve registar:
  - utilizador;
  - tenant;
  - ferramenta;
  - input redigido;
  - resultado resumido;
  - duração;
  - estado;
  - erro, quando houver.

### Prompts
- Prompt de sistema versionado no repositório.
- Prompt deve incluir:
  - regras de segurança;
  - proibição de decisão clínica autónoma;
  - proibição de escrita sem confirmação;
  - política de idioma;
  - política de citação de fontes internas.

## Integração com Command Center
A IA deve consumir o endpoint operacional já previsto para o Command Center:

- `GET /api/v1/monitoring/telemetry/command_center/`

Casos de uso:
- "Por que o sistema está com erro?"
- "Quais módulos estão abaixo do SLO?"
- "Mostre as rotas críticas com 5xx."
- "Prepare um resumo executivo dos últimos 7 dias."
- "Que equipa deve agir primeiro?"

## Integração com Eventos
Na fase de orquestração, a IA deve ler eventos do outbox/event bus e explicar cadeias operacionais.

Exemplo:
1. Recepção cria requisição laboratorial.
2. Evento `clinical.lab_request.created` é emitido.
3. Enfermagem recebe tarefa de colheita.
4. Laboratório recebe fila de execução.
5. Command Center rastreia o ciclo.
6. IA explica estado, bloqueio e próximo passo.

## Idioma
- O backend deve receber `Accept-Language`.
- Sessões guardam `language`.
- Respostas devem sair em PT-PT quando o utilizador estiver em português.
- O utilizador pode pedir tradução da própria resposta.
- Nomes técnicos de rotas, endpoints, tabelas e campos não devem ser traduzidos quando a tradução quebrar rastreabilidade.

## UX Inicial
### Entrada principal
- Menu lateral: "Assistente IA".
- Rodapé: atalho compacto quando o utilizador estiver autenticado.

### Layout
- Coluna principal com chat.
- Painel lateral com:
  - contexto ativo;
  - fontes usadas;
  - ações sugeridas;
  - alertas relacionados.

### Estados obrigatórios
- Carregando resposta.
- Ferramenta em execução.
- Sem permissão.
- Ação pendente de confirmação.
- Ação concluída.
- Ação cancelada.
- Erro auditado.

## Roadmap de Implementação
### Sprint IA-1: Fundação segura
- Criar app `ai_assistant`.
- Criar modelos de sessão, mensagem, tool call, ação sugerida e policy event.
- Criar endpoint `chat`.
- Implementar `AiPolicyGuard`.
- Implementar primeira ferramenta: `get_command_center_alerts`.
- Criar frontend `/ai` com chat básico.

### Sprint IA-2: Ferramentas de leitura operacional
- Pacientes, requisições, faturas, pagamentos, farmácia e educação.
- Respostas com fontes internas.
- Navegação inteligente para páginas filtradas.
- Logs de auditoria detalhados.

### Sprint IA-3: Ações com confirmação
- Exportar relatório.
- Criar notificação interna.
- Criar tarefa operacional.
- Confirmar/cancelar ação sugerida.

### Sprint IA-4: Governança avançada
- Painel admin para sessões e auditoria.
- Métricas de uso da IA.
- Avaliação de respostas.
- Testes de segurança e regressão de permissões.

## Critérios de Aceite da Primeira Versão
1. Utilizador autenticado consegue abrir `/ai`.
2. IA responde no idioma ativo.
3. IA consegue explicar alertas do Command Center.
4. IA não mostra dados fora do tenant.
5. IA bloqueia ferramenta sem permissão.
6. Toda chamada gera auditoria.
7. Nenhuma ação de escrita executa sem confirmação.
8. Testes cobrem RBAC, tenant, auditoria e bloqueio de ação sensível.

## Riscos
### Vazamento de dados entre tenants
Mitigação: todas as ferramentas recebem tenant obrigatório e usam querysets tenant-scoped.

### Alucinação operacional
Mitigação: resposta deve citar fontes internas; quando não houver dados, dizer que não há evidência suficiente.

### Ação indevida
Mitigação: modo leitura por padrão e confirmação obrigatória para escrita.

### Exposição de dados sensíveis ao provedor
Mitigação: minimização, redacção e preferência por resumos.

### Sobrecarga de custos
Mitigação: limites por utilizador, cache de resumos e métricas de token por tenant.

## Decisão Inicial Recomendada
A primeira implementação deve ser um copiloto em modo leitura ligado ao Command Center.

Motivo: aproveita dados operacionais já existentes, reduz risco, entrega valor rápido aos administradores e cria a base de auditoria antes de tocar em dados clínicos ou financeiros.
