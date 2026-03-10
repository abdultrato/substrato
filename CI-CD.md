# 🚀 CI/CD - GitHub Actions

## 📋 Visão Geral

O projeto Substrato possui uma pipeline CI/CD completa automatizada com GitHub Actions:

```
Push → GitHub
  ├─ 🔍 Lint (Ruff check)
  ├─ 🏗️ Build Docker images
  ├─ 🧪 Run tests (backend + frontend)
  ├─ 📊 Upload coverage
  └─ 🚀 Deploy (quando merge para main/develop)
```

---

## 🔧 Workflows Disponíveis

### 1. 🔍 **lint.yml** - Code Quality Check
**Quando executa**: Push ou PR em `main` e `develop`

**O que faz**:
- ✅ Ruff linter (Python code style)
- ✅ Ruff formatter check
- ✅ Import sorting validation

**Falha se**: Código não segue padrão de formatação

**Resultado**: ✅ ou ❌ na badge do README

---

### 2. 🏗️ **build.yml** - Build Docker Images
**Quando executa**: Push ou PR em `main` e `develop`

**O que faz**:
- 🐳 Build imagem backend (Docker)
- 🐳 Build imagem frontend (Docker)
- 📤 Push para GitHub Container Registry (ghcr.io)
- 💾 Cache de layers para builds rápidos

**Tags automáticas**:
- `latest` (na branch padrão)
- `branch-name` (em cada branch)
- `main-sha123` (commit SHA)
- `v1.0.0` (em tags)

**Resultado**: Imagens disponíveis em `ghcr.io/seu-usuario/substrato`

---

### 3. 🧪 **test.yml** - Run All Tests
**Quando executa**: Push ou PR em `main` e `develop`

**Backend tests**:
- ✅ Django test suite
- ✅ pytest com coverage
- ✅ Services: PostgreSQL, Redis
- 📊 Upload coverage para Codecov

**Frontend tests**:
- ✅ Next.js build
- ✅ ESLint/Prettier

**Resultado**: Coverage report + test results

---

### 4. 🚀 **deploy.yml** - Deploy Application
**Quando executa**: Merge para `develop` (staging) ou `main` (production)

**O que faz**:
- 📦 Deploy para AWS ECS (configurável)
- 🔔 Notifica Slack com resultado
- 📍 Retorna URL de deployment

**Requer secrets**: AWS credentials, Slack webhook

---

## 🔐 Secrets Necessários

Para workflows funcionarem, configure os seguintes secrets em:
**Settings → Secrets and variables → Actions**

### Obrigatórios:

```bash
# Para deploy (opcional, pode deixar em branco)
AWS_ACCESS_KEY_ID       # Chave de acesso AWS
AWS_SECRET_ACCESS_KEY   # Chave secreta AWS
SLACK_WEBHOOK           # URL webhook do Slack
```

### Como adicionar:

1. Vá para: `https://github.com/seu-usuario/substrato/settings/secrets/actions`
2. Clique em "New repository secret"
3. Nome: `AWS_ACCESS_KEY_ID`
4. Valor: Sua chave
5. Repeat para outros

---

## 📊 Status Badges

Adicione ao seu README.md:

```markdown
[![Lint](https://github.com/seu-usuario/substrato/actions/workflows/lint.yml/badge.svg)](https://github.com/seu-usuario/substrato/actions/workflows/lint.yml)
[![Build](https://github.com/seu-usuario/substrato/actions/workflows/build.yml/badge.svg)](https://github.com/seu-usuario/substrato/actions/workflows/build.yml)
[![Tests](https://github.com/seu-usuario/substrato/actions/workflows/test.yml/badge.svg)](https://github.com/seu-usuario/substrato/actions/workflows/test.yml)
[![Deploy](https://github.com/seu-usuario/substrato/actions/workflows/deploy.yml/badge.svg)](https://github.com/seu-usuario/substrato/actions/workflows/deploy.yml)
```

---

## 🔄 Como Funciona

### Fluxo 1: Pull Request
```
1. Você abre um PR
2. GitHub Actions executa:
   - Lint (falha → você corrige)
   - Build Docker images
   - Run all tests
3. Você vê ✅ ou ❌
4. Se tudo OK, pode fazer merge
```

### Fluxo 2: Merge para Develop (Staging)
```
1. Merge PR para develop
2. GitHub Actions executa:
   - Lint ✅
   - Build & Push images
   - Run tests ✅
   - Deploy para staging
   - Notifica Slack ✅
3. Seu staging está atualizado!
```

### Fluxo 3: Merge para Main (Production)
```
1. Merge PR para main
2. GitHub Actions executa:
   - Lint ✅
   - Build & Push images
   - Run tests ✅
   - Deploy para production
   - Notifica Slack ✅
3. Production está atualizado!
```

---

## 📈 Tempo de Execução

| Workflow | Tempo |
|----------|-------|
| Lint | ~2 min |
| Build | ~10 min |
| Tests | ~15 min |
| **Total** | **~25 min** |

*Primeira execução pode ser mais lenta (sem cache)*

---

## 🛠️ Customizar Workflows

### Mudar branches monitoradas

Edite `.github/workflows/*.yml`:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # ← adicione
```

### Adicionar notificação por email

```yaml
- name: 📧 Send Email
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.EMAIL_HOST }}
    server_port: ${{ secrets.EMAIL_PORT }}
    username: ${{ secrets.EMAIL_USER }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Workflow failed on ${{ github.repository }}
    to: seu-email@example.com
    from: ci@seudominio.com
    body: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

### Skip workflow

Para não executar workflow em um commit, adicione `[skip ci]` na mensagem:

```bash
git commit -m "docs: atualizar README [skip ci]"
```

---

## 🚨 Troubleshooting

### ❌ Lint falha

**Problema**: `ruff check` falha

**Solução**:
```bash
# Rodar localmente
ruff check .

# Corrigir automaticamente
ruff format .
```

### ❌ Build falha

**Problema**: Docker build error

**Solução**:
```bash
# Testar build localmente
docker build -f Dockerfile -t test .

# Ver logs
docker logs
```

### ❌ Tests falham

**Problema**: Testes falham na CI mas passam localmente

**Solução**:
```bash
# Rodar com mesma config da CI
DJANGO_SETTINGS_MODULE=plataforma.settings.development \
DB_ENGINE=postgres pytest
```

### ❌ Deploy falha

**Problema**: Falha na etapa de deploy

**Solução**:
1. Verificar secrets em Settings → Secrets
2. Verificar permissões AWS
3. Ver logs em Actions → workflow → job

---

## 📚 Documentação Oficial

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Python Setup](https://github.com/actions/setup-python)
- [Node Setup](https://github.com/actions/setup-node)

---

## ✅ Checklist de Setup

- [ ] Workflows criados em `.github/workflows/`
- [ ] pytest.ini configurado
- [ ] Secrets adicionados (opcional para deploy)
- [ ] Commit e push dos workflows
- [ ] Verificar Actions tab no GitHub
- [ ] Adicionar badges ao README
- [ ] Testar primeiro workflow manualmente

---

**Criado em**: 11/03/2026
**Status**: Pronto para usar ✅
**Próximo**: Swagger/OpenAPI documentation
