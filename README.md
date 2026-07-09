# Substrato

Plataforma multi-domínio e multi-tenant para saúde, educação, ERP/WMS, RH, finanças e operação, construída com Django, Django REST Framework, Celery e Next.js.

[![Django](https://img.shields.io/badge/Django-4.2-092E20?logo=django)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

O nome Substrato remete a um sistema unificado de base sustentável: uma camada operacional capaz de conectar processos críticos, dados e governança sem fragmentar a tecnologia em dezenas de ferramentas isoladas.

## O que o projeto entrega
- Plataforma multi-tenant e auditável para operação empresarial e clínica.
- Módulos para saúde, laboratório, educação, ERP/WMS, RH, finanças e backoffice.
- Backend modular com APIs, eventos e integrações assíncronas.
- Frontend moderno com foco em experiência operacional e rastreabilidade.
- Documentação técnica, readiness, segurança e runbooks integrados ao ciclo de desenvolvimento.

## Por que isso chama atenção
- Resolve o problema de fragmentação entre sistemas e processos críticos.
- Dá prioridade a rastreabilidade, permissões, auditoria e observabilidade.
- Mantém uma visão de produção beta com critérios claros de qualidade e risco.
- É uma base adequada para expansão sem recomeçar do zero a cada novo domínio.

## Arquitetura e stack
- Backend: Django 4.2, Django REST Framework, ASGI/Uvicorn, PostgreSQL, Redis e Celery.
- Frontend: Next.js 15, React 18, TypeScript e Tailwind CSS.
- Infraestrutura: Docker Compose, Nginx e OpenAPI via DRF Spectacular.

## Estrutura principal
- apps/: módulos de negócio.
- application/: casos de uso e fluxos de aplicação.
- domain/: regras e modelos centrais de domínio.
- api/: endpoints REST, serializers e viewsets.
- frontend-next/: frontend web.
- docs/: documentação técnica e operacional.
- SUBSTRATO.md: documentação consolidada do projeto.

## Execução local
```bash
pip install -r requirements.txt
python manage.py migrate
python -m uvicorn platform.asgi:application --host 0.0.0.0 --port 8000 --reload
```

```bash
cd frontend-next
npm install
npm run dev
```

## Docker
```bash
docker compose up --build
```

## Endpoints úteis
- API docs: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- Schema OpenAPI: http://localhost:8000/api/schema/
- Health checks: http://localhost:8000/health/live e http://localhost:8000/health/ready

## Qualidade e prontidão
```bash
make quality-gate
make ops-health
make production-readiness
make migration-check
make release-baseline
```

## Como contribuir
1. Leia a documentação principal em SUBSTRATO.md e em docs/ antes de mudar modelos, APIs ou fluxos críticos.
2. Mantenha alterações pequenas, bem descritas e alinhadas com a missão do projeto.
3. Atualize testes, documentação e runbooks sempre que a mudança alterar comportamento ou risco operacional.
4. Use a branch main para desenvolvimento direto, conforme a política atual do repositório.

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes do fluxo de contribuição.

## Segurança
Relatos de vulnerabilidades devem ser enviados pelo canal descrito em [SECURITY.md](SECURITY.md).

## Links úteis
- [SUBSTRATO.md](SUBSTRATO.md)
- [SECURITY.md](SECURITY.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
