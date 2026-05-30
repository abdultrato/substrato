# Runbook Operacional (API + Celery + Observabilidade)

## Objetivo
Padronizar rotina diária e resposta a incidentes para backend/API, filas assíncronas e alertas.

## Pré-requisitos
- Stack observável ativa (`prometheus`, `grafana`, `alertmanager`, `celery_exporter`).
- Backend ASGI exposto com `/health/ready` e `/metrics`.
- Worker Celery ativo.

## Rotina diária (N1)
1. Executar `make ops-health`.
2. Verificar alertas ativos no Alertmanager.
3. Confirmar p95 de API e taxa 5xx no dashboard Grafana.
4. Confirmar taxa de falhas de enqueue/execução assíncrona.

## Rotina por deploy
1. Executar `make quality-gate`.
2. Executar `make production-readiness`.
3. Executar `make migration-check`.
4. Aplicar migrações com lock: `make migrate-safe`.
5. Validar regras de alerta: `make ops-alert-rules`.
6. Validar endpoint de métricas: `curl http://localhost:8000/metrics`.

## Rotina semanal (N2)
1. Revisar os 10 endpoints mais lentos (p95/p99).
2. Revisar tasks assíncronas com maior tempo médio.
3. Revisar fila de incidents e plano de dívida técnica.

## Playbook de incidentes

### Latência API alta
1. Confirmar alertas `ApiLatencyP95Warning` e `ApiLatencyP95Critical`.
2. Conferir saturação de banco e queries mais lentas.
3. Confirmar saturação de workers ASGI (`ASGI_WORKERS`) e ligações concorrentes.
4. Acionar cache curto de agregações (`refresh=0`) e reduzir consultas não essenciais.
5. Se necessário, aplicar mitigação: escalar backend/celery e revalidar em 10 minutos.

### Falha do runtime ASGI
1. Confirmar que o processo foi iniciado com `python -m uvicorn platform.asgi:application`.
2. Validar variáveis `DJANGO_SETTINGS_MODULE`, `ASGI_WORKERS`, `ASGI_KEEPALIVE_TIMEOUT` e reverse proxy headers.
3. Testar `curl http://localhost:8000/health/live`.
4. Se a falha estiver ligada a WebSocket/SSE ou streaming, isolar a rota e manter APIs REST críticas activas.

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

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Guia a equipa quando o sistema precisa de ser iniciado, observado, corrigido ou recuperado.

**Valor que protege.** Protege continuidade operacional, MTTR baixo e capacidade de resposta a falhas reais.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir API, Celery, Redis, Postgres, exports, health checks, logs e procedimentos de suporte.

**Para production-ready.** Exige runbooks ensaiados, alertas mapeados, escalonamento, backups restauráveis e pós-incidente.
