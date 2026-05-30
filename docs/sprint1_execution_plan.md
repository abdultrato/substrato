# Sprint 1 – Plano de Execução Técnico (T1.1 a T1.6)

**Versão**: 1.0  
**Status**: 🔄 Pronto para Implementação  
**Data**: 2026-05-20  
**Owner**: Backend Squad

---

## 📋 Resumo Executivo

Este documento detalha cada tarefa do Sprint 1 com:

- ✅ Arquivos a criar/modificar
- ✅ Snippets de código
- ✅ Testes associados
- ✅ Checklist de validação

**Timeline**: 2 sprints de 1 semana (12 dias úteis)  
**Story Points**: 20 SP

---

## T1.1: Audit Completo de Endpoints Síncronos

**Owner**: Backend Lead  
**Duração**: 2 dias (3 SP)  
**Status**: ✅ Concluído (ver `docs/export_audit.md`)

### Checklist

- [x] Endpoints em `api/exports/` auditados
- [x] Endpoints em `api/v1/audit/` auditados
- [x] Endpoints em `api/v1/billing/` auditados
- [x] Endpoints em `api/v1/pharmacy/` auditados
- [ ] **Pendente**: Endpoints em `apps/medical_records/` (verificar views)
- [ ] **Pendente**: Endpoints em `apps/clinical/` (verificar views)
- [ ] **Pendente**: Endpoints em `apps/nursing/` (verificar views)

### Ação: Verificar Endpoints Pendentes

**Comando**:

```bash
grep -r "pdf\|csv\|export\|report\|download" \
  apps/medical_records \
  apps/clinical \
  apps/nursing \
  --include="*.py" | grep -E "def|class.*View|@action"
```

### Documentar em `docs/export_audit.md` Seção 2.5+

Se encontrar mais endpoints síncronos, adicionar:

```markdown
### 2.X: [Domain] – [Endpoint Name] ⚠️ SÍNCRONO

**Arquivo**: `path/to/views.py`  
**Endpoint**: `GET /api/v1/.../pdf/`  
**Tipo**: PDF|CSV  
**Status**: 🔴 Síncronom

**Código Atual**:
\`\`\`python

# Copiar código relevante

\`\`\`

**Problemas**:

- [lista de problemas]

**Migração**: T1.4 (Sprint 1)
```

---

## T1.2: Design & Especificação Técnica

**Owner**: Architect  
**Duração**: 1 dia (2 SP)  
**Status**: ✅ Concluído (ver `docs/async_exports_design_sprint1.md`)

### Validações

- [x] API contracts definidos (202 Accepted, 200 Status, 200 Download)
- [x] Estrutura de dados JSON esquematizada
- [x] Fluxo de sequência diagramado
- [x] Tratamento de erros especificado
- [x] Métricas e alertas definidos

### Revisão com Stakeholders

- [ ] Revisar com Product Manager
- [ ] Revisar com Frontend Lead
- [ ] Revisar com Ops Lead

---

## T1.3: Refactorizar Serviços & Tasks Celery

**Owner**: Backend Squad  
**Duração**: 3 dias (5 SP)  
**Status**: 🔄 Em Implementação

### 3.1 Criar Nova Estrutura de Serviços

**Criar**: `services/exports/` (novo diretório)

```python
# services/exports/__init__.py

"""Generators de exportação para PDF/CSV."""

from .patients import generate_patients_csv
from .invoices import generate_invoice_pdf  # Já existe, refatorar
from .activity import generate_activity_report_pdf  # Já existe, refatorar

__all__ = [
    "generate_patients_csv",
    "generate_invoice_pdf",
    "generate_activity_report_pdf",
]
```

### 3.2 Implementar Generate Patients CSV

**Criar**: `services/exports/patients.py`

```python
"""Gerador de CSV de pacientes."""

import csv
from io import StringIO
from decimal import Decimal

from apps.clinical.models.patient import Patient


def generate_patients_csv(payload: dict) -> tuple[bytes, str, str]:
    """
    Gera CSV com lista de pacientes.

    Args:
        payload: {
            "tenant_id": int,
            "format": "csv",
            "limit": int (default 1000),
            "offset": int (default 0),
            "search": str (optional)
        }

    Returns:
        (csv_bytes, filename, content_type)
    """
    tenant_id = payload.get("tenant_id")
    limit = min(int(payload.get("limit", 1000)), 10000)
    offset = int(payload.get("offset", 0))
    search_term = payload.get("search", "").strip()

    # Query otimizada
    qs = Patient.objects.filter(tenant_id=tenant_id, deleted=False)

    if search_term:
        from django.db.models import Q
        qs = qs.filter(
            Q(name__icontains=search_term) |
            Q(email__icontains=search_term) |
            Q(cpf__icontains=search_term)
        )

    qs = qs.values_list(
        "id", "name", "email", "cpf", "birth_date", "gender", "created_at"
    ).order_by("-created_at")

    # Gerar CSV em memória
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow([
        "ID", "Nome", "Email", "CPF", "Data de Nascimento", "Gênero", "Criado em"
    ])

    # Iterar com chunk_size para economizar memória
    count = 0
    for patient_id, name, email, cpf, birth_date, gender, created_at in qs[offset:offset+limit].iterator(chunk_size=500):
        writer.writerow([
            patient_id,
            name or "",
            email or "",
            cpf or "",
            birth_date.isoformat() if birth_date else "",
            gender or "",
            created_at.isoformat() if created_at else ""
        ])
        count += 1

    csv_content = output.getvalue()
    csv_bytes = csv_content.encode("utf-8-sig")  # BOM para Excel
    filename = f"pacientes_{count}_{int(Decimal(payload.get('timestamp', 0)).to_integral_value())}.csv"

    return csv_bytes, filename, "text/csv"
```

### 3.3 Refatorizar TaskCelery em `tasks/export_jobs.py`

**Modificar**: `tasks/export_jobs.py` (adicionar função \_patients_csv e registro)

```python
# Adicionar ao topo do arquivo:

def _patients_csv(payload: dict) -> tuple[bytes, str, str]:
    from services.exports.patients import generate_patients_csv
    return generate_patients_csv(payload)

# Adicionar ao dicionário EXPORT_RUNNERS:
EXPORT_RUNNERS["patients_csv"] = _patients_csv  # Nova linha
```

### 3.4 Refatorizar Tasks Existentes (extrair lógica)

Para cada task existente, refatorizar para usar um serviço:

**Exemplo com invoice_pdf**:

```python
# tasks/export_jobs.py - ANTES

def _invoice_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.billing.models.invoice import Invoice
    from tasks.generate_pdf.invoice_pdf_generator import generate_invoice_pdf

    invoice_id = int(payload.get("invoice_id") or 0)
    invoice = Invoice.objects.select_related(...).filter(pk=invoice_id).first()
    if not invoice:
        raise ValueError("Fatura não encontrada.")
    return generate_invoice_pdf(invoice, request=None)
```

**DEPOIS** (move `generate_pdf/invoice_pdf_generator.py` para `services/exports/invoices.py`):

```python
# services/exports/invoices.py

def generate_invoice_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.billing.models.invoice import Invoice

    invoice_id = int(payload.get("invoice_id") or 0)
    invoice = Invoice.objects.select_related(
        "patient", "request", "created_by"
    ).filter(pk=invoice_id, deleted=False).first()

    if not invoice:
        raise ValueError("Fatura não encontrada para exportação.")

    # ... geração de PDF ...
    return pdf_bytes, filename, "application/pdf"

# tasks/export_jobs.py

def _invoice_pdf(payload: dict) -> tuple[bytes, str, str]:
    from services.exports.invoices import generate_invoice_pdf
    return generate_invoice_pdf(payload)
```

---

## T1.4: Refactorizar Endpoints para Assíncrono

**Owner**: Backend Squad  
**Duração**: 3 dias (5 SP)  
**Status**: 🔄 Em Implementação

### 4.1 Refactor: `api/exports/patients_csv.py`

**Antes**:

```python
# api/exports/patients_csv.py

import csv
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from apps.clinical.models.patient import Patient


class ExportPatientsCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"patients_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["ID", "Name"])

        for patient in Patient.objects.all():
            writer.writerow([patient.id, patient.name])

        return response
```

**Depois**:

```python
# api/exports/patients_csv.py

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from services.reports.async_exports import create_export_job
from tasks.export_jobs import run_export_job


class ExportPatientsCSV(APIView):
    """Exporta lista de pacientes como CSV (assíncrono)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        user = getattr(request, "user", None)

        if not tenant:
            return Response(
                {"detail": "Tenant não encontrado."},
                status=400
            )

        # Preparar payload
        payload = {
            "tenant_id": tenant.id,
            "limit": int(request.query_params.get("limit", 1000)),
            "offset": int(request.query_params.get("offset", 0)),
            "search": request.query_params.get("search", "").strip(),
            "timestamp": int(__import__("time").time())
        }

        # Criar job
        job_state = create_export_job(
            export_key="patients_csv",
            payload=payload,
            tenant_id=tenant.id,
            user_id=user.id if user else None,
            content_disposition="attachment"
        )

        # Enqueue na fila Celery
        run_export_job.delay(job_state["id"])

        # Retornar 202 Accepted
        return Response(
            {
                "job_id": job_state["id"],
                "status": "queued",
                "export_key": "patients_csv",
                "created_at": job_state["created_at"],
                "status_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/"
                ),
                "download_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/download/"
                ),
            },
            status=202
        )
```

### 4.2 Refactor: `api/v1/audit/views.py` (Activity Report)

**Modificar**: Remover fallback síncrono

```python
# api/v1/audit/views.py

class ActivityReportPdfView(APIView):
    # ... (todo o parsing de period, scope, user continua igual) ...

    def get(self, request):
        # ... (parsed_period, scope, target_user, payload já foram preparados) ...

        # REMOVER FALLBACK SÍNCRONO:
        # if queue_export_if_requested(...):
        #     return ...
        # pdf_bytes = generate_activity_report_pdf(...)  # ❌ Remove esta linha

        # SEMPRE ASSÍNCRONO:
        tenant = getattr(request, "tenant", None)
        user = getattr(request, "user", None)

        job_state = create_export_job(
            export_key="activity_report_pdf",
            payload=payload,
            tenant_id=tenant.id if tenant else None,
            user_id=user.id if user else None,
            content_disposition="attachment"
        )

        run_export_job.delay(job_state["id"])

        return Response(
            {
                "job_id": job_state["id"],
                "status": "queued",
                "status_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/"
                ),
                "download_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/download/"
                ),
            },
            status=202
        )
```

### 4.3 Refactor: `api/v1/billing/viewsets_impl/core.py` (Invoice PDF)

**Modificar**: Invoice PDF action

```python
# api/v1/billing/viewsets_impl/core.py

@action(detail=True, methods=["get"], url_path="pdf", url_name="pdf")
def pdf(self, request, pk=None):
    """Gera PDF de fatura (assíncrono)."""
    invoice = self.get_object()
    tenant = getattr(request, "tenant", None)
    user = getattr(request, "user", None)

    payload = {
        "invoice_id": invoice.id,
        "tenant_id": tenant.id if tenant else None,
    }

    job_state = create_export_job(
        export_key="invoice_pdf",
        payload=payload,
        tenant_id=tenant.id if tenant else None,
        user_id=user.id if user else None,
        content_disposition="inline"
    )

    run_export_job.delay(job_state["id"])

    return Response(
        {
            "job_id": job_state["id"],
            "status": "queued",
            "status_url": request.build_absolute_uri(
                f"/api/v1/monitoring/export_job/{job_state['id']}/"
            ),
            "download_url": request.build_absolute_uri(
                f"/api/v1/monitoring/export_job/{job_state['id']}/download/"
            ),
        },
        status=202
    )
```

### 4.4 Refactor: `api/v1/pharmacy/viewsets_impl/core.py` (7 endpoints)

**Modificar**: Todos os endpoints de relatório em pharmacy

```python
# api/v1/pharmacy/viewsets_impl/core.py - Exemplo para stock_pdf

@action(detail=False, methods=["get"], url_path="estoque/pdf", url_name="estoque-pdf")
def stock_pdf(self, request):
    """Gera PDF do estoque (assíncrono)."""
    tenant = getattr(request, "tenant", None)
    user = getattr(request, "user", None)

    payload = {
        "tenant_id": tenant.id if tenant else None,
        "timestamp": int(__import__("time").time()),
        # ... outros params necessários ...
    }

    job_state = create_export_job(
        export_key="pharmacy_stock_pdf",
        payload=payload,
        tenant_id=tenant.id if tenant else None,
        user_id=user.id if user else None,
        content_disposition="inline"
    )

    run_export_job.delay(job_state["id"])

    return Response(
        {
            "job_id": job_state["id"],
            "status": "queued",
            "status_url": request.build_absolute_uri(
                f"/api/v1/monitoring/export_job/{job_state['id']}/"
            ),
            "download_url": request.build_absolute_uri(
                f"/api/v1/monitoring/export_job/{job_state['id']}/download/"
            ),
        },
        status=202
    )

# Repetir para: history_pdf, consumption_pdf, top_products_pdf, etc.
```

---

## T1.5: Testes e Validação

**Owner**: QA Lead  
**Duração**: 2 dias (3 SP)  
**Status**: 🔄 Em Implementação

### 5.1 Testes Unitários

**Criar**: `tests/test_export_generators.py`

```python
import pytest
from decimal import Decimal
from datetime import date

from services.exports.patients import generate_patients_csv
from services.exports.invoices import generate_invoice_pdf


class TestPatientsCSVGenerator:
    """Testes do gerador de CSV de pacientes."""

    @pytest.mark.django_db
    def test_generate_empty_csv(self):
        """CSV vazio quando não há pacientes."""
        payload = {"tenant_id": 1, "limit": 1000}
        csv_bytes, filename, content_type = generate_patients_csv(payload)

        assert content_type == "text/csv"
        assert filename.startswith("pacientes_0_")
        assert b"ID,Nome,Email" in csv_bytes

    @pytest.mark.django_db
    def test_generate_csv_with_patients(self, patient_factory, tenant):
        """CSV com dados de pacientes."""
        patient_factory(name="João Silva", email="joao@example.com", tenant=tenant)

        payload = {"tenant_id": tenant.id, "limit": 1000}
        csv_bytes, filename, content_type = generate_patients_csv(payload)

        csv_content = csv_bytes.decode("utf-8-sig")
        assert "João Silva" in csv_content
        assert "joao@example.com" in csv_content

    @pytest.mark.django_db
    def test_generate_csv_respects_limit(self, patient_factory, tenant):
        """CSV respeita limite de linhas."""
        for i in range(100):
            patient_factory(name=f"Patient {i}", tenant=tenant)

        payload = {"tenant_id": tenant.id, "limit": 10}
        csv_bytes, filename, content_type = generate_patients_csv(payload)

        lines = csv_bytes.decode("utf-8").split("\n")
        # Header + 10 patients + empty line at end = 12
        assert len([l for l in lines if l.strip()]) <= 12
```

### 5.2 Testes de Celery Task

**Criar**: `tests/test_export_job_task.py`

```python
import pytest
from unittest.mock import patch, MagicMock

from tasks.export_jobs import run_export_job, EXPORT_RUNNERS


class TestExportJobTask:
    """Testes da task Celery de exportação."""

    @pytest.mark.django_db
    def test_run_export_job_patients_csv(self):
        """Task executa gerador de CSV com sucesso."""
        from services.reports.async_exports import create_export_job

        job_state = create_export_job(
            export_key="patients_csv",
            payload={"tenant_id": 1, "limit": 100},
            tenant_id=1,
            user_id=1
        )

        # Execute task (eager mode in test)
        run_export_job(job_state["id"])

        # Verify result
        from services.reports.async_exports import get_export_job_state
        final_state = get_export_job_state(job_state["id"])

        assert final_state["status"] == "ready"
        assert final_state["filename"].startswith("pacientes_")
        assert final_state["content_type"] == "text/csv"

    @pytest.mark.django_db
    def test_run_export_job_handles_error(self):
        """Task marca job como failed em caso de erro."""
        from services.reports.async_exports import create_export_job, get_export_job_state

        job_state = create_export_job(
            export_key="nonexistent_export",  # ❌ Tipo não suportado
            payload={},
            tenant_id=1,
            user_id=1
        )

        run_export_job(job_state["id"])

        final_state = get_export_job_state(job_state["id"])
        assert final_state["status"] == "failed"
        assert "não suportado" in final_state.get("error", "")
```

### 5.3 Testes de API (E2E)

**Criar**: `tests/test_export_api_endpoints.py`

```python
import pytest
from django.test import Client
from rest_framework.test import APIClient


class TestExportEndpoints:
    """Testes dos endpoints de exportação."""

    @pytest.mark.django_db
    def test_export_patients_csv_returns_202(self, api_client, user, tenant):
        """Endpoint retorna 202 Accepted com job_id."""
        api_client.force_authenticate(user=user)

        response = api_client.get("/api/exports/patients/csv/")

        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"
        assert "status_url" in data
        assert "download_url" in data

    @pytest.mark.django_db
    def test_export_job_status_polling(self, api_client, user, tenant):
        """Endpoint de status permite polling do job."""
        # Criar job
        response = api_client.get("/api/exports/patients/csv/")
        job_id = response.json()["job_id"]

        # Poll status
        status_response = api_client.get(f"/api/v1/monitoring/export_job/{job_id}/")

        assert status_response.status_code == 200
        state = status_response.json()
        assert state["id"] == job_id
        assert state["status"] in ["queued", "processing"]

    @pytest.mark.django_db
    def test_export_job_download_when_ready(self, api_client, user, tenant):
        """Endpoint de download retorna arquivo quando pronto."""
        # Este teste pode usar eager mode do Celery em testes
        with pytest.settings(CELERY_TASK_ALWAYS_EAGER=True):
            response = api_client.get("/api/exports/patients/csv/")
            job_id = response.json()["job_id"]

            # Download
            download_response = api_client.get(
                f"/api/v1/monitoring/export_job/{job_id}/download/"
            )

            assert download_response.status_code == 200
            assert "text/csv" in download_response["Content-Type"]
```

### 5.4 Checklist de Testes

- [ ] Cobertura >= 80% do novo código
- [ ] Todos os geradores testados (success + error)
- [ ] Celery task com retry testada
- [ ] Endpoints retornam 202 Accepted
- [ ] Status polling funciona
- [ ] Download após ready funciona
- [ ] Autorização / tenant isolation testadas
- [ ] Testes de timeout e cleanup

---

## T1.6: Documentação Operacional

**Owner**: Ops Lead  
**Duração**: 1 dia (2 SP)  
**Status**: 🔄 Em Implementação

### 6.1 Criar: `docs/export_jobs_operational_guide.md`

````markdown
# Guia Operacional: Export Jobs

## Monitoramento

### Métricas Prometheus

\`\`\`promql

# Taxa de jobs por segundo

rate(export_job_created[5m])

# Taxa de erro (5xx)

rate(export_job_failed[5m])

# Latência p95

histogram_quantile(0.95, rate(export_job_duration_seconds_bucket[5m]))

# Jobs stuck em processing

increase(export_job_processing[30m]) == 0 and export_job_status{status="processing"} > 0
\`\`\`

### Alertas

#### ExportJobHighErrorRate

```yaml
alert: ExportJobHighErrorRate
expr: rate(export_job_failed[5m]) > 0.05
for: 5m
```
````

#### ExportJobStuck

```yaml
alert: ExportJobStuck
expr: increase(export_job_processing_seconds[30m]) == 0 and export_job_status{status="processing"} > 0
for: 30m
```

## Troubleshooting

### Job está "processing" há > 30min

1. Verificar logs do worker Celery:
   \`\`\`bash
   docker logs <celery-worker-container> | grep <job_id>
   \`\`\`

2. Verificar Redis:
   \`\`\`bash
   redis-cli get export_job:state:<job_id>
   \`\`\`

3. Se o worker congelou, restart:
   \`\`\`bash
   docker restart <celery-worker-container>
   \`\`\`

### Job falhou com "TypeError: …"

1. Revisar logs do worker
2. Verificar payload:
   \`\`\`bash
   redis-cli get export_job:payload:<job_id>
   \`\`\`
3. Reexecutar manualmente (após fix):
   \`\`\`python
   from tasks.export_jobs import run_export_job
   run_export_job.apply_async(args=["<job_id>"])
   \`\`\`

### Redis OOM (Out of Memory)

1. Verificar uso:
   \`\`\`bash
   redis-cli info memory
   \`\`\`

2. Cleanup de jobs expirados:
   \`\`\`bash
   python manage.py cleanup_export_jobs --older-than 2h
   \`\`\`

3. Aumentar Redis memory se necessário (AWS ElastiCache, etc.)

## Debugging

### Ver estado do job

\`\`\`bash
python manage.py shell

> > > from services.reports.async_exports import get_export_job_state
> > > state = get_export_job_state("<job_id>")
> > > print(state)
> > > \`\`\`

### Listar todos os jobs (em processamento)

\`\`\`bash
redis-cli keys "export_job:state:\*" | head -20
redis-cli get export_job:state:<job_id>
\`\`\`

````

### 6.2 Criar: `docs/export_jobs_sdk_guide.md`

```markdown
# Guia do SDK: Export Jobs (Frontend)

## Instalação

\`\`\`typescript
import { ExportClient } from "@/lib/api/export-client";

const exporter = new ExportClient(
  process.env.REACT_APP_API_URL,
  localStorage.getItem("auth_token")
);
\`\`\`

## Uso Básico

\`\`\`typescript
// 1. Request export
const { jobId, downloadUrl } = await exporter.requestExport(
  "/api/exports/patients/csv/",
  { limit: 1000, search: "João" }
);

// 2. Poll status with UI
let isReady = false;
while (!isReady) {
  const status = await exporter.pollStatus(jobId);

  if (status.status === "ready") {
    isReady = true;
  } else if (status.status === "failed") {
    showError(`Export falhou: ${status.error}`);
    return;
  } else {
    showProgress(`Status: ${status.status}`);
  }

  await new Promise(r => setTimeout(r, 1000));
}

// 3. Download
await exporter.downloadFile(jobId, "patients.csv");
\`\`\`

## Tratamento de Erros

\`\`\`typescript
try {
  const job = await exporter.requestExport("/api/...", {});
} catch (error) {
  if (error.response?.status === 400) {
    showError("Parâmetros inválidos");
  } else if (error.response?.status === 401) {
    redirectToLogin();
  } else {
    showError("Erro inesperado");
  }
}
\`\`\`
````

### 6.3 Adicionar ao README

**Modificar**: `README.md`

```markdown
## Exportações Assíncronas

As exportações de PDF e CSV agora funcionam de forma assíncrona para melhor escalabilidade.

### Fluxo de Exportação

1. **Request** (GET /api/.../export/) → `202 Accepted` + `job_id`
2. **Poll** (GET /api/v1/monitoring/export_job/{job_id}/) → status do processamento
3. **Download** (GET /api/v1/monitoring/export_job/{job_id}/download/) → arquivo

Veja `docs/export_jobs_sdk_guide.md` para exemplos de implementação.
```

---

## 📊 Resumo de Implementação

| Tarefa | Arquivo                                 | Ação                    | Status  |
| ------ | --------------------------------------- | ----------------------- | ------- |
| T1.1   | `docs/export_audit.md`                  | Criar                   | ✅ Done |
| T1.2   | `docs/async_exports_design_sprint1.md`  | Criar                   | ✅ Done |
| T1.3   | `services/exports/`                     | Criar novo dir          | ⏳ TODO |
| T1.3   | `services/exports/patients.py`          | Criar                   | ⏳ TODO |
| T1.3   | `services/exports/__init__.py`          | Criar                   | ⏳ TODO |
| T1.3   | `tasks/export_jobs.py`                  | Modificar               | ⏳ TODO |
| T1.4   | `api/exports/patients_csv.py`           | Modificar               | ⏳ TODO |
| T1.4   | `api/v1/audit/views.py`                 | Modificar               | ⏳ TODO |
| T1.4   | `api/v1/billing/viewsets_impl/core.py`  | Modificar               | ⏳ TODO |
| T1.4   | `api/v1/pharmacy/viewsets_impl/core.py` | Modificar (7 endpoints) | ⏳ TODO |
| T1.5   | `tests/test_export_generators.py`       | Criar                   | ⏳ TODO |
| T1.5   | `tests/test_export_job_task.py`         | Criar                   | ⏳ TODO |
| T1.5   | `tests/test_export_api_endpoints.py`    | Criar                   | ⏳ TODO |
| T1.6   | `docs/export_jobs_operational_guide.md` | Criar                   | ⏳ TODO |
| T1.6   | `docs/export_jobs_sdk_guide.md`         | Criar                   | ⏳ TODO |
| T1.6   | `README.md`                             | Modificar               | ⏳ TODO |

---

## ⏱️ Timeline Recomendada

```
Dia 1-2:    T1.1 (Audit completo)
Dia 3:      T1.2 (Design review)
Dia 4-6:    T1.3 + T1.4 (Implementação paralela)
Dia 7-8:    T1.5 (Testes + refinement)
Dia 9:      T1.6 (Docs + training)
Dia 10-12:  Buffer + staging validation
```

---

## ✅ Checklist Final (Go/No-Go)

- [ ] Todos os endpoints auditados
- [ ] Serviços em `services/exports/` implementados
- [ ] Tasks Celery refatoradas
- [ ] Endpoints refatorados para 202 Accepted
- [ ] Testes unitários: 80%+ cobertura
- [ ] Testes e-to-e: success + error paths
- [ ] Docs operacional escrita
- [ ] SDK TypeScript atualizado
- [ ] README atualizado
- [ ] Feature flag testada
- [ ] Canary deployment plan documentado

---

## 📞 Contatos de Suporte

- **Technical Questions**: @backend-lead
- **Celery/Redis Issues**: @ops-lead
- **Frontend Integration**: @frontend-lead
- **Product Scope**: @product-manager

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Sprint 1 – Plano de Execução Técnico (T1.1 a T1.6)' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
