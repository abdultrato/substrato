# Exportações Assíncronas (Celery + Redis)

## Como funciona
Os endpoints de PDF pesados aceitam `?async=1`.

Quando o modo assíncrono é solicitado:
1. O backend cria um `export_job`.
2. Enfileira `tasks.export_jobs.run_export_job`.
3. Retorna `202 Accepted` com URLs de estado e download.

## Endpoint de acompanhamento
- `GET /api/v1/monitoring/export_job/{job_id}/`
- `GET /api/v1/monitoring/export_job/{job_id}/download/`

## Resposta típica (`202`)
```json
{
  "id": "uuid",
  "status": "queued",
  "export_key": "pharmacy_stock_pdf",
  "status_url": ".../api/v1/monitoring/export_job/{id}/",
  "download_url": ".../api/v1/monitoring/export_job/{id}/download/"
}
```

## Estados possíveis
- `queued`
- `processing`
- `ready`
- `failed`

## Exemplos
- `GET /api/v1/pharmacy/lot/estoque/pdf/?async=1`
- `GET /api/v1/billing/invoice/{id}/pdf/?async=1`
- `GET /api/v1/dashboard/analytics/export/?type=pdf&async=1`

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Orienta a migração de exportações e relatórios para processamento assíncrono.

**Valor que protege.** Protege disponibilidade da API, experiência do utilizador e previsibilidade de relatórios pesados.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir estados de job, retry, polling, erros, permissões e migração de endpoints síncronos.

**Para production-ready.** Exige métricas de fila, alertas de jobs presos, DLQ, idempotência e limpeza de artefactos.
