# 🐳 DOCKER - Guia Completo

## 📋 Pré-requisitos

- **Docker**: 20.10+ ([instalar](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ ([instalar](https://docs.docker.com/compose/install/))
- **Git**: Para clonar o repositório

### Verificar instalação

```bash
docker --version
docker compose version
```

---

## 🚀 Quick Start (Desenvolvimento)

### 1️⃣ Clonar e entrar no repositório

```bash
cd /home/australopithecus/Músicas/substrato
```

### 2️⃣ Copiar arquivo de ambiente

```bash
cp .env.docker .env
```

### 3️⃣ Build e iniciar containers

```bash
# Iniciar todos os serviços (com build)
docker compose up --build -d
# ou (ver logs no terminal):
docker compose up --build

# Ver logs em tempo real
docker compose logs -f
```

### 4️⃣ Verificar status

```bash
docker compose ps
```

Você deve ver todos os serviços com status `Up`:

```
NAME                  STATUS
substrato_db          Up (healthy)
substrato_redis       Up (healthy)
substrato_backend     Up (healthy)
substrato_frontend    Up (healthy)
substrato_celery      Up
substrato_celery_beat Up
substrato_nginx       Up
```

### 5️⃣ Acessar a aplicação

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Backend (API)** | http://localhost:8000 | - |
| **Admin Django** | http://localhost:8000/admin | admin/admin123 |
| **Frontend** | http://localhost:3000 | - |
| **Nginx** | http://localhost | Proxy reverso |

---

## 🛠️ Comandos Úteis

### Parar containers

```bash
docker compose down
```

### Parar e remover volumes (⚠️ Remove dados!)

```bash
docker compose down -v
```

### Ver logs de um serviço específico

```bash
# Backend
docker compose logs -f backend

# Frontend
docker compose logs -f frontend

# Celery
docker compose logs -f celery

# Banco de dados
docker compose logs -f db
```

### Executar comando dentro do container

```bash
# Django management
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py migrate

# PostgreSQL
docker compose exec db psql -U substrato_user -d substrato

# Redis CLI
docker compose exec redis redis-cli

# Node (Frontend)
docker compose exec frontend npm list
```

### Rebuild de um serviço específico

```bash
docker compose build backend
docker compose up -d backend
```

### Limpar tudo (⚠️ Cuidado!)

```bash
# Remove containers, networks, volumes
docker compose down -v

# Remove imagens também
docker compose down -v --rmi all
```

---

## 📝 Variáveis de Ambiente

As variáveis estão em `.env.docker`. Principais:

```bash
# Django
DJANGO_DEBUG=True              # True em dev, False em prod
DJANGO_SECRET_KEY=dev-...      # Mudar em produção
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=substrato
POSTGRES_USER=substrato_user
POSTGRES_PASSWORD=dev_password # Mudar em produção!

# Redis
REDIS_URL=redis://redis:6379/0

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Mudar variáveis

Edite `.env` e reinicie:

```bash
docker compose down
docker compose up --build -d
```

---

## 🗄️ Database

### Executar migrations

```bash
docker compose exec backend python manage.py migrate
```

### Criar novo usuário

```bash
docker compose exec backend python manage.py createsuperuser
```

### Backup do banco

```bash
docker compose exec db pg_dump -U substrato_user substrato > backup.sql
```

### Restaurar banco

```bash
docker compose exec -T db psql -U substrato_user substrato < backup.sql
```

### Acessar psql

```bash
docker compose exec db psql -U substrato_user -d substrato
```

---

## 🔄 Celery (Tarefas Assíncronas)

### Ver tarefas ativas

```bash
docker compose exec backend python -m celery -A plataforma inspect active
```

### Ver workers

```bash
docker compose exec backend python -m celery -A plataforma inspect stats
```

### Limpar fila

```bash
docker compose exec backend python -m celery -A plataforma purge
```

---

## 📊 Monitoramento

### Health checks

Todos os serviços possuem healthchecks. Verificar status:

```bash
docker compose ps
```

Se um serviço não ficar `healthy`, ver logs:

```bash
docker compose logs <service_name>
```

### Métricas

Backend expõe métricas em:

```
http://localhost:8000/metrics
```

---

## 🚨 Troubleshooting

### Porta já em uso

```bash
# Mudar porta no .env
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Ou liberar porta
lsof -i :8000
kill -9 <PID>
```

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs backend

# Rebuild
docker compose build --no-cache backend
docker compose up -d backend
```

### Banco de dados recusa conexão

```bash
# Aguardar healthcheck
docker compose logs db

# Resetar banco
docker compose down -v
docker compose up --build -d
```

### Frontend não carrega

```bash
# Verificar que backend está pronto
curl http://localhost:8000/health/live

# Ver logs frontend
docker compose logs frontend
```

### Permissão negada em scripts

```bash
chmod +x entrypoint.sh
docker compose up --build -d backend
```

---

## 🏭 Produção

### Usar docker-compose.prod.yml

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Configurar variáveis de produção

Criar `.env.prod`:

```bash
DJANGO_ENV=production
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=seu-secret-super-seguro-aqui
DJANGO_ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
POSTGRES_PASSWORD=senha-super-segura
REDIS_PASSWORD=senha-super-segura-redis
```

### SSL/TLS

1. Gerar certificados (Let's Encrypt):

```bash
certbot certonly --standalone -d seu-dominio.com -d www.seu-dominio.com
```

2. Copiar para diretório `ssl/`:

```bash
mkdir -p ssl/
cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ssl/key.pem
```

3. Iniciar containers

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Renovação automática de certificados

Usar Certbot com webroot ou hook:

```bash
certbot renew --deploy-hook "docker compose -f docker-compose.prod.yml restart nginx"
```

---

## 📚 Arquitetura Docker

```
┌─────────────────────────────────────────────────────┐
│              DOCKER COMPOSE                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  nginx:80/443         (Reverse proxy)               │
│  ├─→ backend:8000     (Django + Gunicorn)          │
│  ├─→ frontend:3000    (Next.js)                    │
│  ├─→ static/media     (Arquivos estáticos)         │
│                                                     │
│  PostgreSQL:5432      (Banco de dados)              │
│  Redis:6379           (Cache + Task broker)         │
│  Celery Worker        (Tarefas assíncronas)         │
│  Celery Beat          (Scheduler)                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança

### Mínimo para produção:

- ✅ Alterar `DJANGO_SECRET_KEY`
- ✅ Alterar `POSTGRES_PASSWORD`
- ✅ Alterar `REDIS_PASSWORD`
- ✅ Setar `DJANGO_DEBUG=False`
- ✅ Usar SSL/TLS
- ✅ Usar imagens assinadas
- ✅ Escaneie vulnerabilidades: `docker scan substrato_backend`

---

## 📖 Documentação Adicional

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Django + Docker Best Practices](https://docs.docker.com/language/python/build-images/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)

---

## ❓ FAQ

**P: Como adicionar um novo container?**
R: Edite `docker-compose.yml` e adicione um novo serviço. Exemplo:

```yaml
mailhog:
  image: mailhog/mailhog
  ports:
    - "1025:1025"
    - "8025:8025"
  networks:
    - substrato
```

**P: Como persistir dados?**
R: Dados estão em volumes Docker. Fazer backup:

```bash
docker run --rm -v substrato_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db.tar.gz -C /data .
```

**P: Posso usar SQLite em produção?**
R: **NÃO**. Use PostgreSQL. SQLite é apenas para testes.

**P: Como escalar horizontalmente?**
R: Use Kubernetes. Docker Compose é apenas para desenvolvimento.

---

**Criado em**: 11/03/2026
**Versão**: 1.0
**Mantido por**: Copilot
