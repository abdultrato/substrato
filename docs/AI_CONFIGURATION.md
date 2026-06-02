# AI Assistant Configuration Example

```python
# settings.py

# ============================================================================
# AI ASSISTANT CONFIGURATION
# ============================================================================

# Enable/disable AI assistant
AI_ASSISTANT_ENABLED = True

# Cache backend: 'redis' or 'memory'
AI_CACHE_BACKEND = 'redis'

# Cache TTL in seconds (default: 1 hour)
AI_CACHE_TTL = 3600

# Redis cache configuration (if using redis backend)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,  # Fail open
        }
    }
}

# Rate limiting configuration
AI_RATE_LIMIT_STRATEGY = 'sliding_window'  # or 'token_bucket'

AI_RATE_LIMIT_CHAT = {
    'limit': 100,  # 100 requests
    'window_seconds': 3600,  # per hour
}

AI_RATE_LIMIT_TOOL = {
    'limit': 50,  # 50 requests
    'window_seconds': 3600,  # per hour
}

# Retry configuration
AI_RETRY_MAX_ATTEMPTS = 3
AI_RETRY_INITIAL_DELAY = 1.0  # seconds
AI_RETRY_MAX_DELAY = 60.0  # seconds
AI_RETRY_EXPONENTIAL_BASE = 2.0

# Circuit breaker configuration
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 60  # seconds
AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 2

# Vector store configuration
AI_VECTOR_STORE_DIR = os.path.join(BASE_DIR, 'vector_stores')
AI_EMBEDDING_MODEL = 'all-MiniLM-L6-v2'  # Fast, 384D, good for Portuguese
# Alternative models:
# - 'all-MiniLM-L12-v2' (384D, slightly better quality)
# - 'all-mpnet-base-v2' (768D, better but slower)
# - 'sentence-transformers/paraphrase-MiniLM-L3-v2' (384D, very fast)

# Observability configuration
AI_OBSERVABILITY_RETENTION_HOURS = 24
AI_OBSERVABILITY_ENABLED = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {name} {funcName} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'ai_file': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/ai_assistant.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps.ai_assistant': {
            'handlers': ['ai_file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ============================================================================
# MIDDLEWARE (Add after other middleware)
# ============================================================================

MIDDLEWARE = [
    # ... other middleware ...
    'apps.ai_assistant.middleware.AiRateLimitMiddleware',
]

# ============================================================================
# API CONFIGURATION
# ============================================================================

# AI API endpoints (for rate limiter)
AI_API_ENDPOINTS = [
    '/api/v1/ai/chat',
    '/api/ai/chat',
    '/api/v1/ai/tools',
]

# ============================================================================
# SECURITY
# ============================================================================

# Require authentication for AI endpoints
AI_REQUIRE_AUTH = True

# Allowed user groups (empty = all authenticated)
AI_ALLOWED_GROUPS = []

# Data redaction in logs
AI_REDACT_SENSITIVE_DATA = True
AI_REDACT_FIELDS = [
    'ssn', 'email', 'phone', 'address', 'passport',
    'medical_record', 'health_number'
]

# ============================================================================
# AUDIT
# ============================================================================

# Store AI messages in database
AI_AUDIT_ENABLED = True

# Audit retention (days)
AI_AUDIT_RETENTION_DAYS = 90

# Audit sensitive messages
AI_AUDIT_SENSITIVE_DATA = True
```

## Environment Variables (`.env`)

```bash
# Redis
REDIS_URL=redis://localhost:6379/1
REDIS_TIMEOUT=5

# Cache
AI_CACHE_BACKEND=redis
AI_CACHE_TTL=3600

# Rate Limiting
AI_RATE_LIMIT_STRATEGY=sliding_window

# Embeddings
AI_EMBEDDING_MODEL=all-MiniLM-L6-v2

# Observability
AI_OBSERVABILITY_ENABLED=true
AI_OBSERVABILITY_RETENTION_HOURS=24

# Logging
LOG_LEVEL=INFO
```

## Commands to Initialize

```bash
# Create vector store directory
mkdir -p vector_stores

# Create logs directory
mkdir -p logs

# Run migrations (if any)
python manage.py migrate

# Test cache connection
python manage.py shell
>>> from apps.ai_assistant.services.cache import cache_manager
>>> cache_manager.set('test', 'value')
>>> cache_manager.get('test')
'value'

# Test rate limiter
python manage.py shell
>>> from apps.ai_assistant.services.rate_limiter import rate_limiter
>>> rate_limiter.is_allowed('test:user:1')
True

# Test embeddings
python manage.py shell
>>> from apps.ai_assistant.vector_store import embedding_service
>>> embedding_service.is_available()
True
>>> len(embedding_service.encode("test")[0])
384
```

## Production Recommendations

```python
# settings_production.py

# Use stronger caching
AI_CACHE_BACKEND = 'redis'
AI_CACHE_TTL = 7200  # 2 hours

# Stricter rate limiting
AI_RATE_LIMIT_CHAT = {
    'limit': 50,
    'window_seconds': 3600,
}

# Circuit breaker for stability
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3
AI_CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 120

# Disable debug logging
import logging
logging.getLogger('apps.ai_assistant').setLevel(logging.WARNING)

# Longer audit retention
AI_AUDIT_RETENTION_DAYS = 365

# Use larger embedding model for better quality
AI_EMBEDDING_MODEL = 'all-mpnet-base-v2'
```

## Monitoring Setup

Add to your monitoring:

```python
# Prometheus metrics
from apps.ai_assistant.services.observability import observability_collector
from apps.ai_assistant.services.cache import cache_manager
from apps.ai_assistant.services.rate_limiter import rate_limiter

def get_ai_metrics():
    return {
        'cache': cache_manager.get_stats(),
        'operations': observability_collector.get_stats(),
        'rate_limits': rate_limiter.get_usage('global'),
    }
```
