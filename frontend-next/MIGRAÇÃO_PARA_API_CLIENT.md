# 🔄 Guia de Migração: Tipos Manuais → API Client Gerado

## 📋 Overview

Após a FASE 1, você tem dois sistemas de tipos:
- **❌ ANTIGO:** `lib/types/` com tipos manuais
- **✅ NOVO:** `lib/api-client/` com tipos gerados do OpenAPI

Este guia mostra como migrar gradualmente.

---

## 🎯 Prioridades de Migração

### Alta Prioridade (Crítico)
- [ ] `Paciente` (usado em 4+ arquivos)
- [ ] `Exame`
- [ ] `RequisicaoAnalise` / `Requisicao`
- [ ] `TokenResponse`

### Média Prioridade
- [ ] `Fatura`
- [ ] `Resultado`
- [ ] `Entidade`

### Baixa Prioridade
- [ ] Tipos menos usados

---

## 📚 Exemplos de Migração

### ANTES: Usando Tipos Manuais

```typescript
// lib/types/paciente.ts (manual)
export type Paciente = {
  id: number
  nome: string
  email?: string
  data_nascimento?: string
}

// app/pacientes/page.tsx
import { Paciente } from '@/lib/types/paciente'

async function carregar() {
  const data: Paciente[] = await apiFetch("/pacientes/")  // ❌ tipo manual
  setState(data)
}
```

### DEPOIS: Usando API Client Gerado

```typescript
// app/pacientes/page.tsx
import { PacientesService } from '@/lib/api-client/services/PacientesService'
import type { Paciente } from '@/lib/api-client/models/Paciente'

async function carregar() {
  const response = await PacientesService.clinicoPacientesList()  // ✅ tipado
  setState(response.results || [])  // ✅ tipo validado
}
```

---

## 🔧 Como Migrar Cada Arquivo

### 1. Instalar Dependências Faltantes

```bash
npm install @tanstack/react-query  # Se ainda não tiver
```

### 2. Atualizar Imports

#### Pacientes

```typescript
// ❌ ANTES
import { Paciente, PacienteCreateDTO } from '@/lib/types'

// ✅ DEPOIS
import type { Paciente } from '@/lib/api-client/models/Paciente'
import { PacientesService } from '@/lib/api-client/services/PacientesService'

// Para criar novo:
type PacienteCreateDTO = Omit<Paciente, 'id' | 'criado_em'>
```

#### Exames

```typescript
// ❌ ANTES
import { Exame } from '@/lib/types'

// ✅ DEPOIS
import type { Exame } from '@/lib/api-client/models/Exame'
import { ExamesService } from '@/lib/api-client/services/ExamesService'
```

### 3. Atualizar Chamadas de API

#### Listar

```typescript
// ❌ ANTES
const data = await apiFetch('/pacientes/')

// ✅ DEPOIS
const response = await PacientesService.clinicoPacientesList(
  search,    // filtro
  ordering   // ordenação
)
const pacientes = response.results || []
```

#### Criar

```typescript
// ❌ ANTES
await apiFetch('/pacientes/', { 
  method: 'POST', 
  body: JSON.stringify(newPaciente) 
})

// ✅ DEPOIS
await PacientesService.clinicoPacientesCreate(newPaciente)
```

#### Atualizar

```typescript
// ❌ ANTES
await apiFetch(`/pacientes/${id}/`, { 
  method: 'PATCH', 
  body: JSON.stringify(partial) 
})

// ✅ DEPOIS
await PacientesService.clinicoPacientesPartialUpdate(id, partial)
```

#### Deletar

```typescript
// ❌ ANTES
await apiFetch(`/pacientes/${id}/`, { method: 'DELETE' })

// ✅ DEPOIS
await PacientesService.clinicoPacientesDestroy(id)
```

---

## 🎣 Migrar Hooks

### Exemplo: Hook de Pacientes

#### ANTES

```typescript
// hooks/usePacientes.ts
export function usePacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])

  useEffect(() => {
    apiFetch('/pacientes/').then(data => {
      setPacientes(data || [])
    })
  }, [])

  return { pacientes }
}
```

#### DEPOIS

```typescript
// hooks/usePacientesTyped.ts (já criado!)
import { usePacientesTyped } from '@/hooks/usePacientesTyped'

export function usePacientes() {
  const { pacientes } = usePacientesTyped()
  return { pacientes }
}

// Ou usar direto:
const { pacientes, loading, error } = usePacientesTyped()
```

---

## 🔐 Configuração de Token

O novo API client precisa saber como obter o token JWT:

```typescript
// lib/api-client/core/OpenAPI.ts (editável)
export const OpenAPI = {
  BASE: '/api/v1',
  VERSION: '1.0.0',
  WITH_CREDENTIALS: true,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
  TOKEN: async () => {
    // ✅ Aqui você coloca o token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token') || ''
    }
    return ''
  },
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS_RESOLVER: undefined,
  MIDDLEWARE: undefined,
}
```

Ou use o hook já configurado:
```typescript
import { usePacientesTyped } from '@/hooks/usePacientesTyped'
// Já tem OpenAPI.TOKEN configurado!
```

---

## 📈 Progresso de Migração

| Arquivo | Status | Prioridade | Notas |
|---------|--------|-----------|-------|
| app/pacientes/** | ❌ TODO | 🔴 Alta | Usar PacientesService |
| app/exames/** | ❌ TODO | 🔴 Alta | Usar ExamesService |
| app/requisicoes/** | ❌ TODO | 🔴 Alta | Usar RequisicaoService (criar) |
| hooks/usePacientes* | ❌ TODO | 🟠 Média | Usar hook usePacientesTyped |
| hooks/useExames | ❌ TODO | 🟠 Média | Criar useExamesTyped |
| lib/types/ | 🟨 Partial | 🟡 Baixa | Manter por enquanto, deprecate depois |

---

## ✅ Checklist de Migração

- [ ] Instalar `@tanstack/react-query` (se precisar)
- [ ] Migrar imports de `Paciente`
- [ ] Atualizar app/pacientes/* para usar PacientesService
- [ ] Testar CRUD de Pacientes
- [ ] Migrar Exame
- [ ] Migrar Requisição
- [ ] Atualizar hooks customizados
- [ ] Deletar lib/types/ (quando tudo migrado)

---

## 🆘 Troubleshooting

### Erro: "Cannot find module '@/lib/api-client'"

**Solução:** Regenerar tipos
```bash
npm run generate:api
```

### Erro: "Type 'any' is not assignable to type 'Paciente'"

**Solução:** Use type-casting ou valide os dados
```typescript
const data = response as Paciente
// ou
const { pacientes } = usePacientesTyped()  // Já tipado
```

### Token não está sendo enviado

**Solução:** Configure OpenAPI.TOKEN
```typescript
OpenAPI.TOKEN = async () => localStorage.getItem('access_token') || ''
```

---

## 🚀 Próximo Passo

Após migrar para o novo API client, a FASE 2 adicionará:
- Validação com Zod
- Error handling padrão
- Retry logic automático
- Interceptadores HTTP

