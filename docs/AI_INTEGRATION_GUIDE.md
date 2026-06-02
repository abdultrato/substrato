# Guia de Integração - AI Assistant

## Quick Start

### 1. Instalação

As dependências já estão em `requirements.txt`:

```
redis==7.2.1
django-redis==6.0.0
sentence-transformers==2.2.2
faiss-cpu==1.7.4
pytest==8.3.4
pytest-django==4.8.0
```

Certifique-se que têm Redis rodando:

```bash
redis-server
# ou docker
docker run -d -p 6379:6379 redis:latest
```

### 2. Configurar Django Settings

```python
# settings.py

INSTALLED_APPS = [
    ...
    'apps.ai_assistant',
    ...
]

MIDDLEWARE = [
    ...
    'apps.ai_assistant.middleware.AiRateLimitMiddleware',
    ...
]

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# AI Settings
AI_ASSISTANT_ENABLED = True
AI_CACHE_BACKEND = 'redis'  # 'memory' for development
```

### 3. Usar a API

```python
from apps.ai_assistant.services.orchestrator import AiOrchestrator

orchestrator = AiOrchestrator()

# Chat básico
response = orchestrator.chat(
    user=request.user,
    tenant=request.tenant,
    message="Quantos pacientes deram entrada hoje?",
    language="pt"
)

if response['success']:
    print(response['answer'])
else:
    print(f"Erro: {response.get('error')}")
```

---

## Casos de Uso

### Use Case 1: Chat em Tempo Real

```python
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from apps.ai_assistant.services.orchestrator import AiOrchestrator

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_endpoint(request):
    """
    POST /api/v1/ai/chat
    {
        "message": "...",
        "session_id": "AIS_...",
        "language": "pt"
    }
    """
    orchestrator = AiOrchestrator()

    try:
        response = orchestrator.chat(
            user=request.user,
            tenant=request.tenant,
            message=request.data['message'],
            session_id=request.data.get('session_id'),
            language=request.data.get('language', 'pt')
        )
        return Response(response)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=400
        )
```

### Use Case 2: Busca Semântica em Base de Conhecimento

```python
from apps.ai_assistant.vector_store import knowledge_retriever

def search_protocols(query: str):
    """Buscar protocolos por descrição semântica"""
    results = knowledge_retriever.search(
        query,
        top_k=5,
        min_score=0.6
    )

    return [
        {
            'title': r.get('title'),
            'content': r.get('content')[:200],
            'relevance': f"{r['similarity_score']:.1%}"
        }
        for r in results
    ]

# Usage
protocols = search_protocols("Como desinfectar instrumentos cirúrgicos?")
```

### Use Case 3: Monitoramento de Operações

```python
from apps.ai_assistant.services.observability import observability_collector

def get_ai_health():
    """Dashboard de saúde da IA"""

    stats = {
        'chat_operations': observability_collector.get_stats(
            operation_name='chat',
            last_minutes=60
        ),
        'tool_execution': observability_collector.get_stats(
            operation_name='tool',
            last_minutes=60
        ),
        'errors': observability_collector.get_stats(
            last_minutes=60
        )
    }

    return stats
```

### Use Case 4: Custom Tool para Domínio Específico

```python
from apps.ai_assistant.tools.base import AiToolBase, AiToolContext

class CustomReportTool(AiToolBase):
    """Tool customizada para gerar relatórios"""

    name = "generate_custom_report"
    description = "Gera relatório customizado"

    def get_parameters_schema(self):
        return {
            "report_type": {
                "type": "string",
                "description": "Tipo de relatório",
                "enum": ["daily", "weekly", "monthly"]
            },
            "department": {
                "type": "string",
                "description": "Departamento"
            }
        }

    def execute(self, context: AiToolContext, **kwargs) -> dict:
        report_type = kwargs.get('report_type', 'daily')
        department = kwargs.get('department')

        # Lógica de negócio
        data = self._build_report(report_type, department)

        return {
            'success': True,
            'report': data,
            'message': f"Relatório {report_type} gerado"
        }

    def _build_report(self, report_type, department):
        # Implementação
        pass
```

---

## Otimizações

### Otimização 1: Cache Agressivo

```python
from apps.ai_assistant.services.llm_gateway import LocalLlmGateway

# Aumentar TTL de cache
gateway = LocalLlmGateway()
gateway.DEFAULT_CACHE_TTL = 86400  # 24 horas

# Pré-carregar respostas frequentes
cache_manager.set(
    "common_question:admission_count",
    "resposta pré-computada",
    ttl_seconds=3600
)
```

### Otimização 2: Batch Processing

```python
# Ao invés de adicionar documentos um a um
knowledge_retriever.add_document(doc1)  # Lento!

# Usar batch
documents = [doc1, doc2, doc3, doc4, doc5]
knowledge_retriever.add_documents_batch(documents)  # Rápido!
```

### Otimização 3: Circuit Breaker para APIs Externas

```python
from apps.ai_assistant.services.error_handler import (
    retry,
    CircuitBreakerConfig,
    RetryConfig
)

@retry(
    config=RetryConfig(max_attempts=2),
    circuit_breaker_config=CircuitBreakerConfig(failure_threshold=3)
)
def call_external_api(endpoint):
    return requests.get(endpoint).json()
```

---

## Debugging

### Ver o que a IA está fazendo

```python
import logging

# Ativar logs debug
logging.getLogger('apps.ai_assistant').setLevel(logging.DEBUG)

# Log estruturado de uma operação
from apps.ai_assistant.services.observability import record_operation

with record_operation('patient_lookup', metadata={'patient_id': 123}):
    orchestrator.chat(...)
```

### Inspecionar Cache

```bash
# Check Redis directly
redis-cli

# Ver todas as keys
> KEYS ai_gateway:*

# Ver valor
> GET ai_gateway:abc123

# Ver stats
> INFO stats
```

### Testar Rate Limiting

```python
from apps.ai_assistant.services.rate_limiter import RateLimitConfig, rate_limiter

config = RateLimitConfig(limit=3, window_seconds=1)

for i in range(5):
    try:
        rate_limiter.check_limit(f"test:user", config=config)
        print(f"Request {i+1}: OK")
    except Exception as e:
        print(f"Request {i+1}: BLOCKED - {e}")
```

---

## Testes

### Teste de Cache

```python
from django.test import TestCase
from apps.ai_assistant.services.cache import cache_manager

class TestCacheIntegration(TestCase):
    def test_cache_hit(self):
        cache_manager.set("key", "value")
        self.assertEqual(cache_manager.get("key"), "value")

    def test_cache_persistence(self):
        cache_manager.set("key", "value", ttl_seconds=10)
        time.sleep(0.1)
        self.assertEqual(cache_manager.get("key"), "value")
```

### Teste de Rate Limiting

```python
from apps.ai_assistant.services.rate_limiter import (
    rate_limiter,
    RateLimitConfig,
    RateLimitExceeded
)

class TestRateLimiting(TestCase):
    def test_rate_limit_exceeded(self):
        config = RateLimitConfig(limit=1)

        rate_limiter.check_limit("test:1", config=config)

        with self.assertRaises(RateLimitExceeded):
            rate_limiter.check_limit("test:1", config=config)
```

### Teste de Vector Search

```python
from apps.ai_assistant.vector_store import knowledge_retriever

class TestVectorSearch(TestCase):
    def setUp(self):
        knowledge_retriever.clear()

    def test_semantic_search(self):
        # Add documents
        knowledge_retriever.add_document(
            "Higiene das mãos é essencial",
            {"category": "protocols"}
        )

        # Search
        results = knowledge_retriever.search("mãos limpas")
        self.assertEqual(len(results), 1)
        self.assertGreater(results[0]['similarity_score'], 0.5)
```

---

## Deployment

### Production Checklist

- [ ] Redis em servidor separado
- [ ] Cache TTL otimizado
- [ ] Rate limits definidos por tenant
- [ ] Monitoring setup (Prometheus/Grafana)
- [ ] Alertas para circuit breaker aberto
- [ ] Backup de vector store
- [ ] Logs centralizados (ELK/CloudWatch)
- [ ] Tests rodando em CI/CD

### Docker Compose (Dev)

```yaml
version: "3"
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379/1
      - AI_CACHE_BACKEND=redis
    ports:
      - "8000:8000"
    depends_on:
      - redis
```

---

## Troubleshooting

| Problema                     | Causa             | Solução                             |
| ---------------------------- | ----------------- | ----------------------------------- |
| Cache não funciona           | Redis não rodando | `redis-cli ping`                    |
| Rate limiting muito rigoroso | Config inadequada | Ajustar `RateLimitConfig`           |
| Embeddings lentos            | Modelo grande     | Mudar para modelo menor             |
| Circuit breaker aberto       | Muitas falhas     | Verificar logs e falhas subjacentes |
| OOM na memória               | Cache grande      | Reduzir `max_size` ou usar Redis    |

---

## Referências

- [Documentação Completa](./AI_ASSISTANT_API.md)
- [Testes](../apps/ai_assistant/tests/test_ai_core.py)
- [Serviços](../apps/ai_assistant/services/)
- [Ferramentas](../apps/ai_assistant/tools/)
