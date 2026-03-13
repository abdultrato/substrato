# 🚀 Docker Quick Start

## 30 segundos para começar

### 1. Preparar

```bash
cp .env.docker .env
```

### 2. Iniciar

**Linux/Kali:**
```bash
./docker-up.sh
```

**Windows (PowerShell):**
```powershell
./docker-up.ps1
```

Esses scripts automatizam o processo de build e inicialização, incluindo verificação de dependências e criação do arquivo .env.

Alternativamente, você pode executar manualmente:
```bash
docker compose up --build -d
# ou (ver logs no terminal):
docker compose up --build
```

### 3. Pronto! 🎉

```
Backend:  http://localhost:8000
Admin:    http://localhost:8000/admin (admin/admin123)
Frontend: http://localhost:3000
```

---

## Comandos Essenciais

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Executar migrations
docker compose exec backend python manage.py migrate

# Django shell
docker compose exec backend python manage.py shell

# Criar superuser
docker compose exec backend python manage.py createsuperuser

# PostgreSQL shell
docker compose exec db psql -U substrato_user -d substrato
```

---

## Usar Makefile (Mais fácil!)

```bash
make help          # Ver todos os comandos
make up            # Iniciar
make up-build       # Iniciar (foreground) com build
make down          # Parar
make logs          # Logs
make migrate       # Migrations
make shell         # Django shell
```

---

## Problemas?

Consulte **DOCKER.md** para troubleshooting completo.

---

**Tempo total**: ~60s (primeiro build leva mais)
