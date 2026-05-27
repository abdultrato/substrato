# Processamento Assíncrono

O Substrato usa Celery com Redis para tarefas que não devem bloquear requests HTTP,
como exportações PDF/CSV, recálculo de faturas e rotinas operacionais.

## Componentes

- `platform/celery.py`: inicializa a aplicação Celery.
- `platform/settings/base.py`: define broker, result backend, filas, rotas e limites.
- `infrastructure/task_queue.py`: ponto único para enfileirar tarefas com fallback controlado.
- `tasks/export_jobs.py`: executa jobs de exportação assíncrona.
- `services/reports/async_exports.py`: estado, payload e resultado dos jobs de exportação.

## Filas

- `default`: tarefas gerais.
- `exports`: geração de PDF/CSV e relatórios pesados.
- `billing`: recálculo de faturas e cobranças.
- `operations`: tarefas operacionais e autorizações.

## Variáveis principais

```env
ASYNC_PROCESSING_ENABLED=true
USE_REDIS=true
REDIS_URL=redis://redis:6379/1
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/1
CELERY_WORKER_QUEUES=default,exports,billing,operations
CELERY_TASK_TIME_LIMIT_SECONDS=900
CELERY_TASK_SOFT_TIME_LIMIT_SECONDS=720
CELERY_RESULT_EXPIRES_SECONDS=3600
```

Em desenvolvimento sem `REDIS_URL`, o Celery usa modo eager/memória para evitar
falhas locais. Para processamento assíncrono real, Redis e worker precisam estar
ativos.

Se `ASYNC_PROCESSING_ENABLED=false`, `infrastructure.task_queue.enqueue_task(...)`
executa a tarefa localmente e não tenta contactar o broker.

## Comandos

```bash
python manage.py check_async_processing
python manage.py check_async_processing --strict
python -m celery -A platform worker -l info -Q default,exports,billing,operations --concurrency=2
python -m celery -A platform beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

Com Docker Compose:

```bash
docker compose up -d redis backend celery celery_beat
docker compose exec backend python manage.py check_async_processing --strict
docker compose logs -f celery
```

## Contrato de uso

Use `infrastructure.task_queue.enqueue_task(...)` ou
`enqueue_task_on_commit(...)` para novas tarefas. Para exportações HTTP, prefira
`api.utils.async_exports.queue_export_if_requested(...)`, que já devolve `202`
com `status_url` e `download_url`.
