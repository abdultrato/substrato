# 📊 MAPEAMENTO COMPLETO - SUBSTRATO ERP
## Exploração Exhaustiva da Arquitetura de CRUD Automático

---

## 🎯 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| **Total de Modelos** | 136 |
| **Total de Apps** | 27 |
| **Total de Endpoints** | 290+ |
| **Módulos com API** | 24 |
| **Arquitetura** | Django REST Framework + Next.js + OpenAPI/Swagger |

---

## 📦 MODELOS BACKEND (SAMPLE)

### Clinical (14 modelos)
- **Patient** ✅ endpoint - 57 campos (id, name, birth_date, blood_type, pregnant, address_*)
- **LabRequest** ✅ endpoint - 30 campos (patient, analyst, status, clinical_status)
- **LabExam** - 24 campos
- **Sample** ✅ endpoint - 24 campos
- **ResultItem** ✅ endpoint

### Accounting (7 modelos)
- **Account** ✅ endpoint - 16 campos (type, custom_id, name)
- **FinancialReconciliation** ✅ endpoint - 18 campos
- **LedgerEntry** - 23 campos (ledger lines, reversals)
- **LedgerLine** - 17 campos

### Nursing (8+ modelos)
- **Ward** ✅ endpoint - Enfermarias
- **NursingEvolution** ✅ endpoint - Evoluções de Enfermagem
- **Procedure** ✅ endpoint - Procedimentos
- **InternamentoEnfermaria** ✅ endpoint

### Pharmacy (8 modelos)
- **Product** ✅ endpoint - 30+ campos
- **Lot** ✅ endpoint - 25 campos
- **Sale** ✅ endpoint - 20+ campos
- **MaterialRequisition** ✅ endpoint

### Billing (3 modelos)
- **Invoice** ✅ endpoint - 25+ campos (patient, consultation, status, total)
- **InvoiceItem** ✅ endpoint - 20 campos
- **InvoiceHistory** ✅ endpoint

**... + 18 outros apps (consultations, payments, identity, equipment, etc)**

---

## 🔌 ENDPOINTS PRINCIPAIS

### Format: `GET|POST /api/v1/{modulo}/{modelo}/[{id}/]`

```
CLINICAL (34 endpoints)
├─ GET/POST    /api/v1/clinical/patient/
├─ GET/POST    /api/v1/clinical/labrequest/
├─ GET/POST    /api/v1/clinical/sample/
└─ GET/POST    /api/v1/clinical/exam/

CONSULTATIONS (23 endpoints)
├─ GET/POST    /api/v1/consultations/consultation/
├─ GET/POST    /api/v1/consultations/specialty/
└─ GET/POST    /api/v1/consultations/holiday/

ACCOUNTING (8 endpoints)
├─ GET/POST    /api/v1/accounting/account/
├─ GET/POST    /api/v1/accounting/entry/
└─ GET/POST    /api/v1/accounting/financialreconciliation/

NURSING (34 endpoints)
├─ GET/POST    /api/v1/nursing/procedure/
├─ GET/POST    /api/v1/nursing/ward/
└─ GET/POST    /api/v1/nursing/prescricaoenfermagem/

PHARMACY (25 endpoints)
├─ GET/POST    /api/v1/pharmacy/product/
├─ GET/POST    /api/v1/pharmacy/lot/
└─ GET/POST    /api/v1/pharmacy/sale/

BILLING (16 endpoints)
├─ GET/POST    /api/v1/billing/invoice/
└─ GET/POST    /api/v1/billing/invoiceitem/

... 18 módulos adicionais
```

**Todos suportam: GET (list/detail) | POST (create) | PUT (update) | DELETE (soft-delete) | PATCH (partial)**

---

## 🧩 AUTO FORM - GERADOR DE FORMULÁRIOS DINÂMICOS

### 📍 Localização
- **Arquivo**: `frontend-next/components/form/AutoForm.tsx` (900+ linhas)

### 🔄 Funcionamento

```typescript
// Uso
<AutoForm
  endpoint="/api/v1/clinical/patient/"
  method="post"
  submitLabel="Criar Paciente"
  onSuccess={(data) => router.push(`/patient/${data.id}`)}
  config={{
    etapas: [
      { titulo: "Dados Pessoais", campos: ["name", "birth_date", "gender"] },
      { titulo: "Endereço", campos: ["address_street", "address_city"] }
    ],
    labels: { name: "Nome Completo" },
    hints: { birth_date: "Formato: YYYY-MM-DD" }
  }}
/>
```

### 💡 Como Funciona (Arquitectura)

```
1. Recebe props: endpoint, method, initialValues, config
   ↓
2. Chama buildFormSpec(endpoint, method) → busca em schema.json
   ↓
3. Encontra path: /api/v1/clinical/patient/
   - Se POST → extrai requestBody.schema.components.schemas
   - Se PUT → extrai para update (sem id, created_at, etc)
   ↓
4. Mapeia tipos OpenAPI → tipos de formulário
   - string → text | select (if enum) | date (if format=date)
   - integer/number → input[type=number]
   - boolean → checkbox
   - array → comma-separated text
   ↓
5. Constrói schema Zod: z.object({ name: z.string(), ... })
   ↓
6. Renderiza campos com validação em tempo real
   ↓
7. User submete → valida Zod → POST/PUT com apiFetch
   ↓
8. Success/error toast + onSuccess callback
```

### 🎨 Tipos de Campo Suportados
- **text** - input[type=text]
- **number** - input[type=number]
- **integer** - input[type=number] com validação int
- **boolean** - input[type=checkbox]
- **date** - input[type=date] (formato ISO)
- **datetime** - input[type=datetime-local]
- **select** - <select> com enum values
- **array-string** - comma-separated text

### ✨ Features Avançadas
1. **Multi-step forms**: Valida apenas etapa atual, avança ao clicar "Seguinte"
2. **Read-only fields**: Campos não editáveis (id, created_at, updated_by)
3. **localStorage**: Lembra últimos valores em campos configurados
4. **Customização**: Labels, hints, placeholders, field order, widget tipo
5. **Validação dupla**: Client (Zod) + Server (DRF serializers)
6. **Enum labels**: Extrai de x-enumNames, x-choices, ou description do schema

### 🔌 Integração com ResourceFormConfig

```typescript
interface ResourceFormConfig {
  etapas?: Array<{ titulo: string; descricao?: string; campos: string[] }>
  labels?: Record<string, string>
  hints?: Record<string, string>
  placeholders?: Record<string, string>
  ordenarCampos?: string[]  // order de renderização
  esconderCampos?: string[] // ocultar alguns campos
  somenteLeituraCampos?: string[] // read-only específicos
  lembrarCampos?: string[] // persistir em localStorage
  widgets?: Record<string, "textarea" | ...> // override widget padrão
}
```

---

## 🔨 SCHEMA GENERATION - SINCRONIZAÇÃO API ↔ FRONTEND

### 📍 Localização
- **Script**: `generate_schema.py`
- **Output**: `frontend-next/schema.json` (42.359 linhas!)
- **Tipo**: OpenAPI 3.0.2

### 🔄 Funcionamento

```
generate_schema.py
  ↓
  os.environ['DJANGO_SETTINGS_MODULE'] = 'platform.settings'
  ↓
  from drf_spectacular.generators import SchemaGenerator
  ↓
  generator = SchemaGenerator(title="Substrato API", version="1.0.0")
  ↓
  schema = generator.get_schema(public=True, request=None)
  ↓
  Percorre todos os endpoints registrados em api/v1/routing/routes.py:
    - audit/*
    - clinical/* (34 endpoints)
    - consultations/* (23 endpoints)
    - accounting/* (8 endpoints)
    - nursing/* (34 endpoints)
    - pharmacy/* (25 endpoints)
    - billing/* (16 endpoints)
    - ... 18 mais
  ↓
  Para cada viewset:
    - Extrai serializer classes
    - Mapeia campos Django → tipos OpenAPI
    - Gera requestBody schema (POST/PUT/PATCH)
    - Gera responseBody schema (GET/200)
  ↓
  Compila em um JSON único com todas as 290+ rotas
  ↓
  json.dump(schema, f, indent=2, cls=DjangoJSONEncoder)
  ↓
  Salva em: frontend-next/schema.json
```

### 📋 Estrutura do schema.json

```json
{
  "openapi": "3.0.2",
  "info": { "title": "Substrato API", "version": "1.0.0" },
  "paths": {
    "/api/v1/clinical/patient/": {
      "post": {
        "requestBody": {
          "schema": { "$ref": "#/components/schemas/PatientCreate" }
        },
        "responses": { "201": { "schema": { "$ref": "..." } } }
      },
      "get": { ... }
    },
    "/api/v1/clinical/patient/{id}/": { ... }
  },
  "components": {
    "schemas": {
      "PatientCreate": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "birth_date": { "type": "string", "format": "date" },
          "blood_type": { 
            "enum": ["O-", "O+", "A-", "A+", "AB-", "AB+"],
            "x-enumNames": ["O Negativo", "O Positivo", ...],
            "x-choices": ["O-", "O+", ...]
          }
        },
        "required": ["name", "birth_date"]
      }
    }
  }
}
```

### 🎯 Quando Executar
- ✅ Build time: `npm run build` (chamado automaticamente)
- ✅ Desenvolvimento: `python manage.py generate_schema.py` (manual)
- ✅ CI/CD: Pipeline automático antes de deploy

---

## 🚀 FLUXO CRUD COMPLETO - EXEMPLO: PATIENT

### CREATE - Criar novo paciente

```
User clica "Novo Paciente"
  ↓
<AutoForm 
  endpoint="/api/v1/clinical/patient/" 
  method="post"
  config={{ etapas: [...] }}
/>
  ↓
AutoForm busca schema.json → encontra "/api/v1/clinical/patient/"
  ↓
Extrai requestBody schema:
  - name: string (required)
  - birth_date: date (required)
  - gender: enum [M, F] (required)
  - blood_type: enum [O+, A-, ...] (optional)
  - address_street: string (optional)
  - address_city: string (optional)
  ↓
Renderiza formulário com campos
  ↓
User preenche:
  - Name: "João Silva"
  - Birth Date: 1980-05-15
  - Gender: Male
  - Blood Type: O+
  ↓
Valida com Zod no cliente
  ↓
POST /api/v1/clinical/patient/
{
  "name": "João Silva",
  "birth_date": "1980-05-15",
  "gender": "M",
  "blood_type": "O+"
}
  ↓
Backend (Django REST Framework):
  - Valida com PatientSerializer
  - Cria Patient instance
  - Gera custom_id (PAC-000456)
  - Atribui tenant automaticamente
  ↓
Response 201:
{
  "id": 789,
  "custom_id": "PAC-000456",
  "name": "João Silva",
  "birth_date": "1980-05-15",
  "gender": "M",
  "blood_type": "O+",
  "created_at": "2026-05-22T10:30:00Z",
  "updated_at": "2026-05-22T10:30:00Z"
}
  ↓
Toast: "Paciente criado com sucesso"
Redirecionamento: /patient/789
```

### READ - Listar pacientes

```
GET /api/v1/clinical/patient/?page=1&page_size=20

Response:
{
  "count": 450,
  "next": "?page=2",
  "results": [
    { "id": 1, "custom_id": "PAC-000001", "name": "...", ... },
    { "id": 2, "custom_id": "PAC-000002", "name": "...", ... }
  ]
}
```

### UPDATE - Editar paciente existente

```
User clica editar no patient ID=789
  ↓
GET /api/v1/clinical/patient/789/
  ↓
<AutoForm
  endpoint="/api/v1/clinical/patient/"
  method="put"
  initialValues={pacientData}
  config={{ somenteLeituraCampos: ["id", "created_at"] }}
/>
  ↓
AutoForm renderiza com valores preenchidos
Campos read-only: id, created_at, created_by
  ↓
User edita "blood_type" de "O+" para "A-"
  ↓
PUT /api/v1/clinical/patient/789/
{
  "name": "João Silva",
  "birth_date": "1980-05-15",
  "gender": "M",
  "blood_type": "A-"
}
  ↓
Backend salva alterações
  ↓
Response 200: dados atualizados com updated_at novo
  ↓
Toast: "Paciente atualizado com sucesso"
```

### DELETE - Deletar paciente

```
User clica "Deletar"
  ↓
Modal de confirmação: "Tem certeza?"
  ↓
DELETE /api/v1/clinical/patient/789/
  ↓
Backend (soft-delete):
  - UPDATE clinico_paciente SET deleted=true, deleted_at=now(), deleted_by=user
  ↓
Response 204 No Content
  ↓
Toast: "Paciente deletado com sucesso"
Redirecionamento: /patients
```

---

## 🏗️ STACK TECNOLÓGICO

### Backend
- **Django 4.2+** - Web framework
- **Django REST Framework** - API REST
- **drf-spectacular** - OpenAPI/Swagger generation
- **PostgreSQL** - Database
- **Celery + Redis** - Task queue & caching
- **Docker** - Containerization

### Frontend
- **Next.js 14+** - React framework
- **React 18+** - UI library
- **TypeScript** - Type safety
- **Zod** - Validation schemas
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library

### Observabilidade
- **Prometheus** - Metrics
- **Grafana** - Dashboards
- **Sentry** - Error tracking

---

## ⚙️ INFORMAÇÕES TÉCNICAS

### Multi-tenant
```python
# Derivado automaticamente de request.tenant (usuário logado)
patient.tenant = request.tenant  # Não é editável via API
```

### Soft-Delete (Padrão)
```python
class Patient(CoreModel):
    deleted: BooleanField  # True = deletado
    deleted_at: DateTimeField  # Quando foi deletado
    deleted_by: ForeignKey(User)  # Quem deletou
    
    # Query: Patient.objects.filter(deleted=False)
```

### Campos Read-Only Padrão
```
id, custom_id, created_at, updated_at, created_by, 
updated_by, deleted, deleted_at, deleted_by, tenant, version
```

### Versionamento Automático
```python
class Patient(CoreModel):
    version: PositiveIntegerField
    # Incrementa a cada update
```

### RBAC (Role-Based Access Control)
```python
# Todos os endpoints têm RBACPermission
# Verifica: user.groups, user.roles, object-level permissions
```

---

## 📝 PARA GERAR SEUS 50+ PÁGINAS DE CRUD

### 1️⃣ Escolha um Modelo
```
Opção: clinical/Patient ou billing/Invoice ou pharmacy/Product
```

### 2️⃣ Use o Arquivo SUBSTRATO_MAPEAMENTO_COMPLETO.json
```
Você encontrará:
- Todos os 136 modelos com campos
- Todos os 290+ endpoints
- AutoForm documentado
- Schema generation explained
```

### 3️⃣ Padrão para Cada Página
```
CREATE: GET formulário vazio + POST para salvar
READ: GET lista + GET detalhe
UPDATE: GET item + PUT para atualizar
DELETE: DELETE com soft-delete
LIST: GET com paginação, filtros, busca
```

### 4️⃣ Reutilize o AutoForm
```typescript
// Sempre assim:
<AutoForm
  endpoint="/api/v1/{modulo}/{modelo}/"
  method="post|put"
  config={resourceConfig}
/>
```

---

## 📂 ARQUIVOS PRINCIPAIS

```
c:\Users\Laboratorio.Pemba\Contacts\substrato\
├── SUBSTRATO_MAPEAMENTO_COMPLETO.json ← SEU MAPA!
├── mapeamento_completo.json           ← Dados brutos
├── frontend-next/schema.json          ← 290 endpoints OpenAPI
├── generate_schema.py                 ← Gerador de schema
├── frontend-next/components/form/AutoForm.tsx ← Formulário dinâmico
├── api/v1/routing/routes.py           ← Registro de endpoints
└── apps/*/models.py                   ← 136 modelos Django
```

---

**Gerado: 22-05-2026**
**Total de Linhas em schema.json: 42.359**
**Endpoints únicos: 290+**
**Modelos Django: 136**

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Mantém o mapa visual do produto alinhado com módulos, rotas, workspaces e prioridades de implementação.

**Valor que protege.** Protege navegação coerente e evita que funcionalidades maduras fiquem escondidas ou duplicadas na interface.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve reflectir o que será demonstrado em tenants piloto e o que ainda é experimental.

**Para production-ready.** Exige rastreabilidade entre mapa visual, rotas reais, permissões, módulos activos e documentação de frontend.
