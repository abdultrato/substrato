#!/bin/bash
# ============================================================================
# SCRIPT - Inicializar Docker (desenvolvimento)
# ============================================================================

set -e

echo "=================================================="
echo "🐳 Substrato - Docker Setup"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Docker
echo -e "\n${YELLOW}✓ Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker não encontrado. Instale em https://docs.docker.com/get-docker/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker OK${NC}"

# Verificar Docker Compose
echo -e "\n${YELLOW}✓ Verificando Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose não encontrado. Instale em https://docs.docker.com/compose/install/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose OK${NC}"

# Criar .env se não existir
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}✓ Criando arquivo .env...${NC}"
    cp .env.docker .env
    echo -e "${GREEN}✓ .env criado. Edite se necessário.${NC}"
else
    echo -e "\n${YELLOW}ℹ️  .env já existe${NC}"
fi

# Build
echo -e "\n${YELLOW}✓ Building imagens Docker...${NC}"
docker-compose build

# Iniciar serviços
echo -e "\n${YELLOW}✓ Iniciando serviços...${NC}"
docker-compose up -d

# Aguardar serviços ficarem healthy
echo -e "\n${YELLOW}✓ Aguardando serviços ficarem prontos...${NC}"
sleep 10

# Verificar status
echo -e "\n${YELLOW}✓ Status dos containers:${NC}"
docker-compose ps

# Resultado final
echo -e "\n${GREEN}=================================================="
echo "✅ Substrato iniciado com sucesso!"
echo "==================================================${NC}"
echo ""
echo -e "${GREEN}URLs:${NC}"
echo "  • Backend:  ${YELLOW}http://localhost:8000${NC}"
echo "  • Admin:    ${YELLOW}http://localhost:8000/admin${NC} (admin/admin123)"
echo "  • Frontend: ${YELLOW}http://localhost:3000${NC}"
echo "  • Nginx:    ${YELLOW}http://localhost${NC}"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo "  1. Ver logs: ${YELLOW}docker-compose logs -f${NC}"
echo "  2. Criar superuser: ${YELLOW}docker-compose exec backend python manage.py createsuperuser${NC}"
echo "  3. Acessar Django Shell: ${YELLOW}docker-compose exec backend python manage.py shell${NC}"
echo ""
echo -e "${GREEN}Parar containers: ${YELLOW}docker-compose down${NC}${NC}"
echo ""
