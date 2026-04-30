# Runbook Operacional (API + Celery + Observabilidade)

## Objetivo
Padronizar rotina diária e resposta a incidentes para backend/API, filas assíncronas e alertas.

## Pré-requisitos
- Stack observável ativa (`prometheus`, `grafana`, `alertmanager`, `celery_exporter`).
- Backend exposto com `/health/ready` e `/metrics`.
- Worker Celery ativo.

## Rotina diária (N1)
1. Executar `make ops-health`.
2. Verificar alertas ativos no Alertmanager.
3. Confirmar p95 de API e taxa 5xx no dashboard Grafana.
4. Confirmar taxa de falhas de enqueue/execução assíncrona.

## Rotina por deploy
1. Executar `make quality-gate`.
2. Aplicar migrações.
3. Validar regras de alerta: `make ops-alert-rules`.
4. Validar endpoint de métricas: `curl http://localhost:8000/metrics`.

## Rotina semanal (N2)
1. Revisar os 10 endpoints mais lentos (p95/p99).
2. Revisar tasks assíncronas com maior tempo médio.
3. Revisar fila de incidents e plano de dívida técnica.

## Playbook de incidentes

### Latência API alta
1. Confirmar alertas `ApiLatencyP95Warning` e `ApiLatencyP95Critical`.
2. Conferir saturação de banco e queries mais lentas.
3. Acionar cache curto de agregações (`refresh=0`) e reduzir consultas não essenciais.
4. Se necessário, aplicar mitigação: escalar backend/celery e revalidar em 10 minutos.

### Erro 5xx alto
1. Confirmar alerta `ApiHigh5xxRate`.
2. Filtrar erros recentes em `/api/v1/monitoring/error/`.
3. Coletar traceback dominante e abrir incidente com owner.
4. Hotfix + monitorar queda da taxa de erro.

### Falha de fila assíncrona
1. Confirmar `CeleryExporterDown` e/ou `AsyncTaskEnqueueFailures`.
2. Validar Redis e conectividade do broker.
3. Executar `make celery-inspect`.
4. Se necessário, reiniciar worker e monitorar `AsyncTaskFailuresBurst`.

## Sinais de saúde mínimos (aceitação)
- `/health/ready` responde 200.
- `/metrics` expõe métricas `substrato_api_*` e `substrato_async_task_*`.
- Prometheus validando regras sem erro.
- Alertas críticos zerados após estabilização.
