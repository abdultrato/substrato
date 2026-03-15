# 📚 API Documentation - Swagger/OpenAPI

## 🎯 Visão Geral

A API Substrato possui documentação automática gerada pelo **drf-spectacular** (OpenAPI 3.0):

```
GET /api/schema/              → Schema OpenAPI JSON
GET /api/docs/                → Swagger UI (interativo)
GET /api/redoc/               → ReDoc (documentação limpa)
```

---

## 🌐 Acessar Documentação

### 1. **Swagger UI** (Recomendado)
```
http://localhost:8000/api/docs/
```

**Características**:
- ✅ Interface interativa
- ✅ Try it out (testar endpoints)
- ✅ Autenticação JWT integrada
- ✅ Response examples
- ✅ Parameter validation

### 2. **ReDoc**
```
http://localhost:8000/api/redoc/
```

**Características**:
- ✅ Documentação limpa e bem formatada
- ✅ Fácil navegação
- ✅ Search integrado
- ✅ Ideal para visualização em mobile

### 3. **Raw OpenAPI Schema**
```
http://localhost:8000/api/schema/
```

**Características**:
- ✅ JSON puro compatível com ferramentas
- ✅ Postman import
- ✅ Código generator

---

## 🔐 Autenticação na Documentação

### Copiar seu Token JWT

1. Fazer login via:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "seu_usuario",
    "password": "sua_senha"
  }'
```

Resposta:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Adicionar no Swagger

1. Clique no botão **"Authorize"** (cadeado no topo)
2. Cole o token em **"Bearer Token"**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
3. Clique em **"Authorize"**
4. Agora todos endpoints autenticados funcionam

### Endpoints de Auth (JWT)
- `POST /api/v1/auth/login/` → retorna `access` e `refresh`
- `POST /api/v1/auth/refresh/` → renova `access`
- `POST /api/v1/auth/logout/` → logout stateless (cliente remove token)
- `GET /api/v1/auth/user/` → dados do usuário logado (groups + foto_url)
- `PATCH /api/v1/auth/user/` → atualizar perfil (nome/apelido/e-mail/telefone/foto; aceita `multipart/form-data`)
- `POST /api/v1/auth/password/change/` → alterar palavra-passe (logado)
- `POST /api/v1/auth/password-reset/request/` → solicitar código de reposição (e-mail/WhatsApp)
- `POST /api/v1/auth/password-reset/confirm/` → confirmar reposição com código + nova palavra-passe

### Endpoints úteis (PDF/Relatórios)
- Resultados (LAB): `GET /api/v1/clinico/requisicaoanalise/<id>/pdf_resultados/`
- Fatura (PDF): `GET /api/v1/faturamento/fatura/<id>/pdf/`
- Recibo (PDF): `GET /api/v1/pagamentos/recibo/<id>/pdf/`
- Estatísticas export: `GET /api/v1/dashboard/analytics/export/?tipo=pdf|csv|word&dias=30`
- História clínica (paciente): `GET /api/v1/clinico/paciente/<id>/historia_clinica/`

Nota:
- No export de estatísticas, use `tipo=pdf|csv|word` (não use `format=...`, porque o DRF reserva `format` para content negotiation).

---

## 📝 Documentar seus Endpoints

### Método 1: Docstrings

```python
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema

@extend_schema(
    summary="Listar Pacientes",
    description="Retorna uma lista paginada de pacientes do tenant",
    tags=["Pacientes"],
)
class PacienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar pacientes.
    
    list: Retorna todos os pacientes
    retrieve: Retorna um paciente específico
    create: Cria um novo paciente
    update: Atualiza um paciente existente
    destroy: Deleta um paciente
    """
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
```

### Método 2: Responses Customizadas

```python
from drf_spectacular.utils import extend_schema, OpenApiResponse

@extend_schema(
    responses={
        200: OpenApiResponse(
            description="Pacientes retornados com sucesso",
            response=PacienteSerializer(many=True)
        ),
        401: OpenApiResponse(description="Não autenticado"),
        403: OpenApiResponse(description="Sem permissão"),
    }
)
def list(self, request, *args, **kwargs):
    ...
```

### Método 3: Exemplos de Request

```python
from drf_spectacular.utils import extend_schema, OpenApiExample

@extend_schema(
    request=PacienteSerializer,
    examples=[
        OpenApiExample(
            "Exemplo válido",
            value={
                "nome": "João Silva",
                "email": "joao@example.com",
                "data_nascimento": "1990-01-15",
            }
        ),
        OpenApiExample(
            "Exemplo alternativo",
            value={
                "nome": "Maria Santos",
                "email": "maria@example.com",
                "data_nascimento": "1985-06-20",
            }
        ),
    ]
)
def create(self, request):
    ...
```

---

## 📤 Exportar para Postman

### Opção 1: Via Interface

1. Acesse http://localhost:8000/api/schema/
2. Copie o JSON inteiro
3. Abra Postman
4. Collections → Import → Paste JSON
5. Done! ✅

### Opção 2: Via CLI

```bash
# Baixar schema
curl http://localhost:8000/api/schema/ > schema.json

# Importar no Postman
# File → Import → schema.json
```

### Opção 3: Automático via GitHub Actions

Adicione ao `.github/workflows/`:

```yaml
- name: 📄 Export OpenAPI Schema
  run: |
    python generate_schema.py
    cp frontend-next/schema.json schema.json
    
- name: 📤 Upload to Postman
  uses: kevinsullivan/postman-collection-update@v1
  with:
    api-key: ${{ secrets.POSTMAN_API_KEY }}
    collection-uid: ${{ secrets.POSTMAN_COLLECTION_UID }}
    workspace-id: ${{ secrets.POSTMAN_WORKSPACE_ID }}
```

---

## 🔧 Customizações

### Excluir endpoints da documentação

```python
from drf_spectacular.utils import extend_schema

@extend_schema(exclude=True)
def my_view(request):
    ...
```

### Renomear tags

```python
@extend_schema(tags=["Pacientes v2"])
class PacienteViewSet(viewsets.ModelViewSet):
    ...
```

### Adicionar deprecação

```python
from drf_spectacular.utils import extend_schema, OpenApiDeprecated

@extend_schema(deprecated=True)
def old_endpoint(request):
    ...
```

---

## 🧪 Testar via Swagger

### Exemplo: Criar Paciente

1. Acesse **http://localhost:8000/api/docs/**
2. Encontre **POST /api/v1/clinico/pacientes/**
3. Clique em **"Try it out"**
4. Preencha o JSON:
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "cpf": "123.456.789-00",
  "data_nascimento": "1990-01-15"
}
```
5. Clique em **"Execute"**
6. Veja a resposta em tempo real!

---

## 📋 Checklist de Documentação

- [x] drf-spectacular instalado
- [x] Adicionado ao INSTALLED_APPS
- [x] REST_FRAMEWORK configurado
- [x] URLs configuradas
- [x] Swagger UI disponível em /api/docs/
- [x] ReDoc disponível em /api/redoc/
- [ ] Documentar todos viewsets com @extend_schema
- [ ] Adicionar exemplos de request/response
- [ ] Exportar para Postman
- [ ] Testar documentação

---

## 🚀 Próximos Passos

1. **Documentar ViewSets**
   ```bash
   # Edite cada ViewSet adicionando docstrings e @extend_schema
   ```

2. **Criar Postman Collection**
   ```bash
   curl http://localhost:8000/api/schema/ > postman.json
   ```

3. **Configurar no CI/CD**
   ```bash
   # GitHub Actions exporta schema automaticamente
   ```

---

## 📚 Recursos

- [drf-spectacular docs](https://drf-spectacular.readthedocs.io/)
- [OpenAPI 3.0 spec](https://spec.openapis.org/oas/v3.0.3)
- [Swagger UI docs](https://swagger.io/tools/swagger-ui/)
- [ReDoc docs](https://redoc.ly/)

---

**Criado em**: 11/03/2026
**Status**: Pronto para usar ✅
**Próximo**: Testes automatizados com pytest
