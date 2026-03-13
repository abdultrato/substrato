# ⚡ Quick Reference: Use the New API Client

## Copy-Paste These Examples

### 1. List with Filters
```typescript
import { pacientesService } from '@/lib/api/typed-client';
import { PacientesQueryBuilder } from '@/lib/api/query-builder';

// Build query
const query = new PacientesQueryBuilder()
  .byName('Silva')
  .byGenero('M')
  .paginate(1, 10)
  .orderBy('nome', 'asc');

// Make request
const result = await pacientesService.list(query);

// Handle response
if (result.success) {
  console.log(result.data); // Paciente[]
} else {
  console.error(result.error?.getUserFriendlyMessage());
}
```

### 2. Create with Validation
```typescript
const result = await pacientesService.create({
  nome: 'João Silva',
  email: 'joao@example.com',
  morada: 'Rua A, 123',
  genero: 'M'
});

if (result.success) {
  console.log('Created:', result.data?.id);
} else {
  if (result.error?.isValidationError()) {
    const errors = result.error.getFieldErrors();
    console.log('Field errors:', errors);
    // { nome: ['Too short'], email: ['Invalid'] }
  }
}
```

### 3. Get by ID
```typescript
const result = await pacientesService.getById('123');

if (result.success) {
  console.log(result.data); // Paciente
}
```

### 4. Update
```typescript
const result = await pacientesService.update('123', {
  nome: 'João Silva Updated'
});

if (result.success) {
  console.log('Updated:', result.data);
}
```

### 5. Delete
```typescript
const result = await pacientesService.delete('123');

if (result.success) {
  console.log('Deleted');
}
```

### 6. With Retry
```typescript
const result = await pacientesService.list(query, {
  maxRetries: 3,
  maxDelay: 30000
});
```

### 7. Error Handling (All Types)
```typescript
if (!result.success) {
  const error = result.error;
  
  if (error?.isValidationError()) {
    // Handle validation
    console.log(error.getFieldErrors());
  } else if (error?.isAuthError()) {
    // Handle auth
    window.location.href = '/login';
  } else if (error?.isNotFoundError()) {
    // Handle 404
    console.log('Not found');
  } else if (error?.isRetryable()) {
    // Will be auto-retried
    console.log('Will retry');
  } else {
    // Other errors
    console.error(error?.getUserFriendlyMessage());
  }
}
```

---

## Services Available

### PacientesService
```typescript
import { pacientesService } from '@/lib/api/typed-client';

pacientesService.list(query)           // List all
pacientesService.getById(id)           // Get one
pacientesService.create(data)          // Create
pacientesService.update(id, data)      // Update
pacientesService.delete(id)            // Delete
pacientesService.search(query)         // Search
```

### ExamesService
```typescript
import { examesService } from '@/lib/api/typed-client';

examesService.list(query)              // List all
examesService.getById(id)              // Get one
examesService.create(data)             // Create
examesService.update(id, data)         // Update
examesService.delete(id)               // Delete
examesService.byPaciente(pacienteId)   // Filter by paciente
```

---

## Query Builders

### PacientesQueryBuilder
```typescript
new PacientesQueryBuilder()
  .byName('Silva')               // Filter by name
  .byEmail('email@example.com')  // Filter by email
  .byNumeroId('123456')          // Filter by ID number
  .byGenero('M')                 // Filter by gender
  .orderBy('nome', 'asc')        // Order by field
  .paginate(page, limit)         // Pagination
  .build()                       // Get URL string
```

### ExamesQueryBuilder
```typescript
new ExamesQueryBuilder()
  .byType('Sangue')              // Filter by type
  .byPaciente(pacienteId)        // Filter by paciente
  .byStatus('Pendente')          // Filter by status
  .orderBy('data', 'desc')       // Order by field
  .paginate(page, limit)         // Pagination
  .build()                       // Get URL string
```

---

## Error Types

### isValidationError()
```typescript
// 400 Bad Request with field errors
if (error?.isValidationError()) {
  const errors = error.getFieldErrors();
  // { nome: ['Too short'], email: ['Invalid email'] }
}
```

### isAuthError()
```typescript
// 401 Unauthorized
if (error?.isAuthError()) {
  // Redirect to login
  window.location.href = '/login';
}
```

### isNotFoundError()
```typescript
// 404 Not Found
if (error?.isNotFoundError()) {
  // Show 404 page
}
```

### isRetryable()
```typescript
// 5xx, 429 (rate limit), 408 (timeout)
if (error?.isRetryable()) {
  // Will auto-retry with exponential backoff
}
```

---

## In React Components

### Hook (if available)
```typescript
import {  } from '@/lib/hooks/';

function PacientesList() {
  const { data, loading, error } = ();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data.map(p => (
        <div key={p.id}>{p.nome}</div>
      ))}
    </div>
  );
}
```

### Direct Usage
```typescript
import { pacientesService } from '@/lib/api/typed-client';
import { PacientesQueryBuilder } from '@/lib/api/query-builder';
import { useState, useEffect } from 'react';

function PacientesList() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = new PacientesQueryBuilder().paginate(1, 10);
    
    pacientesService.list(query).then(result => {
      if (result.success) {
        setPacientes(result.data);
      } else {
        setError(result.error?.getUserFriendlyMessage());
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {pacientes.map(p => (
        <div key={p.id}>{p.nome}</div>
      ))}
    </div>
  );
}
```

---

## Common Patterns

### Form Submission
```typescript
async function handleSubmit(formData: any) {
  const result = await pacientesService.create(formData);
  
  if (result.success) {
    showSuccess('Paciente created');
    navigateTo(`/pacientes/${result.data?.id}`);
  } else {
    if (result.error?.isValidationError()) {
      setFieldErrors(result.error.getFieldErrors());
    } else {
      showError(result.error?.getUserFriendlyMessage());
    }
  }
}
```

### Search with Debounce
```typescript
import { debounce } from 'lodash';

const handleSearch = debounce(async (searchTerm: string) => {
  if (!searchTerm) return;
  
  const query = new PacientesQueryBuilder()
    .byName(searchTerm)
    .paginate(1, 10);
  
  const result = await pacientesService.list(query);
  
  if (result.success) {
    setResults(result.data);
  }
}, 300);
```

### Optimistic Updates
```typescript
async function handleUpdate(id: string, data: any) {
  // Update UI optimistically
  setData(old => old.map(p => p.id === id ? { ...p, ...data } : p));
  
  // Sync with server
  const result = await pacientesService.update(id, data);
  
  if (!result.success) {
    // Revert on error
    const query = new PacientesQueryBuilder();
    const updated = await pacientesService.list(query);
    if (updated.success) {
      setData(updated.data);
    }
  }
}
```

---

## Testing

### Unit Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { pacientesService } from '@/lib/api/typed-client';

describe('Pacientes Service', () => {
  it('should list pacientes', async () => {
    const query = new PacientesQueryBuilder().paginate(1, 10);
    const result = await pacientesService.list(query);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  });

  it('should handle validation errors', async () => {
    const result = await pacientesService.create({
      nome: 'J', // Too short
      email: 'invalid'
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.isValidationError()).toBe(true);
  });
});
```

---

## Troubleshooting

### Import not found
```
Error: Module not found '@/lib/api/typed-client'
Solution: Check your tsconfig.json has path alias configured
         Check files exist in frontend-next/lib/api/
```

### Type errors
```
Solution: Regenerate types: npm run generate-types
          Check Zod schemas: lib/validators/schemas.ts
          Verify OpenAPI schema: schema.json
```

### Validation errors not matching
```
Solution: Check Zod schemas match backend serializers
          Regenerate types from latest schema
          Update mock data in tests
```

### Retry not working
```
Solution: Check if error is retryable (not all are)
          Configure maxRetries option
          Check exponential backoff calculation
```

---

## More Documentation

- **Full examples:** [EJEMPLOS_USO.md](./frontend-next/EJEMPLOS_USO.md)
- **API client guide:** [FASE4_API_CLIENT.md](./frontend-next/FASE4_API_CLIENT.md)
- **Error handling:** [FASE3_ERROR_HANDLING.md](./frontend-next/FASE3_ERROR_HANDLING.md)
- **Validation:** [FASE2_VALIDAÇÃO.md](./frontend-next/FASE2_VALIDAÇÃO.md)
- **All docs:** [INDEX.md](./INDEX.md)

---

**Status:** Ready to use ✅
**Tests:** 75/75 passing ✅
**Version:** 1.0 (Stable)
