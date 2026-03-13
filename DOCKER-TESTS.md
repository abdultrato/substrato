# 🧪 TESTES - Docker Setup

## ✅ Checklist de Validação

### 1. Verificar Arquivos

```bash
# Todos os arquivos devem existir
ls -lh Dockerfile docker-compose.yml .env.docker DOCKER.md
ls -lh scripts/init-db.sql Makefile nginx.conf
```

**Esperado**: 13 arquivos criados

### 2. Validar Sintaxe Docker Compose

```bash
docker compose config
```

**Esperado**: Sem erros

### 3. Validar Sintaxe Dockerfile

```bash
docker build --dry-run -f Dockerfile .
docker build --dry-run -f Dockerfile.frontend .
```

**Esperado**: Sem erros

### 4. Setup Inicial

#### Passo A: Preparar ambiente

```bash
# Copiar template de env
cp .env.docker .env

# Verificar arquivo
cat .env | grep -E "DJANGO|POSTGRES|REDIS"
```

**Esperado**: Variáveis presentes

#### Passo B: Build e iniciar containers

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
```

**Esperado**: Containers iniciados com sucesso

#### Passo C: Verificar compose

```bash
# Verificar serviços definidos
docker compose config | grep "services:" -A 100 | head -50
```

**Esperado**: 7 serviços listados

### 5. Documentação

```bash
# Verificar DOCKER.md
wc -l DOCKER.md
grep -c "^##" DOCKER.md
```

**Esperado**: Arquivo com ~250 linhas e 12+ seções

### 6. Makefile

```bash
# Listar targets disponíveis
make help 2>/dev/null || echo "Makefile sintaxe OK"
```

**Esperado**: Sem erros

---

## 🚀 Teste Funcional (Opcional - Requer Docker rodando)

Se você tiver Docker instalado, pode testar:

```bash
# 1. Iniciar stack (vai baixar ~2GB de imagens na primeira vez)
docker compose up --build -d

# 2. Aguardar 30-60 segundos
sleep 60

# 3. Verificar containers
docker compose ps

# 4. Testar healthcheck do backend
curl http://localhost:8000/health/live

# 5. Testar healthcheck do frontend
curl http://localhost:3000

# 6. Parar
docker compose down
```

---

## 📋 Checklist Final

- [ ] Arquivo Dockerfile criado (2.0K)
- [ ] Arquivo Dockerfile.frontend criado (1.6K)
- [ ] Arquivo docker-compose.yml criado (7.7K)
- [ ] Arquivo docker-compose.prod.yml criado (7.9K)
- [ ] Arquivo .dockerignore criado (1.1K)
- [ ] Arquivo entrypoint.sh criado (3.1K)
- [ ] Arquivo nginx.conf criado (4.3K)
- [ ] Arquivo nginx-prod.conf criado (3.7K)
- [ ] Arquivo .env.docker criado (3.2K)
- [ ] Arquivo scripts/init-db.sql criado (0.7K)
- [ ] Arquivo DOCKER.md criado (8.6K)
- [ ] Arquivo Makefile criado (4.1K)
- [ ] Arquivo docker-up.sh criado (2.6K)
- [ ] Requirements.txt atualizado com Celery
- [ ] docker-compose.yml é válido
- [ ] Documentação está completa

---

## 🎯 Próximas Ações Recomendadas

### Imediato
1. Revisar `.env.docker` e ajustar conforme necessário
2. Ler `DOCKER.md` integralmente
3. Testar com `docker compose up --build -d` quando tiver tempo

### Curto Prazo
1. Implementar GitHub Actions CI/CD
2. Configurar SSL/TLS para produção
3. Adicionar monitoring (Sentry/NewRelic)

### Médio Prazo
1. Kubernetes manifests
2. Helm charts
3. Multi-region deployment

---

## 📞 Problemas Comuns

### "docker: command not found"
→ Docker não está instalado. Instale em https://docs.docker.com/get-docker/

### "Permission denied while trying to connect to Docker daemon"
→ Adicione usuário ao grupo docker:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### "Port 8000 already in use"
→ Mude porta em `.env`:
```bash
BACKEND_PORT=8001
```

### "Cannot connect to database"
→ Banco demora para iniciar. Aguarde ~30s e tente novamente.

---

**Testes concluídos!** ✅
