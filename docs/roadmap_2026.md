# Roadmap Substrato 2026

## Visão Geral

Plano de evolução do Substrato com foco em: (1) eliminar dívida técnica crítica, (2) melhorar escalabilidade operacional, (3) expandir funcionalidades clínicas, (4) otimizar frontend.

**Status**: Ativo desde maio/2026  
**Última atualização**: 2026-05-20  
**Owner**: Squad de engenharia

---

## 📈 Timeline Consolidada

```
Maio/2026          Junho/2026         Julho/2026         Agosto/2026
├─ T1 (Relatos)   ├─ T2 (DB Perf)    ├─ T3 (Obs)        ├─ T4 (Clínico)
└─ Init Sprint 1   └─ Init Sprint 2   └─ Init Sprint 3   └─ Init Sprint 4+
```

---

## Sprint 1: Eliminação de Dívida Crítica – Exportações Assíncronas

**Período**: 2026-05-20 → 2026-06-30  
**Owner**: Backend Squad  
**Prioridade**: 🔴 Crítica

### Objetivo

Migrar todos os endpoints de exportação (relatórios, PDFs, CSVs) para fila assíncrona (`export_job`), eliminando bloqueios na API e melhorando SLOs.

### Tarefas

- [ ] **T1.1**: Audit de endpoints síncronos
  - Mapear todos endpoints que servem relatórios/exportações
  - Documentar padrão atual (request-response vs job)
  - Identificar bottlenecks
  - **Entrega**: `docs/export_audit.md`

- [ ] **T1.2**: Design do novo fluxo assíncrono
  - Estender modelo `ExportJob` (se necessário)
  - Definir estados e transições
  - Especificar webhooks/polling para cliente
  - **Entrega**: `docs/async_exports_design.md` (revisado)

- [ ] **T1.3**: Refactor de serializers e processamento
  - Extrair lógica de geração de relatório em `services/exports.py`
  - Criar celery tasks `generate_pdf_report`, `generate_csv_export`, etc.
  - Implementar retry com backoff exponencial
  - **Entrega**: Código em `services/exports.py` + celery tasks

- [ ] **T1.4**: Migração de endpoints
  - Converter endpoints síncronos → POST com enqueue para job
  - Manter backward compatibility com flag `LEGACY_SYNC_EXPORTS=False` (opt-in)
  - Adicionar logging estruturado
  - **Entrega**: Endpoints refatorados, testes

- [ ] **T1.5**: Testes e-to-e
  - Testes de job com Celery (eager + worker real)
  - Testes de timeout, retry e falha
  - **Cobertura**: >= 80% de novo código

- [ ] **T1.6**: Documentação para operações
  - Runbook: monitorar fila de exports
  - Alertas: export job stuck > 30min
  - **Entrega**: `docs/operations_runbook.md` (seção export)

### Critérios de Sucesso

- ✅ 100% de endpoints de exportação em assíncrono (produção)
- ✅ Error rate em `/api/v1/exports/` <= 3%
- ✅ Export job p95 latency <= 8s
- ✅ Zero regressões em testes existentes
- ✅ Cobertura >= 35% (gate global)

### Dependências

- Redis operacional em produção
- Celery workers configurados
- Logging estruturado em produção

### Risco

- **Alto**: Mudança em padrão crítico → regressão em produção
- **Mitigação**: Feature flag, canary deployment, alert em SLO

---

## Sprint 2: Otimização de Performance DB

**Período**: 2026-06-15 → 2026-06-30  
**Owner**: Backend Squad + DBA  
**Prioridade**: 🔴 Alta

### Objetivo

Melhorar latência de queries de histórico clínico e faturamento através de índices, particionamento e profiling.

### Tarefas

- [ ] **T2.1**: Profiling de queries lentas
  - Rodar `django-silk` ou `pg_stat_statements` em staging
  - Identificar top 10 queries lentas
  - **Entrega**: Relatório com plano

- [ ] **T2.2**: Criar índices de otimização
  - Índices compostos para filtros de data + tenant
  - Índices em ForeignKeys frequentes
  - **Entrega**: Migration Django com índices

- [ ] **T2.3**: Revisão de queries N+1
  - Verificar `select_related` / `prefetch_related` em viewsets críticos
  - Testar com Django Debug Toolbar
  - **Entrega**: Patches em viewsets

- [ ] **T2.4**: Monitoramento contínuo
  - Adicionar recording rule em Prometheus para latência p95 por query
  - Configurar alertas: p95 > 2s
  - **Entrega**: Dashboards Grafana atualizados

### Critérios de Sucesso

- ✅ Latência p95 de queries críticas reduzida em >= 30%
- ✅ CPU de DB reduzido em >= 20%
- ✅ Sem regressões em testes

### Dependências

- Sprint 1 parcialmente concluída (para não poluir métricas)

---

## Sprint 3: Observabilidade & SLOs por Tenant

**Período**: 2026-06-20 → 2026-07-20  
**Owner**: Ops Squad + Backend  
**Prioridade**: 🟠 Média

### Objetivo

Expandir dashboards Prometheus/Grafana com SLOs e error budgets segmentados por tenant.

### Tarefas

- [ ] **T3.1**: Instrumentação de métricas por tenant
  - Adicionar label `tenant_id` em métricas existentes (latência, erro, fila)
  - Testes com prometheus_client
  - **Entrega**: Código em `observability/metrics.py`

- [ ] **T3.2**: Recording rules de SLO
  - Definir SLI (Service Level Indicator) para latency, availability, job completion
  - Implementar error budget: 99.9% availability = 43.2 min/mês
  - **Entrega**: `observability/prometheus_rules.yaml`

- [ ] **T3.3**: Dashboards por tenant
  - Dashboard executivo: KPIs por cliente
  - Dashboard operacional: alertas, job status, histórico
  - **Entrega**: JSON de dashboards em Grafana

- [ ] **T3.4**: Alertas proativos
  - AlertManager rule: error budget próximo de se esgotar
  - Notificações: Slack, e-mail para ops
  - **Entrega**: AlertManager config

### Critérios de Sucesso

- ✅ SLOs definidos e visíveis em Grafana para >= 90% dos tenants
- ✅ Alertas testados com sucesso
- ✅ Error budget tracking automático

---

## Sprint 4: Novas Funcionalidades Clínicas

**Período**: 2026-07-15 → 2026-08-31 (2 sprints)  
**Owner**: Product Squad + Backend  
**Prioridade**: 🟠 Média

### 4.1: Cirurgia (Surgery)

**Período**: 2026-07-15 → 2026-08-15

#### Objetivo

MVP de gestão de procedimentos cirúrgicos: pré-operatório, intra-operatório, pós-operatório com integração com faturamento.

#### Tarefas

- [ ] **T4.1.1**: Modelagem de domínio
  - `SurgicalProcedure` (agendamento, equipe, sala, equipamento)
  - `PreOperativeChecklist` (anamnese, consentimento)
  - `SurgicalLog` (eventos intra-op: incisão, sutura, complicações)
  - `PostOperativeCare` (vigilância, alta)
  - **Entrega**: Models em `apps/surgery/models.py`

- [ ] **T4.1.2**: APIs CRUD
  - Endpoints REST para procedimentos, checklists, logs
  - Integração com `MedicalRecordEntry` para registros
  - **Entrega**: Viewsets + serializers em `api/v1/surgery/`

- [ ] **T4.1.3**: Integração com faturamento
  - Link `Procedure` → `BillingItem`
  - Valores tabelados por código CBHPM
  - **Entrega**: Tests e-to-e

- [ ] **T4.1.4**: Frontend
  - Formulário de agendamento
  - Checklist interativo
  - Dashboard: cirurgias hoje, taxa de complicações
  - **Entrega**: Componentes React no `frontend-next`

### 4.2: Recursos Humanos (Human Resources)

**Período**: 2026-08-01 → 2026-08-31

#### Objetivo

Gestão de RH: colaboradores, escalas, folha de pagamento básica.

#### Tarefas

- [ ] **T4.2.1**: Modelagem
  - `Employee` (dados pessoais, salário, benefícios)
  - `Shift` / `Schedule` (turnos, escala mensal)
  - `Payroll` (folha de pagamento com integração contábil)

- [ ] **T4.2.2**: APIs + Frontend
  - Dashboard de escalas
  - Gerador automático de folha
  - Integração com `apps/accounting`

### Critérios de Sucesso

- ✅ Cirurgia: MVP em produção com >= 5 clientes testando
- ✅ RH: Escalas funcionales e folha automática
- ✅ Cobertura >= 35%

---

## Sprint 5+: Melhorias de Frontend e Consolidação

**Período**: 2026-08-15 → Contínuo  
**Prioridade**: 🟡 Baixa-Média

### Tarefas de Curto Prazo

- [ ] **T5.1**: Finalizar migração de schema auto-gerado (fases 1-5)
  - Validação de tipos
  - Error handling centralizado
  - Exemplos de uso em documentação

- [ ] **T5.2**: Dashboard executivo consolidado
  - KPIs: pacientes, receita, taxa de ocupação
  - Gráficos: trend de atendimentos, faturamento

- [ ] **T5.3**: Educação – migração completa do legacy
  - Converter `legacy/` → `apps/education`
  - Testes migrados
  - Documentação de deprecated

### Tarefas Contínuas

- [ ] Code reviews com foco em qualidade
- [ ] Treinamento de equipe em padrões
- [ ] Reuniões de refinamento de backlog
- [ ] Relatórios de SLO semanais

---

## 📊 Dependências e Bloqueadores

```
Sprint 1 (Exports)
  ↓
Sprint 2 (DB Perf) ← Pode rodar em paralelo
  ↓
Sprint 3 (Observabilidade)
  ↓
Sprint 4 (Funcionalidades) ← Paralelo com Sprint 3
  ↓
Sprint 5+ (Consolidação)
```

### Bloqueadores Atuais

- [ ] Redis em produção (necessário para Sprint 1)
- [ ] Celery workers configurados (Sprint 1)
- [ ] Prometheus + Grafana disponíveis (Sprint 3)

---

## 🎯 KPIs de Sucesso

| Métrica                  | Baseline   | Alvo        | Sprint   |
| ------------------------ | ---------- | ----------- | -------- |
| API Latency p95          | 1.5s       | 1.0s        | Sprint 1 |
| Export Latency p95       | N/A        | <= 8s       | Sprint 1 |
| Error Rate 5xx           | 5%         | 3%          | Sprint 1 |
| DB Query p95             | 2.5s       | 1.5s        | Sprint 2 |
| SLO Visibility           | 0% tenants | 90% tenants | Sprint 3 |
| Funcionalidades Clínicas | 8 apps     | 10 apps     | Sprint 4 |
| Test Coverage            | 35%        | 45%         | Sprint 4 |

---

## 📋 Checklist de Preparação

- [ ] Revisar backlog com product manager
- [ ] Confirmar alocação de team members
- [ ] Revisar estimativas e riscos
- [ ] Comunicar timeline para stakeholders
- [ ] Preparar ambientes (staging, production-like)
- [ ] Configurar feature flags para rollback rápido

---

## 📝 Notas e Revisões

### Revisão Sprint 1 (Planejado para 2026-06-20)

- [ ] Validar audit de endpoints
- [ ] Ajustar scope se necessário
- [ ] Comunicar riscos identificados

### Revisão Sprint 2 (Planejado para 2026-07-04)

- [ ] Avaliar impacto de índices
- [ ] Decidir sobre particionamento (se necessário)

### Revisão Geral (Planejado para 2026-08-15)

- [ ] Consolidar aprendizados
- [ ] Definir roadmap H2 2026

---

## 📞 Contatos e Escalação

| Papel           | Owner | Escalação           |
| --------------- | ----- | ------------------- |
| Backend Lead    | -     | Product Manager     |
| Ops Lead        | -     | Infrastructure Lead |
| Product Manager | -     | CTO                 |
| DBA             | -     | Ops Lead            |

---

## Histórico de Versões

| Versão | Data       | Mudanças                       |
| ------ | ---------- | ------------------------------ |
| 1.0    | 2026-05-20 | Versão inicial com Sprints 1-5 |
