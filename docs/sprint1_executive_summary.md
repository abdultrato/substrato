# Sprint 1 – Resumo Executivo: Exportações Assíncronas

**Data**: 2026-05-20  
**Status**: 🟢 Pronto para Implementação  
**Timeline**: 2 sprints de 1 semana (12 dias úteis)  
**Story Points**: 20 SP  
**Risco**: 🟠 Médio (mudança crítica de API, regressão potencial)

---

## 📋 O Que é Este Sprint?

**Objetivo**: Refatorizar todos os endpoints de exportação (PDF, CSV, relatórios) para operar **exclusivamente em modo assíncrono**, removendo bloqueios que consomem workers e causam timeouts.

### Impacto Esperado

```
ANTES (Atual - Status Quo):
├─ GET /api/v1/billing/{id}/pdf/ → 200 OK (arquivo) + bloqueio de 3-5s ⚠️
├─ GET /api/exports/patients/csv/ → 200 OK (arquivo) + timeout possível ⚠️
└─ Error rate: ~5% (timeout)

DEPOIS (Target):
├─ GET /api/v1/billing/{id}/pdf/ → 202 Accepted (job_id) + retorno imediato ✅
├─ GET /api/exports/patients/csv/ → 202 Accepted (job_id) + retorno imediato ✅
├─ GET /api/v1/monitoring/export_job/{id}/ → 200 OK (status) + polling ✅
├─ GET /api/v1/monitoring/export_job/{id}/download/ → 200 OK (arquivo) ✅
└─ Error rate: ~2% (jobs failed)

MÉTRICAS:
├─ API Latency p95: 1.5s → 1.0s (33% melhoria)
├─ Error rate 5xx: 5% → 3% (40% redução)
└─ SLO compliance: ~85% → 99%
```

---

## 🎯 Escopo

### Endpoints Refatorados (10+)

| Endpoint                         | Status Atual             | Novo Padrão          |
| -------------------------------- | ------------------------ | -------------------- |
| `GET /api/exports/patients/csv/` | 🔴 Síncrono              | 🟢 Assíncrono        |
| `GET /api/v1/audit/.../pdf/`     | 🟠 Parcial               | 🟢 Total assíncrono  |
| `GET /api/v1/billing/{id}/pdf/`  | 🟠 Parcial               | 🟢 Total assíncrono  |
| `GET /api/v1/pharmacy/*/pdf/`    | 🟠 Parcial (7 endpoints) | 🟢 Total assíncrono  |
| **Total**                        | **10+ endpoints**        | **Todos assíncrono** |

### Infraestrutura Existente Reutilizada ✅

- ✅ `services/reports/async_exports.py` – Job manager
- ✅ `tasks/export_jobs.py` – 16+ PDF/CSV generators
- ✅ `api/v1/monitoring/ExportJobViewSet` – Status + Download
- ✅ Redis storage com fallback em memória

**Novo a Criar**:

- 🆕 `services/exports/` – Serviços refatorados
- 🆕 Testes unitários + e-to-e
- 🆕 Documentação operacional

---

## 💰 Justificativa Comercial

### Problema: Bloqueios em Produção

1. **Timeouts**: Usuarios esperando 30+ segundos por relatório
   - Taxa de erro: 5-8% de requisições timeout
   - Custo: Frustração, suporte, reputação

2. **Falta de Escalabilidade**:
   - Workers Gunicorn bloqueados em I/O
   - Não consegue servir outros usuários
   - Custo: Necessidade de mais workers/containers

3. **Impacto em SLOs**:
   - API Latency p95: 1.5s (acima do target 1.0s)
   - Error rate: 5% (acima do target 3%)

### Benefício: Arquitetura Escalável

1. **Previsibilidade**: Todos os requests retornam em <= 100ms
   - SLO p95 latency: 1.0s ✅
   - Error rate: <= 3% ✅

2. **Escalabilidade Horizontal**:
   - Workers Celery processam exports em paralelo
   - API stateless pode lidar com 10x mais requests
   - Custo: Sem aumento de infra (reutiliza Redis + Celery)

3. **User Experience**:
   - Feedback imediato: "seu export está sendo processado"
   - Polling com backoff exponencial
   - Cliente SDK com tratamento de erro

---

## 📊 Critérios de Sucesso

### Técnico ✅

- [ ] 100% de endpoints de exportação → assíncrono
- [ ] Cobertura de testes >= 80%
- [ ] Zero regressões em testes existentes
- [ ] Latência de enqueue <= 100ms (p95)
- [ ] Error rate de jobs <= 3%

### Operacional ✅

- [ ] SLO export job p95: <= 8s
- [ ] Alert para jobs stuck > 30 min
- [ ] Runbook de troubleshooting
- [ ] Feature flag para quick rollback

### Usuário ✅

- [ ] API contrato documentado
- [ ] SDK TypeScript funcional
- [ ] Exemplos em documentação
- [ ] Zero regressões percebidas

---

## 📅 Timeline

```
Semana 1 (12-16 Mai):
├─ T1.1 Audit completo (2 dias)
├─ T1.2 Design review (1 dia)
└─ Setup: branches, feature flags

Semana 2-3 (19-30 Mai):
├─ T1.3 Refactor serviços + tasks (3 dias)
├─ T1.4 Refactor endpoints (3 dias)
├─ T1.5 Testes + refinement (2 dias)
└─ T1.6 Docs operacional (1 dia)

Semana 4 (2-6 Junho):
├─ Staging validation
├─ Canary deployment (10% → 50% → 100%)
└─ Production rollout

Go-Live: 30 Junho 2026
```

---

## 🔧 Arquitetura (Resumida)

```
Client
  ↓
GET /api/v1/billing/{id}/pdf/
  ↓
202 Accepted + {job_id}
  ↓
Polling: GET /api/v1/monitoring/export_job/{job_id}/
  ├─ Status: "queued" | "processing" | "ready" | "failed"
  └─ If ready → Download: GET /api/v1/monitoring/export_job/{job_id}/download/
```

**Storage**: Redis (1 hora TTL) com fallback em memória  
**Processing**: Celery workers (paralelo, retry automático)  
**Limite**: 100 MB payload, 500 MB arquivo, timeout 5 min

---

## 🚨 Riscos & Mitigações

| Risco                  | Impacto | Mitigation                                         |
| ---------------------- | ------- | -------------------------------------------------- |
| Regressão em produção  | Alto    | Feature flag, canary 10%→100%, rollback automático |
| Jobs presos em fila    | Médio   | Max retries, timeout 5min, alert > 30min           |
| Redis OOM              | Médio   | TTL 1h, cleanup job, monitoring                    |
| Clientes incompatíveis | Baixo   | API compat layer, deprecation notice               |

---

## 📚 Documentação Criada

1. **[export_audit.md](export_audit.md)**
   - Mapeamento de 10+ endpoints síncronos
   - Análise de código
   - Classificação de riscos

2. **[async_exports_design_sprint1.md](async_exports_design_sprint1.md)**
   - Fluxo de sequência completo
   - Estrutura de dados (job state, payload, result)
   - API contracts (202, 200 status, 200 download)
   - Testes necessários
   - Checklist de validação

3. **[sprint1_execution_plan.md](sprint1_execution_plan.md)**
   - T1.1-T1.6 em detalhe
   - Snippets de código
   - Exemplos de refactor
   - Testes unitários + e-to-e

4. **[roadmap_2026.md](roadmap_2026.md)**
   - Visão geral de todos os sprints
   - Timeline consolidada
   - KPIs de sucesso

---

## 🎬 Próximos Passos

### Hoje (2026-05-20)

- [ ] Revisar documentos com Product Manager
- [ ] Confirmar capacidade do time (20 SP disponíveis?)
- [ ] Reservar Celery workers para staging

### Amanhã

- [ ] Planning poker com o time
- [ ] Criar branches de feature
- [ ] Setup de feature flag em produção

### Semana 1

- [ ] T1.1: Completar audit (especialmente apps/\* pendentes)
- [ ] T1.2: Design review com stakeholders
- [ ] Setup de ambientes

---

## 💼 Stakeholders & Aprovação

| Papel           | Status      | Assinatura |
| --------------- | ----------- | ---------- |
| Product Manager | ⏳ Pendente | \_\_\_     |
| Backend Lead    | ⏳ Pendente | \_\_\_     |
| Ops Lead        | ⏳ Pendente | \_\_\_     |
| Frontend Lead   | ⏳ Pendente | \_\_\_     |

---

## 📞 Contatos

- **Technical Lead**: @backend-lead
- **Infrastructure**: @ops-lead
- **Product**: @product-manager
- **Frontend**: @frontend-lead

---

## 🔗 Links Relacionados

- [Roadmap 2026](roadmap_2026.md)
- [Engineering Quality / SLOs](engineering_quality.md)
- [Enterprise Model](enterprise_model.md)
- [Async Exports (atual)](async_exports.md)
- [Operations Runbook](operations_runbook.md)

---

**Última Atualização**: 2026-05-20  
**Autor**: Backend Squad  
**Versão**: 1.0

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Sprint 1 – Resumo Executivo: Exportações Assíncronas' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
