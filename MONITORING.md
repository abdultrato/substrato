# 📊 Monitoramento & Observabilidade

## 🎯 Visão Geral

Monitoramento completo com **Prometheus**, **Grafana**, **Sentry**, **ELK Stack**:

```
Aplicação
    ↓
Prometheus (Métricas) + Sentry (Errors) + ELK (Logs)
    ↓
Grafana (Dashboards) + Alertas
    ↓
Slack/Email Notifications
```

---

## 📈 Prometheus - Metrics Collection

### Instalar

```bash
# Instalar django-prometheus
pip install django-prometheus

# Adicionar ao requirements.txt (✅ já feito)
```

### Configurar Django

```python
# plataforma/settings/base.py

INSTALLED_APPS += ['django_prometheus']

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... outros middlewares
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# URLs
urlpatterns += [
    path('metrics/', include('django_prometheus.urls')),
]
```

### Métricas Disponíveis

```
# HTTP Requests
http_requests_total{method="GET", status="200"}
http_request_duration_seconds{endpoint="/api/v1/..."}

# Database
django_db_execute_count
django_db_execute_duration_seconds

# Cache
django_cache_get_total
django_cache_hit_count
django_cache_miss_count

# Custom
substrato_pacientes_created_total
substrato_api_errors_total
```

---

## 🔴 Sentry - Error Tracking

### Instalar

```bash
pip install sentry-sdk
```

### Configurar Django

```python
# plataforma/settings/production.py

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

SENTRY_DSN = os.getenv('SENTRY_DSN', '')

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,  # 10% sampling
        send_default_pii=False,
        environment=os.getenv('DJANGO_ENV', 'development'),
    )
```

### Usar no Código

```python
import sentry_sdk

# Automático para exceções
try:
    problematico()
except Exception as e:
    sentry_sdk.capture_exception(e)

# Manual
sentry_sdk.capture_message("Algo importante aconteceu", level="info")
```

### Dashboard Sentry

Acessar: https://sentry.io/organizations/seu-org/

- ✅ Rastrear todos erros em tempo real
- ✅ Grouping automático de issues
- ✅ Stack traces com source maps
- ✅ Alertas por email/Slack
- ✅ Release tracking

---

## 📝 Logging - ELK Stack

### Estrutura de Logs

```python
# Django configured em plataforma/settings/logging.py

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(level)s %(name)s %(message)s'
        },
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/substrato.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

### Elasticsearch Setup

```bash
# Docker Compose (já incluído)
# docker-compose.yml contém:
# - elasticsearch:7.14
# - logstash:7.14
# - kibana:7.14
```

### Kibana Dashboard

Acessar: http://localhost:5601

- ✅ Buscar logs por palavra-chave
- ✅ Filtrar por timestamp, nível, host
- ✅ Criar dashboards customizados
- ✅ Alertas de padrões suspeitos

---

## 📊 Grafana - Dashboards

### Instalar Prometheus + Grafana (Docker)

```bash
# Já configurado em docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up prometheus grafana
```

### Grafana Setup

1. Acessar http://localhost:3000
2. Login padrão: `admin`/`admin`
3. Mudar senha
4. Adicionar data source: Prometheus (http://prometheus:9090)
5. Importar dashboards

### Dashboards Úteis

**Django Prometheus Dashboard**
```
https://grafana.com/grafana/dashboards/8067
```

Metrics:
- Request rate (req/sec)
- Response times (p50, p95, p99)
- Error rate (%)
- Database query times
- Cache hit ratio

**Node Exporter Dashboard**
```
https://grafana.com/grafana/dashboards/1860
```

Metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Criar Dashboard Customizado

1. Grafana → Dashboards → New Dashboard
2. Add Panel → Prometheus query:
   ```prometheus
   rate(http_requests_total[5m])
   ```
3. Visualizar como Graph/Table/Gauge
4. Save

---

## 🚨 Alerting

### AlertManager (Prometheus)

```yaml
# prometheus/alerting-rules.yaml
groups:
- name: substrato
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: HighMemoryUsage
    expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Memory usage above 80%"
```

### Notificações

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'slack'
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  routes:
  - match:
      severity: critical
    receiver: 'critical-slack'

receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#alerts'
    
- name: 'critical-slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#critical-alerts'
```

---

## 📋 Health Checks

### Liveness & Readiness Probes

```python
# infrastrutura/health.py

from django.http import JsonResponse
from django.core.cache import cache
from django.db import connection

def health_live(request):
    """Liveness probe - servidor ainda está rodando?"""
    return JsonResponse({'status': 'alive'})

def health_ready(request):
    """Readiness probe - servidor está pronto para servir requisições?"""
    try:
        # Testar banco de dados
        connection.ensure_connection()
        
        # Testar cache
        cache.set('health_check', 'ok', 1)
        cache.get('health_check')
        
        return JsonResponse({'status': 'ready'})
    except Exception as e:
        return JsonResponse({'status': 'not_ready', 'error': str(e)}, status=503)
```

### URLs

```python
# plataforma/urls.py
path('health/live', health_live),
path('health/ready', health_ready),
```

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 20
  periodSeconds: 5
```

---

## 🔧 Checklist de Observabilidade

- [ ] Prometheus + django-prometheus instalado
- [ ] Métricas expostas em /metrics/
- [ ] Grafana conectado a Prometheus
- [ ] Dashboards criados (HTTP, DB, Cache)
- [ ] Sentry configurado
- [ ] Error tracking funcionando
- [ ] Logging estruturado (JSON)
- [ ] ELK Stack deployado
- [ ] Alertas configurados
- [ ] Notificações Slack/Email
- [ ] Health checks implementados
- [ ] Load testing realizado

---

## 📊 Stack Recomendada

### Desenvolvimento
- Docker Compose (já incluído)
- Logs para stdout
- Basic metrics (django-prometheus)

### Staging
- Kubernetes com Prometheus
- Grafana para dashboards
- Sentry para errors
- ELK para logs

### Produção
- **Managed services**:
  - AWS CloudWatch (logs)
  - AWS X-Ray (tracing)
  - Datadog (completo)
  - New Relic (completo)
  - Sumo Logic (logs)
  
OU

- **Self-hosted**:
  - Prometheus + AlertManager
  - Grafana + Loki
  - Sentry
  - ELK Stack

---

## 💡 Queries Úteis

### Prometheus

```promql
# Requests por segundo
rate(http_requests_total[5m])

# Latência P95
histogram_quantile(0.95, http_request_duration_seconds)

# Taxa de erro
rate(http_requests_total{status=~"5.."}[5m])

# Database query time
rate(django_db_execute_duration_seconds_sum[5m]) / rate(django_db_execute_count[5m])

# Cache hit ratio
rate(django_cache_hit_count[5m]) / (rate(django_cache_hit_count[5m]) + rate(django_cache_miss_count[5m]))
```

---

## 📚 Recursos

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Sentry Docs](https://docs.sentry.io/)
- [ELK Stack Docs](https://www.elastic.co/guide/en/elastic-stack/current/index.html)
- [OpenTelemetry](https://opentelemetry.io/)

---

**Criado em**: 11/03/2026
**Status**: Framework pronto para implementação
**Próximo**: Deploy em AWS/GCP com observabilidade completa
