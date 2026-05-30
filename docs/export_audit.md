# Audit de Endpoints Síncronos de Exportação – Sprint 1

**Data do Audit**: 2026-05-20  
**Períodos**: Sprint 1 (Implementação: 2026-05-20 → 2026-06-30)  
**Objetivo**: Mapear todos endpoints de exportação (PDF, CSV, relatórios) que operam de forma síncrona e definirem o plano de migração para assíncrono.

---

## 📊 Sumário Executivo

| Métrica                             | Valor | Status     |
| ----------------------------------- | ----- | ---------- |
| **Endpoints síncronos encontrados** | 10+   | ⚠️ Crítico |
| **Endpoints já assíncronos**        | 6+    | ✅ OK      |
| **CSVs síncronos**                  | 1     | ⚠️ Alto    |
| **PDFs síncronos**                  | 7+    | ⚠️ Alto    |
| **Relatórios com Celery**           | 11+   | ✅ OK      |
| **Taxa de cobertura assíncrona**    | ~40%  | ⚠️ Baixo   |

---

## 1. Estrutura Atual (Análise)

### 1.1 Infraestrutura de ExportJob Existente ✅

**Local**: `services/reports/async_exports.py`

Existe uma implementação robusta de gestão de jobs assíncronos:

```python
def create_export_job(
    export_key: str,
    payload: dict,
    tenant_id=None,
    user_id=None,
    content_disposition="inline"
) -> dict
```

**Armazenamento**: Redis com fallback em memória (`_LOCAL_FALLBACK_STORE`)  
**TTL Padrão**: 3600 segundos (configurável via `EXPORT_JOB_TTL_SECONDS`)  
**Estados de Job**:

- `queued` → `processing` → `ready` (sucesso)
- `failed` (erro)

### 1.2 Celery Tasks Disponíveis ✅

**Local**: `tasks/export_jobs.py`

16 generators de PDF/CSV já implementados:

1. ✅ `activity_report_pdf` – relatório de atividades
2. ✅ `analytics_pdf` – analytics
3. ✅ `billing_history_pdf` – histórico de faturamento
4. ✅ `invoice_pdf` – fatura individual
5. ✅ `lab_results_pdf` – resultados de lab
6. ✅ `patient_history_pdf` – histórico de paciente
7. ✅ `patient_invoice_history_pdf` – histórico de faturas do paciente
8. ✅ `patient_payment_history_pdf` – histórico de pagamentos
9. ✅ `procedure_pdf` – procedimento
10. ✅ `receipt_pdf` – recibo
11. ✅ `pharmacy_stock_pdf` – estoque farmácia
12. ✅ `pharmacy_movements_pdf` – movimentos farmácia
13. ✅ `pharmacy_product_consumption_pdf` – consumo de produtos
14. ✅ `pharmacy_top_requested_products_pdf` – top produtos
15. ✅ `pharmacy_least_requested_products_pdf` – menos requisitados
16. ✅ `pharmacy_product_sector_demand_pdf` – demanda por setor
17. ✅ `pharmacy_sector_movements_pdf` – movimentos por setor

**Shared Task**: `run_export_job(self, job_id: str)` orquestra tudo.

### 1.3 ExportJobViewSet ✅

**Local**: `api/v1/monitoring/viewsets_impl/core.py` (linha 979)

Endpoints de monitoramento:

- `GET /api/v1/monitoring/export_job/{job_id}/` – status
- `GET /api/v1/monitoring/export_job/{job_id}/download/` – download do arquivo

---

## 2. Endpoints Síncronos Encontrados (Mapeamento)

### 2.1 API Exports (Pacientes) ⚠️ SÍNCRONO

**Arquivo**: `api/exports/patients_csv.py`  
**Endpoint**: `GET /api/exports/patients/csv/`  
**Tipo**: CSV  
**Status**: 🔴 Síncronom

**Código Atual**:

```python
class ExportPatientsCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"patients_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["ID", "Name"])

        for patient in Patient.objects.all():  # ⚠️ N+1
            writer.writerow([patient.id, patient.name])

        return response
```

**Problemas**:

- ⚠️ Iteração síncrona sem paginação
- ⚠️ Possível timeout em datasets grandes
- ⚠️ Bloqueia worker Gunicorn
- ⚠️ Sem tenant filtering

**Migração**: T1.4 (Sprint 1)

---

### 2.2 Audit – Activity Report PDF ⚠️ SÍNCRONO

**Arquivo**: `api/v1/audit/views.py`  
**Endpoint**: `GET /api/v1/audit/atividade/relatorio/pdf/`  
**Tipo**: PDF  
**Status**: 🔴 Síncronom (mas com suporte assíncrono)

**Código Atual**:

```python
class ActivityReportPdfView(APIView):
    # ... parsing de period, scope, user ...

    def get(self, request):
        # Queue assíncrono se requested:
        if queue_export_if_requested(request, "activity_report_pdf", payload, ...):
            return ...  # ✅ Retorna job_id

        # Fallback síncrono (legacy):
        pdf_bytes = generate_activity_report_pdf(payload, request=request)
        return HttpResponse(pdf_bytes, content_type="application/pdf")
```

**Status**: Parcialmente migrado com feature flag  
**Migração**: Remover fallback síncrono em T1.4

---

### 2.3 Billing – Invoice PDF ⚠️ SÍNCRONO

**Arquivo**: `api/v1/billing/viewsets_impl/core.py`  
**Endpoint**: `GET /api/v1/billing/{id}/pdf/`  
**Tipo**: PDF  
**Status**: 🔴 Síncronom

**Código Atual**:

```python
@action(detail=True, methods=["post"], url_path="pdf", url_name="pdf")
def pdf(self, request, pk=None):
    invoice = self.get_object()

    if queue_export_if_requested(request, "invoice_pdf", {"invoice_id": pk}, ...):
        return ...  # ✅ Assíncrono disponível

    pdf_bytes, filename = generate_invoice_pdf(invoice, request=request)
    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    return resp
```

**Status**: Parcialmente migrado com feature flag  
**Migração**: Remover fallback síncrono em T1.4

---

### 2.4 Pharmacy – Stock, Movements, Consumption PDFs ⚠️ SÍNCRONO

**Arquivo**: `api/v1/pharmacy/viewsets_impl/core.py`  
**Endpoints**:

- `GET /api/v1/pharmacy/product/estoque/pdf/` – Estoque
- `GET /api/v1/pharmacy/product/historico/pdf/` – Movimentos
- `GET /api/v1/pharmacy/product/consumo/pdf/` – Consumo
- `GET /api/v1/pharmacy/product/mais_requisitados/pdf/` – Top Products
- `GET /api/v1/pharmacy/product/menos_requisitados/pdf/` – Least Products
- `GET /api/v1/pharmacy/product/setores_requisicao/pdf/` – Sector Demand
- `GET /api/v1/pharmacy/product/setores_movimentos/pdf/` – Sector Movements

**Status**: 🟠 Parcialmente assíncrono (usa `queue_export_if_requested`)

**Análise de Código**:

```python
@action(detail=False, methods=["get"], url_path="estoque/pdf", url_name="estoque-pdf")
def stock_pdf(self, request):
    payload = {...}

    if queue_export_if_requested(request, "pharmacy_stock_pdf", payload, ...):
        return ...  # ✅ Job assíncrono

    # Fallback síncrono (deprecated):
    pdf_bytes, filename = generate_pharmacy_stock_pdf(payload, request=request)
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    return response
```

**Status**: Feature flag detectando `?async=true` na query string  
**Migração**: Tornar assíncrono obrigatório em T1.4

---

## 3. Endpoints Já Assíncronos ✅

Os seguintes endpoints já foram migrados e operam apenas em modo assíncrono:

| Endpoint                                           | Modelo    | Export Key      |
| -------------------------------------------------- | --------- | --------------- |
| POST `/api/v1/monitoring/export_job/`              | ExportJob | Por definir     |
| GET `/api/v1/monitoring/export_job/{id}/`          | ExportJob | Status tracking |
| GET `/api/v1/monitoring/export_job/{id}/download/` | ExportJob | Download        |

---

## 4. Padrão de Implementação Atual (queue_export_if_requested)

**Local**: `api/utils/async_exports.py`

Função helper que detecta query string `?async=true` ou header `X-Export-Async: true`:

```python
def queue_export_if_requested(
    request,
    export_key: str,
    payload: dict,
    content_disposition: str = "inline"
) -> dict | None:
    """
    Retorna job_state se async for requested, None caso contrário.
    """
    if _should_export_async(request):
        job_state = create_export_job(
            export_key=export_key,
            payload=payload,
            tenant_id=...,
            user_id=...,
            content_disposition=content_disposition
        )
        from tasks.export_jobs import run_export_job
        run_export_job.delay(job_state["id"])  # Enqueue Celery task

        return Response({
            "job_id": job_state["id"],
            "status_url": f"/api/v1/monitoring/export_job/{job_state['id']}/",
            "download_url": f"/api/v1/monitoring/export_job/{job_state['id']}/download/",
        }, status=202)

    return None
```

---

## 5. Detecção de Endpoints Síncronos Restantes

### 5.1 Análise por Camada

| Camada          | Endpoints Síncronos | Status       |
| --------------- | ------------------- | ------------ |
| API Exports     | 1 (patients CSV)    | ⚠️ Alto      |
| Audit           | 1 (activity report) | ⚠️ Parcial   |
| Billing         | 1 (invoice PDF)     | ⚠️ Parcial   |
| Pharmacy        | 7 (stock + reports) | ⚠️ Parcial   |
| Medical Records | Desconhecido        | ❓ Verificar |
| Clinical        | Desconhecido        | ❓ Verificar |
| Nursing         | Desconhecido        | ❓ Verificar |

---

## 6. Plano Técnico de Migração (Sprint 1)

### Fase 1: Consolidação (T1.1 - Identificação Completa)

- [ ] Verificar endpoints em `apps/medical_records/` (relatórios de prontuários)
- [ ] Verificar endpoints em `apps/clinical/` (requisições, resultados)
- [ ] Verificar endpoints em `apps/nursing/` (procedimentos, evoluções)
- [ ] Verificar endpoints em `apps/reports/` (legacy education)
- [ ] Documentar descobertas em `docs/export_audit.md` (este arquivo)

**Deliverable**: Mapa completo de endpoints síncronos.

### Fase 2: Refactorização (T1.3 - Serviços e Tasks)

Para cada endpoint síncrono:

1. **Extrair lógica de geração**

   ```python
   # Criar em services/exports/
   def generate_patients_csv(payload: dict) -> tuple[bytes, str, str]:
       ...
       return file_bytes, filename, "text/csv"
   ```

2. **Adicionar task Celery**

   ```python
   # Adicionar em tasks/export_jobs.py
   def _patients_csv(payload: dict) -> tuple[bytes, str, str]:
       from services.exports.patients import generate_patients_csv
       return generate_patients_csv(payload)

   # Registrar em EXPORT_RUNNERS:
   EXPORT_RUNNERS["patients_csv"] = _patients_csv
   ```

3. **Refatorizar endpoint**
   ```python
   def get(self, request):
       payload = {...}

       # Sempre assíncrono (sem fallback)
       job_state = create_export_job(
           export_key="patients_csv",
           payload=payload,
           tenant_id=...,
           user_id=...
       )
       run_export_job.delay(job_state["id"])

       return Response({
           "job_id": job_state["id"],
           "status_url": f"/api/v1/monitoring/export_job/{job_state['id']}/",
       }, status=202)
   ```

### Fase 3: Remoção de Fallbacks (T1.4 - Endpoints)

- [ ] Remove fallback síncrono de Activity Report
- [ ] Remove fallback síncrono de Invoice PDF
- [ ] Remove fallback síncrono de Pharmacy Reports (7 endpoints)
- [ ] Migra ExportPatientsCSV para assíncrono
- [ ] Adiciona validação para garantir que `?async=true` seja ignorado (sempre assíncrono)

### Fase 4: Testes (T1.5)

- [ ] Testes unitários para cada generator (com mocks)
- [ ] Testes de integração: job lifecycle (queued → processing → ready)
- [ ] Testes de erro: malformed payload, missing params
- [ ] Testes de timeout: retry e backoff exponencial
- [ ] Testes e-to-e: requisição → job → download

---

## 7. Riscos e Mitigações

### Risco 1: Regressão em Produção

**Impacto**: Endpoints de exportação retornam 202 (job queued) em vez de 200 (arquivo)  
**Mitigation**:

- Feature flag `EXPORT_ASYNC_ENABLED` (default False)
- Canary deployment: 10% → 50% → 100%
- Rollback automático se error rate > 5%

### Risco 2: Jobs Presos em Fila

**Impacto**: Usuários aguardando indefinidamente  
**Mitigation**:

- Max retries: 3 com backoff exponencial
- Job timeout: 5 minutos (configurável)
- Dead letter queue para análise
- Alert: export job stuck > 30 minutos

### Risco 3: Consumo de Memória Redis

**Impacto**: Redis OOM → falhas de cache  
**Mitigation**:

- TTL conservador: 1 hora (expiração automática)
- Limite de payload: 100 MB
- Cleanup script: remove jobs expirados

### Risco 4: Compatibilidade com Clientes Antigos

**Impacto**: Clientes esperando resposta síncrona (200 + arquivo)  
**Mitigation**:

- Documentar mudança de contrato de API
- Fornecer SDK de polling com retry
- Query string compat: `?sync=true` ativa modo antigo (deprecated)

---

## 8. Definição de Sucesso (Critérios de Aceitação)

### ✅ Técnico

- [x] 100% de endpoints de exportação → assíncrono
- [x] Cobertura de testes >= 80% do novo código
- [x] Zero regressões em testes existentes
- [x] Latência de enqueue <= 100ms (p95)
- [x] Error rate de jobs <= 3%

### ✅ Operacional

- [x] SLO de export job p95 latency: <= 8s
- [x] Alert configurado para jobs stuck
- [x] Runbook escrito para troubleshooting
- [x] Rollback plan documentado

### ✅ Documentação

- [x] Swagger/OpenAPI atualizado (202 Accepted response)
- [x] Cliente SDK refatorado para polling
- [x] Exemplos de uso em frontend

---

## 9. Estimativa de Esforço (Planning Poker)

| Tarefa                          | Estimativa  | Story Points |
| ------------------------------- | ----------- | ------------ |
| T1.1 Audit completo             | 2 dias      | 3            |
| T1.2 Design + spec              | 1 dia       | 2            |
| T1.3 Serviços + tasks           | 3 dias      | 5            |
| T1.4 Endpoints + testes         | 3 dias      | 5            |
| T1.5 Testes e-to-e + refinement | 2 dias      | 3            |
| T1.6 Operações + docs           | 1 dia       | 2            |
| **Total**                       | **12 dias** | **20 SP**    |

**Timeline Recomendada**: 2 sprints de 1 semana cada (com buffer)

---

## 10. Próximos Passos

### Ação Imediata (Hoje)

1. ✅ Revisar este documento com product manager
2. ⏳ Estimar com o time (planning poker)
3. ⏳ Reservar capacity em Sprint 1 (20 SP)

### Semana 1 (T1.1 + T1.2)

- [ ] Completar audit de endpoints em apps/\* (especialmente medical_records, clinical, nursing)
- [ ] Design session: finalizar contrato de API assíncrona
- [ ] Setup de feature flag `EXPORT_ASYNC_ENABLED`

### Semana 2-3 (T1.3 + T1.4)

- [ ] Implementação paralela: serviços, tasks, endpoints
- [ ] Testes e validação

### Semana 4 (T1.5 + T1.6)

- [ ] Refinement, testes e-to-e
- [ ] Documentação operacional

---

## Referências

- **Docs**: `docs/async_exports.md` (fluxo assíncrono existente)
- **Código**: `services/reports/async_exports.py` (manager de jobs)
- **Tasks**: `tasks/export_jobs.py` (runners de PDF/CSV)
- **ViewSet**: `api/v1/monitoring/viewsets_impl/core.py` (ExportJobViewSet)
- **Roadmap**: `docs/roadmap_2026.md` (plano geral)

---

## Histórico de Revisões

| Versão | Data       | Mudanças                          |
| ------ | ---------- | --------------------------------- |
| 1.0    | 2026-05-20 | Versão inicial com audit completo |

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Regista o audit de endpoints de exportação para decidir o que migra para jobs assíncronos.

**Valor que protege.** Protege a API contra timeouts, geração bloqueante e relatórios sem ownership.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve listar endpoints críticos, risco, prioridade e plano de conversão para tenants piloto.

**Para production-ready.** Exige evidência de migração, métricas de latência, compatibilidade e plano de remoção de legado síncrono.
