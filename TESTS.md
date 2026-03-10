# 🧪 Testes Automatizados - Guia Completo

## 📋 Visão Geral

O projeto Substrato possui uma suíte de testes automatizados usando **pytest** + **pytest-django** + **factory-boy**:

```
tests/
├─ factories.py          # Factories para gerar dados de teste
├─ test_clinico.py       # Testes do módulo clínico
├─ test_api.py           # Testes de API
└─ test_integration.py   # Testes de integração
```

---

## 🚀 Começar com Testes

### Instalar Dependências

```bash
pip install pytest pytest-django pytest-cov factory-boy faker
```

Ou:

```bash
pip install -r requirements.txt
```

### Configuração (✅ Já feita)

- `pytest.ini` - Configuração pytest
- `conftest.py` - Fixtures globais
- `tests/factories.py` - Factories para dados de teste

### Rodar Todos os Testes

```bash
# Rodar todos testes
pytest

# Com verbose
pytest -v

# Com coverage
pytest --cov=. --cov-report=html

# Específico
pytest tests/test_clinico.py -v

# Apenas tests rápidos
pytest -m "not slow"
```

---

## 📝 Estrutura de Testes

### 1. Unit Tests - Models

```python
@pytest.mark.django_db
class TestPacienteModel:
    """Testa o model Paciente"""
    
    def test_criar_paciente(self):
        paciente = PacienteFactory()
        assert paciente.id is not None
```

**O que testar**:
- ✅ Criação com dados válidos
- ✅ Validação de campos obrigatórios
- ✅ Relacionamentos
- ✅ Métodos customizados
- ✅ Queries customizadas

### 2. Unit Tests - Serializers

```python
@pytest.mark.django_db
class TestPacienteSerializer:
    """Testa o serializer de Paciente"""
    
    def test_serializar(self):
        paciente = PacienteFactory()
        serializer = PacienteSerializer(paciente)
        assert serializer.data['nome'] == paciente.nome
```

**O que testar**:
- ✅ Serialização (model → JSON)
- ✅ Desserialização (JSON → model)
- ✅ Validações de entrada
- ✅ Campos customizados
- ✅ Nested serializers

### 3. Integration Tests - API

```python
@pytest.mark.django_db
class TestPacienteAPI(APITestCase):
    """Testa endpoints da API"""
    
    def test_listar_pacientes(self):
        response = self.client.get('/api/v1/clinico/pacientes/')
        assert response.status_code == 200
```

**O que testar**:
- ✅ GET /endpoint (list, retrieve)
- ✅ POST /endpoint (create)
- ✅ PATCH /endpoint (update)
- ✅ DELETE /endpoint (delete)
- ✅ Autenticação
- ✅ Permissões
- ✅ Filtering

### 4. Multi-Tenant Tests

```python
@pytest.mark.django_db
class TestMultiTenant:
    """Testa isolamento entre tenants"""
    
    def test_paciente_isolado(self):
        tenant1 = InquilinoFactory()
        tenant2 = InquilinoFactory()
        
        paciente1 = PacienteFactory(inquilino=tenant1)
        paciente2 = PacienteFactory(inquilino=tenant2)
        
        assert paciente1.inquilino != paciente2.inquilino
```

---

## 🏭 Factories - Criar Dados de Teste

### Uso Básico

```python
from tests.factories import UserFactory, PacienteFactory, InquilinoFactory

# Criar um usuário
user = UserFactory()
user = UserFactory(username='joao', password='secret123')

# Criar um paciente
paciente = PacienteFactory()
paciente = PacienteFactory(nome='João Silva')

# Criar um tenant
tenant = InquilinoFactory()
```

### Factories Disponíveis

```python
# Auth
UserFactory              # Usuário normal
AdminUserFactory        # Usuário admin

# Multi-tenant
InquilinoFactory        # Tenant/Inquilino

# Clinical
PacienteFactory         # Paciente
ExameFactory           # Exame

# Batch
BatchFactory.criar_tenant_com_usuarios(5)
BatchFactory.criar_pacientes_com_exames(10, 3)
```

### Customização

```python
# Valores fixos
user = UserFactory(username='specific_user', email='user@test.com')

# Sequence
users = [UserFactory() for _ in range(5)]  # user_0, user_1, ...

# SubFactory (relacionamento)
paciente = PacienteFactory(
    inquilino=tenant,
    nome='João'
)

# Post-generation (callback)
user = UserFactory(password='mysecret')  # Hash automático
```

---

## 🔧 Fixtures - Reutilizar Setup

### Fixtures Disponíveis (conftest.py)

```python
@pytest.fixture
def user():
    """User de teste"""
    return UserFactory(password='testpass123')

@pytest.fixture
def authenticated_client(api_client):
    """Client autenticado"""
    user = UserFactory()
    api_client.force_authenticate(user=user)
    return api_client
```

### Usar Fixtures em Testes

```python
def test_minha_api(authenticated_client):
    """Usa client autenticado"""
    response = authenticated_client.get('/api/v1/...')
    assert response.status_code == 200
```

### Criar Fixtures Customizadas

```python
# Criar arquivo: tests/conftest.py
@pytest.fixture
def meu_fixture():
    """Meu fixture customizado"""
    tenant = InquilinoFactory()
    user = UserFactory()
    tenant.usuarios.add(user)
    return tenant, user
```

---

## 📊 Coverage Reports

### Gerar Coverage

```bash
# HTML report
pytest --cov=. --cov-report=html
open htmlcov/index.html

# Terminal report
pytest --cov=. --cov-report=term-missing

# Apenas um app
pytest --cov=aplicativos.clinico tests/test_clinico.py
```

### Metas de Coverage

| Nível | Descrição |
|-------|-----------|
| 70%+ | Production-ready |
| 80%+ | High quality |
| 90%+ | Excellent |

### Ver Coverage por Arquivo

```bash
pytest --cov=. --cov-report=term-missing | grep -E "TOTAL|clinico"
```

---

## 🧪 Tipos de Testes

### Unit Tests (Rápidos)

```python
@pytest.mark.django_db
def test_criar_paciente():
    """Testa apenas o model"""
    paciente = PacienteFactory()
    assert paciente.id is not None
```

Tempo: ~100ms

### Integration Tests (Médio)

```python
def test_api_listar():
    """Testa API + banco + autenticação"""
    response = client.get('/api/v1/pacientes/')
    assert response.status_code == 200
```

Tempo: ~500ms

### E2E Tests (Lento)

```python
# Com Cypress/Playwright
cy.login('user', 'pass')
cy.visit('/pacientes')
cy.contains('João').should('be.visible')
```

Tempo: ~5-10s cada

### Skip/Mark de Testes

```python
# Skip teste
@pytest.mark.skip(reason="WIP")
def test_novo():
    pass

# Mark como slow
@pytest.mark.slow
def test_lento():
    pass

# Rodar apenas slow
pytest -m slow
```

---

## 🔍 Debugging Testes

### Print com pdb

```python
def test_debug():
    paciente = PacienteFactory()
    breakpoint()  # Pausa aqui
    # ... continua
```

### Run com debug

```bash
pytest -xvs tests/test_clinico.py::TestPacienteModel::test_criar_paciente
```

Flags:
- `-x` - Para no primeiro erro
- `-v` - Verbose
- `-s` - Show prints
- `-k` - Filtrar por nome

### Inspect objetos

```python
from pprint import pprint

response = client.get('/api/...')
pprint(response.data)
```

---

## 🚨 Problemas Comuns

### ❌ "No such table"

**Problema**: Tabela não existe

**Solução**:
```bash
pytest --create-db
# Ou
pytest --reuse-db
```

### ❌ "Fixture 'db' not found"

**Problema**: Mark `@pytest.mark.django_db` faltando

**Solução**:
```python
@pytest.mark.django_db  # ← Adicionar
def test_meu():
    pass
```

### ❌ "Object does not exist"

**Problema**: Relacionamento não foi criado

**Solução**:
```python
# Errado
paciente = PacienteFactory()  # Sem tenant explícito

# Correto
tenant = InquilinoFactory()
paciente = PacienteFactory(inquilino=tenant)
```

---

## 📋 Checklist de Testes

- [ ] Models testados (criar, atualizar, deletar)
- [ ] Serializers testados (valid, invalid)
- [ ] ViewSets testados (CRUD operations)
- [ ] Autenticação testada (com/sem token)
- [ ] Permissões testadas (allowed/denied)
- [ ] Multi-tenant testado (isolamento)
- [ ] Coverage > 70%
- [ ] Tests no CI/CD (✅ já feito)
- [ ] Documentação de testes

---

## 🚀 Próximos Passos

1. **Rodar testes existentes**
   ```bash
   pytest -v
   ```

2. **Adicionar mais testes**
   - Criar `tests/test_farmacia.py`
   - Criar `tests/test_enfermagem.py`
   - etc

3. **Melhorar coverage**
   ```bash
   pytest --cov=. --cov-report=html
   ```

4. **CI/CD automático**
   ```bash
   # Já configurado em .github/workflows/test.yml
   # Roda em cada push
   ```

---

## 📚 Recursos

- [pytest docs](https://docs.pytest.org/)
- [pytest-django docs](https://pytest-django.readthedocs.io/)
- [factory-boy docs](https://factoryboy.readthedocs.io/)
- [Django testing docs](https://docs.djangoproject.com/en/6.0/topics/testing/)

---

**Criado em**: 11/03/2026
**Status**: Framework pronto para expansão
**Próximo**: Adicionar testes para todos apps (70%+ coverage)
