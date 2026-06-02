# AI Assistant API - Documentação Completa

## 📋 Visão Geral

A IA Operacional do Substrato é um assistente inteligente que fornece suporte às operações hospitalares através de:

- **Chat Inteligente**: Conversa em português e inglês com análise de intenção
- **Ferramentas Especializadas**: 15+ ferramentas para diferentes domínios
- **Segurança**: Política integrada, auditoria completa, redação de dados
- **Escalabilidade**: Cache Redis, rate limiting, retry logic, circuit breaker
- **Aprendizado**: Clarificação progressiva, normalização de aliases, sugestões

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   API REST / WebSocket                       │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                    Middleware Layers                         │
│  • Rate Limiting (por utilizador/tenant)                    │
│  • Autenticação JWT                                          │
│  • CORS & CSRF                                               │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│              AI Orchestrator (Core)                          │
│  • Intent Routing                                            │
│  • Tool Selection & Execution                               │
│  • Response Synthesis                                        │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼─────┐    ┌────▼──────┐
   │ Services │    │  Storage   │
   │          │    │            │
   │ • Cache  │    │ • DB       │
   │ • Rate   │    │ • Cache    │
   │ • Error  │    │ • Vector   │
   │ • RAG    │    │   Store    │
   │ • Audit  │    │            │
   └──────────┘    └────────────┘
```

---

## 📦 Componentes

### 1. **Cache Manager** (`services/cache.py`)

Suporta Redis com fallback automático para memória.

```python
from apps.ai_assistant.services.cache import cache_manager

# Set
cache_manager.set("key", "value", ttl_seconds=3600)

# Get
value = cache_manager.get("key")

# Stats
stats = cache_manager.get_stats()
print(stats)
# {
#   "backend": "redis_with_fallback",
#   "redis_available": true,
#   "redis_errors": 0,
#   "fallback_activations": 0,
#   "memory_stats": {...}
# }

# Clear
cache_manager.clear()
```

**Management Command:**

```bash
# Ver estatísticas
python manage.py ai_cache_manage stats

# Limpar cache
python manage.py ai_cache_manage clear

# Resetar manager
python manage.py ai_cache_manage reset
```

---

### 2. **Rate Limiter** (`services/rate_limiter.py`)

Protege contra abuso com suporte a Sliding Window e Token Bucket.

```python
from apps.ai_assistant.services.rate_limiter import (
    rate_limiter,
    rate_limit,
    RateLimitConfig,
    RateLimitExceeded,
)

# Check limit
config = RateLimitConfig(limit=100, window_seconds=3600)
try:
    rate_limiter.check_limit("user:123", config=config)
except RateLimitExceeded as e:
    print(f"Limite excedido: {e.limit} por {e.window}s")

# Using decorator
@rate_limit(
    key_func=lambda self, user: f"user:{user.id}",
    config=RateLimitConfig(limit=50, window_seconds=3600)
)
def chat_with_ai(self, user, message):
    return "response"

# Get usage stats
usage = rate_limiter.get_usage("user:123")
print(f"Requisições: {usage['requests']}/{usage['limit']}")
```

**Management Command:**

```bash
# Ver estatísticas
python manage.py ai_ratelimit stats --key "ai_ratelimit:tenant_1:user_123:chat"

# Resetar limite
python manage.py ai_ratelimit reset --key "ai_ratelimit:tenant_1:user_123:chat"
```

---

### 3. **Error Handling** (`services/error_handler.py`)

Retry logic com exponential backoff e circuit breaker.

```python
from apps.ai_assistant.services.error_handler import (
    retry,
    safe_operation,
    CircuitBreaker,
    CircuitBreakerConfig,
    RetryConfig,
    AiException,
)

# Retry with exponential backoff
config = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=60.0,
    exponential_base=2.0,
)

@retry(config=config)
def fetch_patient_data(patient_id):
    # Will retry up to 3 times on TimeoutError/ConnectionError
    return api.get(f"/patients/{patient_id}")

# Safe operation with fallback
@safe_operation("database_query", fallback_value=[])
def get_active_alerts():
    return db.query("SELECT * FROM alerts WHERE active=true")

# Manual circuit breaker
cb_config = CircuitBreakerConfig(failure_threshold=5)
breaker = CircuitBreaker(cb_config)

try:
    result = breaker.call(expensive_operation)
except AiException as e:
    print(f"Circuit breaker: {e.message}")
```

---

### 4. **Observability** (`services/observability.py`)

Monitoramento de operações e métricas.

```python
from apps.ai_assistant.services.observability import (
    observability_collector,
    record_operation,
)

# Context manager
with record_operation("patient_search", metadata={"patient_id": 123}):
    results = search_patients("João Silva")

# Manual recording
observability_collector.record_operation(
    "api_call",
    status="success",
    duration_ms=150,
    metadata={"endpoint": "/api/patients"}
)

# Get metrics
stats = observability_collector.get_stats(
    operation_name="patient_search",
    last_minutes=60
)
print(stats)
# {
#   "total": 42,
#   "successful": 40,
#   "failed": 2,
#   "success_rate": "95.2%",
#   "avg_duration_ms": "234.56"
# }
```

---

### 5. **RAG / Vector Store** (`vector_store/`)

Busca semântica com embeddings (FAISS + sentence-transformers).

```python
from apps.ai_assistant.vector_store import knowledge_retriever

# Add document
knowledge_retriever.add_document(
    "Protocolo de higiene das mãos: lavar com água e sabão por 20s",
    metadata={"category": "protocols", "department": "nursing"}
)

# Batch add
documents = [
    {"content": "...", "category": "protocols"},
    {"content": "...", "category": "procedures"},
]
added = knowledge_retriever.add_documents_batch(documents)

# Search
results = knowledge_retriever.search(
    "higiene das mãos",
    top_k=5,
    min_score=0.5
)
for result in results:
    print(f"Score: {result['similarity_score']:.2f}")
    print(f"Content: {result['content']}")

# Hybrid search (semantic + keyword)
results = knowledge_retriever.hybrid_search(
    "protocolos de higiene",
    keyword_filter={"department": "nursing"},
    top_k=3
)

# Stats
stats = knowledge_retriever.get_stats()
print(f"Documents: {stats['size']}")
```

**Management Command:**

```bash
# Ver estatísticas
python manage.py ai_knowledge_base stats

# Buscar
python manage.py ai_knowledge_base search --query "higiene das mãos" --top-k 5

# Limpar
python manage.py ai_knowledge_base clear

# Info completa
python manage.py ai_knowledge_base info
```

---

## 🔌 Integração com Orchestrator

```python
from apps.ai_assistant.services.orchestrator import AiOrchestrator

orchestrator = AiOrchestrator()

response = orchestrator.chat(
    user=request.user,
    tenant=request.tenant,
    message="Quantos pacientes deram entrada hoje?",
    session_id=None,
    language="pt",
    active_module="reception",
    context={
        "department": "reception",
        "shift": "morning"
    }
)

print(response)
# {
#   "success": True,
#   "answer": "Houve 23 admissões hoje",
#   "session_id": "AIS_xyz123",
#   "message_id": "AIM_abc456",
#   "tools_used": ["get_command_center_alerts"],
#   "metadata": {...}
# }
```

---

## 🎯 Configuração Django

Adicione ao `settings.py`:

```python
# AI Assistant Configuration
AI_ASSISTANT_ENABLED = True

# Cache backend: 'redis' or 'memory'
AI_CACHE_BACKEND = 'redis'

# Rate Limiting
AI_RATE_LIMIT_STRATEGY = 'sliding_window'  # or 'token_bucket'

# Middleware
MIDDLEWARE = [
    ...
    'apps.ai_assistant.middleware.AiRateLimitMiddleware',
    ...
]

# Vector Store
AI_VECTOR_STORE_DIR = 'vector_stores/'
AI_EMBEDDING_MODEL = 'all-MiniLM-L6-v2'  # Default

# Observability
AI_OBSERVABILITY_RETENTION_HOURS = 24
```

---

## 📊 Endpoints da API

### Chat

```
POST /api/v1/ai/chat
Content-Type: application/json

{
  "message": "Quantos pacientes hoje?",
  "session_id": null,
  "language": "pt",
  "active_module": "reception"
}

Response:
{
  "success": true,
  "answer": "23 pacientes foram admitidos",
  "session_id": "AIS_xyz",
  "message_id": "AIM_abc",
  "tools_used": [...],
  "metadata": {...}
}
```

### Headers Resposta

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Percentage: 13%
```

---

## 🧪 Testes

Executar suite de testes:

```bash
# Todos os testes
pytest apps/ai_assistant/tests/ -v

# Testes específicos
pytest apps/ai_assistant/tests/test_ai_core.py::TestMemoryCacheBackend -v

# Com cobertura
pytest apps/ai_assistant/tests/ --cov=apps.ai_assistant
```

---

## 📈 Monitoramento

Verificar saúde da IA:

```bash
# Cache stats
python manage.py ai_cache_manage stats

# Rate limits
python manage.py ai_ratelimit stats --key "user_123_chat"

# Knowledge base
python manage.py ai_knowledge_base stats

# Ver logs (desenvolvimento)
tail -f logs/ai_assistant.log
```

---

## 🚀 Performance

### Benchmarks Esperados

- **Chat Response**: < 500ms (com cache hit)
- **Tool Execution**: < 2s (P95)
- **Vector Search**: < 200ms (1000+ documentos)
- **Rate Limit Check**: < 1ms

### Otimizações Aplicadas

✅ Cache Redis com fallback em memória (100-500 itens)
✅ Rate limiting sliding window (98% overhead)
✅ Circuit breaker para falhas cascata
✅ Retry com exponential backoff (até 3 tentativas)
✅ Batch processing para embeddings
✅ Índices FAISS otimizados para busca

---

## 🔒 Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Rate limiting por utilizador/tenant
- ✅ Redação de dados sensíveis em logs
- ✅ Auditoria completa de mensagens
- ✅ Policy guard integrado
- ✅ RBAC em operações
- ✅ Sanitização de entrada

---

## 🐛 Troubleshooting

### Cache não funciona

```bash
# Verificar Redis
redis-cli ping  # Deve retornar PONG

# Verificar backend ativo
python manage.py shell
from apps.ai_assistant.services.cache import cache_manager
print(cache_manager.backend)  # Deve ser RedisCacheBackend
```

### Rate limit muito restritivo

```python
# Aumentar limite
from apps.ai_assistant.services.rate_limiter import RateLimitConfig
config = RateLimitConfig(limit=500, window_seconds=3600)
```

### Embeddings lentos

```bash
# Usar modelo mais rápido
AI_EMBEDDING_MODEL = 'sentence-transformers/paraphrase-MiniLM-L3-v2'  # 3D
```

---

## 📞 Suporte

Para issues ou dúvidas sobre a IA:

1. Consultar logs: `apps/ai_assistant/`
2. Verificar testes: `tests/test_ai_core.py`
3. Documentação de ferramentas: `tools/*.py`

---

**Versão**: 1.0.0
**Último Update**: 2 de Junho de 2026
