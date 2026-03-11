# FASE 4: Generic API Client Implementation Guide

## Overview

This phase introduces a **type-safe, reusable generic API client** with built-in support for:
- Zod schema validation
- RFC 7807 error handling
- Automatic retry logic
- Request/response interceptors
- Query parameter builders
- TypeScript generics for full type safety

**Score Target**: 91 → 93/100 (+2 points)

---

## What's New in FASE 4

### 1. Generic API Client (`lib/api/api-client.ts`)

Instead of writing API calls manually, use the `ApiClient` class:

```typescript
import { ApiClient, createApiClient } from '@/lib/api/api-client'
import { PacienteSchema } from '@/lib/validators/schemas'

// Create client
const client = createApiClient({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
  retryOptions: { maxRetries: 3 },
})

// Make type-safe request
const result = await client.get(
  '/api/v1/pacientes/1',
  PacienteSchema,
  { retryOptions: { maxRetries: 5 } }
)

console.log(result.data.nome) // Type-safe!
```

**Key Features:**
- ✅ Generic `<T>` for type safety
- ✅ Automatic Zod validation
- ✅ Built-in retry logic
- ✅ RFC 7807 error handling
- ✅ Request/response/error interceptors
- ✅ Query parameter support
- ✅ Timeout handling with AbortController

### 2. Query Parameter Builder (`lib/api/query-builder.ts`)

Type-safe query building without string concatenation:

```typescript
import { QueryBuilders } from '@/lib/api/query-builder'

// Generic builder
const qb = QueryBuilders.generic()
  .paginate(10, 0)
  .search('João')
  .orderBy('created', 'desc')
  .param('status', 'active')

// Domain-specific builders
const pacQb = QueryBuilders.pacientes()
  .byGenero('M')
  .search('silva')
  .byNewest()
  .paginate(20)

const exameQb = QueryBuilders.exames()
  .byPaciente(123)
  .byStatus('completed')
  .defaultOrder()

// Use with client
const result = await client.get(
  '/api/v1/pacientes/',
  PacienteSchema.array(),
  { params: pacQb.build() }
)
```

**Query Builder Methods:**
- `paginate(limit, offset)` - Paginação
- `filter(filters)` / `filterBy(key, value)` - Filtros
- `search(query)` - Busca
- `orderBy(field, order)` - Ordenação
- `param(key, value)` - Parâmetro customizado
- `build()` - Obter objeto params
- `toSearchParams()` - URLSearchParams
- `toString()` - Query string

**Domain-Specific Builders:**

`PacientesQueryBuilder`:
- `.byName(name)`
- `.byEmail(email)`
- `.byNumeroId(id)`
- `.byGenero(genero)`
- `.defaultOrder()` → nome ASC
- `.byNewest()` → criado_em DESC

`ExamesQueryBuilder`:
- `.byType(type)`
- `.byPaciente(id)`
- `.byStatus(status)`
- `.defaultOrder()` → tipo ASC
- `.byNewest()` → criado_em DESC

### 3. Typed API Services (`lib/api/typed-client.ts`)

Domain-specific services using the generic client:

```typescript
import { PacientesService, ExamesService } from '@/lib/api/typed-client'
import { QueryBuilders } from '@/lib/api/query-builder'

const pacientes = new PacientesService()

// Type-safe methods
const result = await pacientes.list(
  QueryBuilders.pacientes().byGenero('F').paginate(10),
  { maxRetries: 5 }
)

if (result.status === 200) {
  result.data.results.forEach(p => {
    console.log(p.nome) // Type-safe!
  })
}

// Single item
const paciente = await pacientes.getById(123)
console.log(paciente.data.email)

// Create with validation
const newPaciente = await pacientes.create({
  nome: 'João Silva',
  email: 'joao@example.com',
  // ... required fields
})

// Update
await pacientes.update(123, {
  nome: 'João Carlos',
})

// Delete
await pacientes.delete(123)

// Search helper
const searchResults = await pacientes.search('silva', 10)

// Add custom interceptor
pacientes.addRequestInterceptor((config) => {
  config.headers['Authorization'] = `Bearer ${token}`
  return config
})
```

---

## API Client Architecture

### Request Flow

```
┌─────────────────────────────────────────────────────┐
│ Client Method (get/post/patch/delete)               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Request Interceptors                                │
│ - Add auth headers                                  │
│ - Add logging                                       │
│ - Transform request                                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ withRetry() Wrapper                                 │
│ - Exponential backoff                               │
│ - Smart retry detection                             │
│ - jitter                                            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ fetch() with AbortController                        │
│ - Timeout handling                                  │
│ - Query parameter encoding                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Response Interceptors                               │
│ - Log response                                      │
│ - Transform response                                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ RFC 7807 Error Parsing (if !ok)                     │
│ - parseResponseError()                              │
│ - Throw ApiError                                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Parse JSON                                          │
│ - Handle 204 No Content                             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Zod Validation                                      │
│ - schema.parseAsync()                               │
│ - Throw if invalid                                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Return ApiResponse<T>                               │
│ - data: T (validated)                               │
│ - status: number                                    │
│ - headers: Record<string, string>                   │
└─────────────────────────────────────────────────────┘
```

### Error Handling Flow

```
┌──────────────────────────────────┐
│ Request fails or response !ok     │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Error Interceptors               │
│ - Log error                      │
│ - Transform error                │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ withRetry() evaluates:           │
│ - error.isRetryable()            │
│ - attempt < maxRetries           │
└────────────┬─────────────────────┘
             │
       ┌─────┴─────┐
       │            │
      YES          NO
       │            │
       ▼            ▼
    Retry        Throw
    (with      (ApiError)
   backoff)
```

---

## Usage Examples

### Example 1: Fetch List with Filters

```typescript
'use client'

import { PacientesService } from '@/lib/api/typed-client'
import { QueryBuilders } from '@/lib/api/query-builder'
import { useState, useEffect } from 'react'

export function PacientesList() {
  const [pacientes, setPacientes] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPacientes()
  }, [])

  async function loadPacientes() {
    const service = new PacientesService()
    const query = QueryBuilders.pacientes()
      .byGenero('M')
      .paginate(10)
      .defaultOrder()

    const result = await service.list(query)

    if (result.status === 200) {
      setPacientes(result.data.results)
    } else {
      setError(result) // ApiError
    }
  }

  // Render...
}
```

### Example 2: Create with Validation

```typescript
async function createPaciente(formData: FormData) {
  const service = new PacientesService()

  try {
    const result = await service.create({
      nome: formData.get('nome') as string,
      email: formData.get('email') as string,
      data_nascimento: formData.get('data_nascimento') as string,
      // ... other fields
    })

    if (result.status === 201) {
      console.log('Paciente created:', result.data.id)
      return result.data
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Validation errors:', error.validationErrors)
    }
  }
}
```

### Example 3: Add Authentication

```typescript
const service = new PacientesService()

// Add auth interceptor
service.addRequestInterceptor((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Now all requests include the token
const result = await service.list()
```

### Example 4: Search with Retry

```typescript
const service = new PacientesService()

const result = await service.search('silva', 20, {
  maxRetries: 5,
  initialDelayMs: 500,
  onRetry: (error, attempt, delay) => {
    console.log(`Retry #${attempt} in ${delay}ms`)
  },
})
```

---

## File Structure

```
frontend-next/
├── lib/api/
│   ├── api-client.ts          # Generic ApiClient class
│   ├── api-error.ts           # RFC 7807 error handling (FASE 3)
│   ├── validated-client.ts    # Old pattern (backward compatible)
│   ├── typed-client.ts        # NEW: Domain services using generic client
│   └── query-builder.ts       # NEW: Type-safe query builders
├── __tests__/
│   ├── api-client.test.ts     # NEW: 39 tests
│   ├── retry.test.ts          # 18 tests (FASE 3)
│   └── validators.test.ts     # 18 tests (FASE 2)
└── FASE4_API_CLIENT.md        # This documentation
```

---

## Testing

**Test Coverage:** 39 new test cases

```bash
npm run test -- --run __tests__/api-client.test.ts
```

**Test Categories:**

1. **QueryBuilder (14 tests)**
   - Generic builder: paginate, filter, search, orderBy, params
   - PacientesQueryBuilder: byName, byEmail, byGenero, etc.
   - ExamesQueryBuilder: byType, byPaciente, byStatus
   - Chain methods and conversions

2. **ApiClient (25 tests)**
   - GET/POST/PATCH/DELETE requests
   - Zod schema validation
   - Query parameters
   - Request/response/error interceptors
   - Response status handling

---

## Migration from FASE 3

**Before (ValidatedPacientesService):**
```typescript
const result = await ValidatedPacientesService.list()
```

**After (PacientesService with QueryBuilder):**
```typescript
const service = new PacientesService()
const query = QueryBuilders.pacientes().paginate(10)
const result = await service.list(query)
```

**Benefits:**
- ✅ More flexible query building
- ✅ Reusable across components
- ✅ Type-safe parameter construction
- ✅ Less boilerplate
- ✅ Domain-specific builders

---

## Performance Impact

**Bundle Size:**
- `api-client.ts` - ~7.2KB
- `query-builder.ts` - ~4.7KB
- Total new code - ~12KB (minified ~4KB)

**Runtime:**
- No overhead vs manual fetch
- Reuses existing Zod and retry logic
- Lazy initialization of services

---

## Next Phase (5): Enhanced Serializers

- Improve Django serializers with extra_kwargs
- Add field documentation (help_text)
- Extend schema with @extend_schema decorators
- Regenerate OpenAPI schema with better docs

---

## Comparison: FASE 3 vs FASE 4

| Feature | FASE 3 | FASE 4 |
|---------|--------|--------|
| Validation | ✅ Zod | ✅ Zod (same) |
| Error Handling | ✅ RFC 7807 | ✅ RFC 7807 (same) |
| Retry Logic | ✅ Yes | ✅ Yes (same) |
| Query Building | ❌ Manual | ✅ QueryBuilder |
| Type Safety | ✅ Partial | ✅ Full (generics) |
| Reusability | ❌ Per entity | ✅ Generic client |
| Interceptors | ❌ No | ✅ Request/Response/Error |
| API Services | ❌ Single | ✅ Multiple domain services |

---

## Key Concepts

### Discriminated Union
```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error }
```

### Generic Constraints
```typescript
async get<T>(
  url: string,
  schema: z.ZodSchema<T>, // Type constraint
  options?: RequestOptions
): Promise<ApiResponse<T>>
```

### Method Chaining
```typescript
QueryBuilder
  .paginate(10)        // Returns this
  .search('test')      // Returns this
  .orderBy('name')     // Returns this
  .build()             // Returns params
```

---

## Troubleshooting

**"Response validation failed"**
→ Response structure doesn't match Zod schema
→ Check backend serializer output

**"Too many retries"**
→ Server keeps returning 5xx errors
→ Check server logs for actual issue

**"Query parameters not applied"**
→ Use `params: qb.build()` in request options
→ Or use service method wrapper

---

## Resources

- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Fetch API with AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [Chain Methods Pattern](https://en.wikipedia.org/wiki/Method_chaining)
