# substrato
 programa web com python e nextjs

Perfeito. Vou te entregar um **README.md profissional, claro e orientado a arquitetura**, adequado para um SaaS modular
como o seu.

Ele já assume:

* Django + DRF
* Celery
* Multi-tenant
* Arquitetura orientada a domínio
* Ruff configurado

Você pode colar diretamente.

---

# 📄 `README.md`

```markdown
# Substrato

Plataforma SaaS modular para gestão hospitalar e laboratorial.

Arquitetura baseada em Domain-Driven Design (DDD), separação por camadas e princípios de Clean Architecture.

---

## 📦 Arquitetura

O projeto está organizado em camadas bem definidas:

```

api/ → Camada HTTP (DRF)
aplicacao/ → Casos de uso
dominio/ → Regras de negócio puras
aplicativos/ → Apps Django (ORM / Models)
servicos/ → Orquestração e integrações
infraestrutura/ → Banco, cache, middlewares
integracoes/ → Adaptadores externos
observabilidade/ → Logs, métricas, health
seguranca/ → Autenticação e permissões
plataforma/ → Configuração principal do Django
tarefas/ → Workers Celery

````

---

## 🧠 Princípios

- Separação clara entre domínio e infraestrutura
- Multi-tenant
- Event-driven interno
- Integrações desacopladas via adapters
- Tasks assíncronas com Celery
- Observabilidade integrada
- Código padronizado com Ruff

---

## 🚀 Execução Local

### 1️⃣ Criar ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate
````

### 2️⃣ Instalar dependências

```bash
pip install -r requirements.txt
```

### 3️⃣ Aplicar migrações

```bash
python manage.py migrate
```

### 4️⃣ Executar servidor

```bash
python manage.py runserver
```

---

## ⚙️ Celery

### Worker

```bash
celery -A plataforma worker -l info
```

### Beat (se aplicável)

```bash
celery -A plataforma beat -l info
```

---

## 🔍 Health Checks

Endpoints disponíveis:

```
/health/live      → Liveness probe
/health/ready     → Readiness probe
```

---

## 🛡 Segurança

* Autenticação baseada em token ou sessão
* Permissões customizadas
* Rate limiting
* Middleware de manutenção
* Auditoria de ações críticas

---

## 📊 Observabilidade

* Métricas internas
* Health checks
* Logs estruturados
* Monitoramento de tarefas

---

## 🧹 Qualidade de Código

Utilizamos Ruff como linter e formatter.

### Executar lint manualmente

```bash
ruff check .
```

### Formatar código

```bash
ruff format .
```

---

## 🏗 Convenções

* Nada de `import *`
* Regras de negócio nunca na camada `api`
* Services não dependem de HTTP
* Adapters externos sempre isolados
* Tasks Celery não contêm regra de domínio

---

## 📌 Status

Projeto em evolução contínua com foco em:

* Escalabilidade
* Robustez
* Arquitetura sustentável
* Segurança

```

---

# 🎯 Se quiser algo ainda mais forte

Posso montar:

- README com diagrama arquitetural
- README com fluxo de requisição (Request → Domain → Event → Task)
- README corporativo com badges
- README para open-source
- README para produto comercial

Você decide o nível.
```
