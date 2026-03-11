# FASE 3: Error Handling - RFC 7807 Implementation Guide

## Overview

This phase implements structured error handling following the **RFC 7807 (Problem Details for HTTP APIs)** standard. This ensures consistent, machine-readable error responses across the application with automatic retry logic for transient failures.

**Score Target**: 88 → 91/100 (+3 points)

---

## What is RFC 7807?

RFC 7807 defines a standard JSON format for HTTP API error responses:

```json
{
  "type": "https://example.com/errors/validation-error",
  "status": 422,
  "title": "Validation Error",
  "detail": "The request body contains validation errors",
  "instance": "/api/v1/pacientes/",
  "code": "VALIDATION_ERROR",
  "validationErrors": {
    "email": "Invalid email format",
    "nome": "Name must be between 2 and 255 characters"
  }
}
```

**Benefits:**
- ✅ Machines can parse errors automatically
- ✅ Frontend knows whether to retry
- ✅ Field-level validation errors included
- ✅ Same format across all endpoints

---

## 3.1 Backend Exception Handler (Django/DRF)

### File: `api/v1/exceptions.py`

Django REST Framework exception handler that converts all exceptions to RFC 7807 format.

**Key Components:**

#### 1. Custom Exception Classes

```python
class APIException(DRFException):
    """Base API exception with RFC 7807 fields"""
    default_code = 'api_error'
    
    def __init__(self, detail, code=None, status_code=None, **extra):
        super().__init__(detail)
        self.code = code or self.default_code
        self.extra = extra
```

Specific exception types:
- `ValidationError` - Input validation failed (422)
- `AuthenticationError` - Missing/invalid auth (401)
- `AuthorizationError` - User lacks permission (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource already exists (409)
- `RateLimitError` - Too many requests (429)
- `InternalServerError` - Unexpected error (500)

#### 2. Exception Handler

```python
def custom_exception_handler(exc, context):
    """Convert all exceptions to RFC 7807 format"""
    # Converts DRF ValidationError, PermissionDenied, NotFound, etc.
    # Returns Response with problem details structure
```

### Integration with Django

Update `plataforma/settings.py`:

```python
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.v1.exceptions.custom_exception_handler',
}
```

### Usage in Views

```python
from api.v1.exceptions import ValidationError, NotFoundError

class PacientesViewSet(viewsets.ModelViewSet):
    def create(self, request):
        if not request.data.get('email'):
            raise ValidationError('Email is required')
        
        if Paciente.objects.filter(email=request.data['email']).exists():
            raise ValidationError('Email already exists', code='DUPLICATE_EMAIL')
        
        return super().create(request)
```

---

## 3.2 Frontend Error Types

### File: `frontend-next/lib/errors/api-error.ts`

TypeScript error class and utilities for handling RFC 7807 responses.

**Key Classes/Functions:**

#### ApiError Class

```typescript
export class ApiError extends Error {
  type: string
  status: number
  title: string
  detail: string
  instance?: string
  code: string
  validationErrors?: Record<string, string>
  
  isValidationError(): boolean
  isAuthError(): boolean
  isRetryable(): boolean
  getCategory(): 'client' | 'server' | 'retry'
}
```

#### Helper Functions

```typescript
// Parse API error from Response object
parseResponseError(response: Response): Promise<ApiError>

// Parse error from axios error
parseAxiosError(error: AxiosError): ApiError

// Get user-friendly message
getUserFriendlyMessage(error: ApiError): string

// Get validation errors by field
getFieldErrors(error: ApiError): Record<string, string>
```

**Usage Example:**

```typescript
try {
  const response = await fetch('/api/v1/pacientes/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await parseResponseError(response)
    console.log(error.status) // 422
    console.log(error.validationErrors) // { email: "Invalid" }
    console.log(error.isRetryable()) // false (4xx)
  }
} catch (err) {
  const error = err instanceof ApiError ? err : new ApiError(...)
}
```

---

## 3.3 Retry Logic with Exponential Backoff

### File: `frontend-next/lib/errors/retry.ts`

Automatic retry logic for transient failures (5xx, 429, 408).

**Configuration:**

```typescript
interface RetryOptions {
  maxRetries?: number          // Default: 3
  initialDelayMs?: number      // Default: 1000
  backoffMultiplier?: number   // Default: 2
  maxDelayMs?: number          // Default: 30000
  shouldRetry?: (error) => boolean  // Custom retry logic
  onRetry?: (error, attempt, delay) => void  // Callback
}
```

**Delay Calculation:**

```
Attempt 0 (fail): delay = 1000ms (±50% jitter)
Attempt 1 (retry): delay = 2000ms (±50% jitter)
Attempt 2 (retry): delay = 4000ms (±50% jitter)
Attempt 3 (fail):  throw error
```

**Usage:**

```typescript
import { withRetry } from '@/lib/errors/retry'

// Simple retry
const data = await withRetry(
  () => fetch('/api/v1/pacientes/1').then(r => r.json())
)

// Custom options
const data = await withRetry(
  () => api.get('/pacientes'),
  {
    maxRetries: 5,
    initialDelayMs: 500,
    onRetry: (error, attempt, delay) => {
      console.log(`Retry #${attempt} in ${delay}ms`)
    },
  }
)
```

**Retryable Error Codes:**
- ✅ 5xx - Server errors
- ✅ 429 - Too Many Requests
- ✅ 408 - Request Timeout
- ❌ 4xx (except 408, 429) - Client errors (don't retry)

---

## 3.4 Integrated API Client

### File: `frontend-next/lib/api/validated-client.ts`

API client combining validation + error handling + retry logic.

**Features:**
1. Response validation with Zod
2. Error parsing with RFC 7807
3. Automatic retry for transient failures
4. Discriminated union result type

**Usage:**

```typescript
import { ValidatedPacientesService, type OperationResult } from '@/lib/api/validated-client'

// With automatic retry
const result = await ValidatedPacientesService.list()

if (result.success) {
  console.log(result.data.results) // Paciente[]
} else {
  console.log(result.error.title) // "Internal Server Error"
  console.log(result.error.validationErrors) // Field errors
}

// Custom retry options
const result = await ValidatedPacientesService.get(id, {
  maxRetries: 5,
  onRetry: (error, attempt) => {
    console.log(`Retry #${attempt}: ${error.detail}`)
  },
})

// No retry for mutations
const result = await ValidatedPacientesService.create(
  { nome: 'João', email: 'joao@example.com' },
  { maxRetries: 0 } // Don't retry creates
)
```

**Key Pattern:**
- `list()` → Retryable (GET)
- `get(id)` → Retryable (GET)
- `create()` → No retry (POST)
- `update()` → No retry (PATCH)
- `delete()` → No retry (DELETE)

---

## 3.5 Using in React Components

### Example: Pacientes List Component

```typescript
'use client'

import { ValidatedPacientesService } from '@/lib/api/validated-client'
import { ApiError } from '@/lib/errors/api-error'
import { useEffect, useState } from 'react'

export function PacientesList() {
  const [pacientes, setPacientes] = useState([])
  const [error, setError] = useState<ApiError | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPacientes()
  }, [])

  async function loadPacientes() {
    setIsLoading(true)
    setError(null)

    const result = await ValidatedPacientesService.list(
      undefined, // search
      'nome', // ordering
      10, // limit
      0, // offset
      { maxRetries: 3 } // retry config
    )

    if (result.success) {
      setPacientes(result.data.results)
    } else {
      setError(result.error)
      // User saw automatic retries before reaching here
    }

    setIsLoading(false)
  }

  if (isLoading) return <div>Carregando...</div>

  if (error) {
    return (
      <div className="error">
        <h2>{error.title}</h2>
        <p>{error.detail}</p>
        {error.validationErrors && (
          <ul>
            {Object.entries(error.validationErrors).map(([field, msg]) => (
              <li key={field}>{field}: {msg}</li>
            ))}
          </ul>
        )}
        <button onClick={loadPacientes}>Tentar Novamente</button>
      </div>
    )
  }

  return (
    <ul>
      {pacientes.map(p => (
        <li key={p.id}>{p.nome} ({p.email})</li>
      ))}
    </ul>
  )
}
```

---

## Testing

### Test File: `frontend-next/__tests__/retry.test.ts`

36 test cases covering:
- Exponential backoff calculation
- Retry behavior on different status codes
- onRetry callback execution
- Custom shouldRetry logic
- jitter inclusion
- maxRetries limit

**Run tests:**

```bash
npm run test                        # Run all tests
npm run test -- --run              # Run tests once
npm run test -- --watch            # Watch mode
npm run test:ui                    # UI mode
```

---

## Error Handling Checklist

- [ ] Update `plataforma/settings.py` with exception handler
- [ ] Test backend returns RFC 7807 format:
  ```bash
  curl -X POST http://localhost:8000/api/v1/pacientes/ \
    -H 'Content-Type: application/json' \
    -d '{"email": "invalid"}'
  ```
  Should return:
  ```json
  {
    "type": "...",
    "status": 422,
    "title": "Validation Error",
    "validationErrors": { "email": "..." }
  }
  ```

- [ ] Update frontend components to use `ValidatedPacientesService`
- [ ] Test retry logic with server failures:
  ```bash
  # Simulate 503 error
  # Verify automatic retries happen
  # Verify exponential backoff delays
  ```

- [ ] Test validation error display
- [ ] Test auth error handling (401/403)

---

## Migration from Old Error Handling

**Before (Old Pattern):**
```typescript
try {
  const data = await fetch('/api/v1/pacientes/')
  const json = await data.json()
  // Hope json.message exists and makes sense
  console.log(json.message)
} catch (err) {
  console.log(err.message) // Unclear
}
```

**After (New Pattern):**
```typescript
const result = await ValidatedPacientesService.list()

if (result.success) {
  // Type-safe: result.data is Paciente[]
  console.log(result.data.results)
} else {
  // Structured error: RFC 7807
  console.log(result.error.title) // "Validation Error"
  console.log(result.error.validationErrors) // By field
  console.log(result.error.isRetryable()) // Smart retry
}
```

---

## Performance Impact

**Positive:**
- ✅ Automatic retries reduce user frustration
- ✅ Type-safe validation prevents bugs
- ✅ Clear error messages improve UX

**Minimal Overhead:**
- ~2KB for `api-error.ts`
- ~3KB for `retry.ts`
- Already have Zod installed (from Phase 2)

---

## Next Phase (4): API Client Enhancement

- Generic API client with TypeScript generics
- Query parameter builders
- Request/response interceptors
- Automatic caching

---

## Resources

- [RFC 7807: Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [Django REST Framework Exceptions](https://www.django-rest-framework.org/api-guide/exceptions/)
- [Zod: Runtime Type Validation](https://zod.dev)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
