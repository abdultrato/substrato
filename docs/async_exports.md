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
