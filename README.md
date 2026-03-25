# Substrato

Plataforma clínica e laboratorial multi-tenant com backend Django + DRF + Celery e frontend Next.js.

A documentação consolidada do projeto está em `SUBSTRATO.md`. Este `README.md` permanece curto e funciona apenas como porta de entrada operacional do repositório.

## Stack principal
- Backend: Django 4.2, Django REST Framework, Postgres, Redis e Celery.
- Frontend: Next.js 15, React 18, TypeScript e Tailwind CSS.
- Infraestrutura: Docker Compose, Nginx e OpenAPI via DRF Spectacular.

## Estrutura principal
- `apps/`: módulos de negócio.
- `application/`: casos de uso.
- `domain/`: regras de domínio.
- `api/`: endpoints REST, serializers e viewsets.
- `frontend-next/`: aplicação web.
- `SUBSTRATO.md`: documentação consolidada completa.

## Execução local
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
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
- API docs: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- Schema OpenAPI: `http://localhost:8000/api/schema/`
- Health checks: `http://localhost:8000/health/live` e `http://localhost:8000/health/ready`

## Qualidade
```bash
python -m quality.english_naming --limit 200
python -m unittest tests.test_english_naming
python manage.py check
```

Os documentos Markdown históricos do projeto foram incorporados ao `SUBSTRATO.md`.
