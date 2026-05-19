# SUBSTRATO OS

Arquitetura consolidada e executavel do SUBSTRATO, resultante da fusao entre `substrato.md` e a versao anterior de `substrato_os.md`.

Data: 2026-05-18  
Estado: aprovado para inicio de implementacao

---

## 1. Objetivo

Definir uma arquitetura final, segura e escalavel para evoluir o SUBSTRATO com foco em:

- modularizacao real por dominio
- escalabilidade rapida sem regressao funcional
- processamento de dados e eventos em baixa latencia
- relatorios operacionais e analiticos com alto desempenho
- operacao resiliente, sem travamentos em picos

Este documento substitui a visao apenas conceitual e passa a servir como contrato tecnico de execucao.

---

## 2. Escopo Deste Documento

Inclui:

- estado atual consolidado do repositorio
- arquitetura alvo (TO-BE)
- fronteira entre Python e Rust
- arquitetura de eventos e relatorios
- baseline de seguranca e observabilidade
- roadmap com criterios objetivos de aceite
- plano para corrigir o fluxo atual sem paralisar operacao

Nao inclui:

- detalhes de UX de cada modulo
- especificacao de cada endpoint
- modelo financeiro/comercial de licenciamento

---

## 3. Estado Atual Consolidado (AS-IS)

### 3.1 Stack operacional atual

- Backend: Django + DRF + Celery
- Frontend web: Next.js (App Router, TypeScript)
- Banco transacional: PostgreSQL
- Cache e fila: Redis
- Multi-tenant: isolamento logico por `inquilino`
- Eventos internos: event bus in-process + tarefas assicronas
- Observabilidade base: `/health/live`, `/health/ready`, `/metrics`, logs e auditoria

### 3.2 Dominios existentes no repositorio

- identidade
- tenants
- clinico
- medical_records (cardex)
- maternity
- nursing / enfermaria
- pharmacy
- billing
- payments
- accounting
- reception
- insurer
- notifications
- external_entities
- dashboard e analytics

### 3.3 Pontos fortes atuais

- fluxo clinico e administrativo ja funcional ponta-a-ponta
- base multi-tenant madura
- estrutura de modulos por app Django ja estabelecida
- API e frontend com acoplamento controlavel via OpenAPI

### 3.4 Limites atuais a resolver

- fronteiras de responsabilidade ainda difusas entre camadas
- pipeline de eventos sem contrato unico cross-service
- relatorios de alto volume ainda acoplados ao caminho transacional
- mecanismos anti-congestionamento ainda incompletos para escala agressiva

---

## 4. Principios Arquiteturais Finais

- Domain-first: regras de negocio nao vivem na camada de API.
- Modularidade forte: cada dominio e uma unidade evolutiva.
- Event-driven por contrato: eventos versionados, rastreaveis e idempotentes.
- Offline-first pragmatico: sincronizacao resiliente quando houver operacao remota.
- Security-by-default: zero trust interno, segregacao tenant e trilha de auditoria.
- Performance orientada a SLO: desempenho e tratado como requisito funcional.
- Evolucao incremental: sem reescrever tudo antes de entregar ganhos reais.

---

## 5. Decisoes Arquiteturais Finais

### DA-01: Estrategia de evolucao

Evoluir de monolito modular para arquitetura modular distribuivel, preservando entrega continua.  
Nao sera feito rewrite total do backend atual.

### DA-02: Fronteira de linguagens

- Python: dominio, API, orquestracao de casos de uso, integracoes empresariais.
- Rust: componentes de alto throughput e baixa latencia (pipeline de eventos, sync engine, processamento pesado de relatorios e projecoes).

### DA-03: Backbone de eventos v1

Padrao oficial v1: **NATS JetStream** como backbone principal de eventos operacionais.  
Kafka fica opcional para fase futura de analytics massivo e retenção longa.

### DA-04: Garantia de consistencia evento-dado

Adotar padrao **Transactional Outbox** no backend para publicacao confiavel de eventos apos commit.

### DA-05: Modelo de relatórios

Separar leitura operacional da escrita transacional com **Read Models** e **projecoes assincronas**.

### DA-06: Multi-tenant defensivo

Tenant scope obrigatorio em dominio, aplicacao, persistencia, cache e eventos.

### DA-07: Seguranca interna

Todo trafego service-to-service autenticado e autorizado; dados sensiveis cifrados em transito e em repouso.

### DA-08: Anti-travamento

Backpressure, retry com jitter, circuit breaker e idempotencia obrigatorios nos fluxos criticos.

---

## 6. Arquitetura Alvo (TO-BE)

```text
Clientes Web/Mobile/Desktop
          |
   API Gateway (Django/ASGI)
          |
  Application + Domain Services (Python)
          |\
          | \-- Transactional Outbox (PostgreSQL)
          |
          +--> NATS JetStream (event backbone)
                   |
                   +--> Rust Event Processor (consumo de alta taxa)
                   +--> Python Workers (tarefas de negocio)
                   +--> Projection Services (read models)

Datastores:
- PostgreSQL: OLTP + outbox + read models operacionais
- Redis: cache, locks distribuidos, rate limit, filas curtas
- SQLite: edge/offline local quando necessario

Observabilidade:
- OpenTelemetry (traces, metrics, logs)
- Prometheus + Grafana
- Auditoria imutavel por tenant
```

---

## 7. Ownership Por Linguagem

| Area | Dono principal | Motivo |
| --- | --- | --- |
| API REST/gRPC, RBAC, workflows de negocio | Python | velocidade de evolucao e ecossistema atual |
| Motor de eventos de alta taxa | Rust | latencia baixa, concorrencia segura, previsibilidade |
| Projecoes de relatorio de alto volume | Rust | throughput e controle de memoria |
| Integracoes externas (pagamentos, mensageria) | Python | produtividade e adaptadores existentes |
| Sync engine offline-first | Rust | resiliencia e performance em reconciliacao |
| UI e dashboards | Next.js | produtividade de produto e UX |

Regra: nao duplicar regra de negocio em duas linguagens.  
A verdade de dominio permanece no backend Python; Rust executa infraestrutura de desempenho.

---

## 8. Contrato de Modularizacao

Cada modulo deve obedecer a estrutura:

```text
apps/<modulo>/
  domain/
  application/
  infrastructure/
  api/
  events/
  tests/
```

Regras obrigatorias:

- `api/` nao acessa ORM diretamente sem passar por `application/`.
- `domain/` nao depende de framework web.
- `events/` define contratos e versoes de eventos do modulo.
- integracoes externas ficam em `infrastructure/`.
- toda regra critica tem teste unitario e teste de integracao.

---

## 9. Arquitetura de Eventos

### 9.1 Envelope oficial de evento

```json
{
  "event_id": "uuid",
  "event_type": "billing.invoice.issued.v1",
  "tenant_id": "uuid",
  "aggregate_id": "string",
  "aggregate_version": 1,
  "occurred_at": "2026-05-18T10:00:00Z",
  "trace_id": "string",
  "idempotency_key": "string",
  "payload": {}
}
```

### 9.2 Topicos iniciais

- `clinical.result.validated.v1`
- `billing.invoice.issued.v1`
- `payment.receipt.generated.v1`
- `pharmacy.stock.low.v1`
- `reception.checkin.completed.v1`

### 9.3 Garantias de entrega

- at-least-once + idempotencia obrigatoria no consumidor
- dead-letter stream por dominio
- retry exponencial com jitter
- ordenacao por `aggregate_id` quando necessario

---

## 10. Arquitetura de Dados e Relatorios

### 10.1 Camadas de dados

- OLTP: PostgreSQL (escrita transacional e consistencia)
- Outbox: tabela append-only para eventos apos commit
- Read models: tabelas denormalizadas por caso de uso
- Cache: Redis para leituras quentes e limites por tenant

### 10.2 Relatorios instantaneos sem bloquear operacao

- APIs transacionais nao executam query pesada de agregacao ad-hoc.
- Projecoes assincronas precomputam indicadores.
- Relatorios grandes rodam em job assincrono com estado (`pending`, `running`, `done`, `failed`).
- Download usa artefact store e expiracao controlada.

### 10.3 Estrategia de evolucao para analytics pesado

- Fase 1-2: read models no proprio PostgreSQL.
- Fase 3+: considerar armazenamento colunar dedicado para analytics historico massivo.

---

## 11. SLOs e NFRs Oficiais

| Categoria | Meta inicial |
| --- | --- |
| API leitura (p95) | <= 250 ms |
| API escrita (p95) | <= 500 ms |
| Publicacao de evento apos commit (p95) | <= 300 ms |
| Latencia fim-a-fim evento critico (p95) | <= 1 s |
| Dashboard operacional (p95) | <= 2 s |
| Relatorio padrao (ate 50 mil linhas) | <= 5 s |
| Disponibilidade mensal | >= 99.9% |
| Erro 5xx em producao | < 0.5% |
| RPO | <= 5 min |
| RTO | <= 30 min |

Sem cumprir SLO, a feature nao e considerada pronta.

---

## 12. Arquitetura de Seguranca Final

### 12.1 Identidade e autenticacao

- JWT de curta duracao + refresh token com rotacao
- MFA para perfis administrativos
- sessao e token revogaveis por tenant

### 12.2 Autorizacao

- RBAC como base
- ABAC para regras sensiveis (contexto de tenant, unidade, perfil clinico)
- policy checks centralizados na camada de aplicacao

### 12.3 Segregacao tenant

- tenant_id obrigatorio em entidades de negocio
- filtros tenant-safe no repositorio e na API
- auditoria por tenant e trilha de acesso a dados sensiveis

### 12.4 Criptografia e segredos

- TLS obrigatorio em todo trafego externo
- mTLS entre componentes internos criticos
- AES-256 em dados em repouso
- segredos fora do repositorio (secret manager)

### 12.5 Hardening operacional

- rate limit por tenant e por usuario
- WAF e protecao contra abuso em endpoints publicos
- assinaturas e verificacao de integridade de artefactos
- SBOM + scan de vulnerabilidades em CI

### 12.6 Auditoria e conformidade

- trilha imutavel de operacoes sensiveis
- correlacao por `trace_id` e `tenant_id`
- retention policy de logs e eventos auditaveis

---

## 13. Observabilidade e Operacao

Obrigatorio em todos os modulos:

- logs estruturados (`tenant_id`, `user_id`, `trace_id`, `event_id`)
- metricas tecnicas e de negocio
- tracing distribuido ponta-a-ponta
- health checks (liveness/readiness/startup)
- alertas com runbook de resposta

Alertas minimos:

- aumento de latencia p95
- fila de eventos acumulada
- taxa de erro por dominio
- falha de projecao de relatorios
- degradacao por tenant especifico

---

## 14. Plano de Implementacao Pronto Para Execucao

### Fase 0 - Baseline de controle (1-2 semanas)

Entregas:

- contrato de eventos v1 publicado
- instrumentacao OTel padrao no backend
- dashboard SLO inicial
- tabela outbox criada e migrada

Criterio de saida:

- pipeline atual continua funcional
- 100% dos fluxos criticos com `trace_id`

### Fase 1 - Modularizacao do fluxo atual (2-4 semanas)

Entregas:

- separar regras em `domain` e `application` nos modulos criticos
- padronizar comandos e handlers nos fluxos de recepcao, clinico, faturamento e pagamentos
- remover acoplamentos API->ORM onde houver risco

Criterio de saida:

- fluxos criticos cobertos por testes de integracao
- sem regressao funcional em check-in -> requisicao -> fatura -> pagamento

### Fase 2 - Backbone de eventos (3-5 semanas)

Entregas:

- NATS JetStream operacional
- publicacao por outbox
- consumidores idempotentes Python
- DLQ e retry policy por dominio

Criterio de saida:

- latencia p95 de evento critico <= 1s em carga definida

### Fase 3 - Componentes Rust de desempenho (4-6 semanas)

Entregas:

- Rust Event Processor para stream de alto volume
- Rust Projection Worker para read models pesados
- benchmark comparativo Python vs Rust documentado

Criterio de saida:

- melhoria minima de 2x no throughput dos fluxos alvo
- sem perda de consistencia funcional

### Fase 4 - Relatorios e hardening final (3-5 semanas)

Entregas:

- relatorios assincronos de grande volume
- cache e invalidação com estrategia clara por tenant
- hardening de seguranca e chaos tests basicos

Criterio de saida:

- relatorios grandes sem bloquear APIs operacionais
- erro 5xx dentro da meta definida

---

## 15. Plano de Correcao do Fluxo Atual

Fluxos a estabilizar primeiro:

- recepcao -> requisicao -> faturamento -> pagamento -> recibo
- laboratorio (resultado validado) -> faturamento
- farmacia (estoque e venda) -> faturamento

Ajustes obrigatorios:

- comandos de negocio com idempotencia
- estados explicitos e validacao de transicoes
- eventos apos commit (nunca antes)
- retriable steps fora da transacao principal
- compensacao em falhas de integracao externa

Resultado esperado:

- fluxo continua rapido ao utilizador
- processamento pesado sai do request-response
- falhas parciais deixam de travar operacao completa

---

## 16. Definicao de Pronto (Definition of Done Arquitetural)

Um modulo/fluxo so e considerado pronto quando:

- cumpre SLO definido para o caso de uso
- possui trilha de auditoria e rastreabilidade completa
- possui testes unitarios, integracao e contrato de evento
- possui runbook operacional e alertas
- passa checklist de seguranca e tenancy

---

## 17. Riscos Principais e Mitigacoes

- Risco: introduzir Rust sem fronteira clara.
  Mitigacao: contratos estaveis via eventos/gRPC e ownership explicito.

- Risco: explosao de complexidade operacional.
  Mitigacao: adocao faseada, medicao antes/depois e rollback simples.

- Risco: regressao em fluxos clinicos/faturacao.
  Mitigacao: testes de regressao de ponta-a-ponta e canary por tenant.

- Risco: gargalos em relatorios persistirem.
  Mitigacao: projecoes assincronas e fila dedicada para relatorios.

---

## 18. Estado Final

```text
STATUS: ARQUITETURA FINAL DEFINIDA E PRONTA PARA IMPLEMENTACAO INCREMENTAL
```

---

## 19. Anexo: Mapa de Compatibilidade com o Repositorio Atual

A evolucao proposta reaproveita a base existente:

- `apps/`, `application/`, `domain/`, `services/`, `infrastructure/`, `events/`, `tasks/`
- `frontend-next/` para UI e dashboards
- `monitoring/` e `kubernetes/` para operacao

Mudancas estruturais novas:

- `rust/` para componentes de performance
- `contracts/events/` para versionamento de eventos
- `architecture/adr/` para registro das decisoes arquiteturais

Este documento passa a ser a referencia principal de arquitetura do SUBSTRATO.
