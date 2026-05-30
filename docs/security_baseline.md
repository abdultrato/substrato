# Baseline de Segurança

## 1) Configuração segura de produção
1. `DJANGO_DEBUG=False` obrigatório.
2. `DJANGO_SECRET_KEY` forte (>50 chars e não-placeholder).
3. `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` obrigatórios.
4. `USE_REDIS=true` obrigatório para ambiente produtivo.
5. Proibido `sqlite` em produção.

## 2) Hardening HTTP
1. HSTS ativo (`SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`).
2. Cookies seguros: `Secure`, `HttpOnly`, `SameSite`.
3. Headers de proteção:
   - Backend: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
   - Frontend: CSP, `Permissions-Policy`, `Strict-Transport-Security`.

## 3) Segurança de aplicação
1. DRF autenticado por JWT.
2. Throttling ativo para login.
3. OpenAPI restrito em produção (`IsAdminUser`).
4. Endpoint de métricas opcionalmente protegido por bearer token.

## 4) Segurança em CI
1. SAST backend com `bandit`.
2. Auditoria de dependências Python com `pip-audit`.
3. Auditoria de dependências frontend com `npm audit --omit=dev --audit-level=high`.
4. `Dependency Review` em PR para bloquear dependências vulneráveis.
5. `CodeQL` contínuo para análise estática multi-linguagem.

## 5) Gestão de segredos
1. Nunca versionar segredos reais.
2. Ficheiros versionados `.env.*` devem conter placeholders.
3. Segredos reais devem vir de:
   - GitHub Environments/Secrets.
   - Secret manager do provedor cloud.
4. Rotação de segredos a cada incidente de exposição.

## 6) Rastreabilidade de componentes
1. SBOM backend e frontend gerados no pipeline.
2. Lockfile frontend versionado para builds determinísticas.
3. Dependabot mantém atualização contínua de dependências.

## 7) Checklist rápido pré-deploy
1. `python scripts/production_readiness_check.py`
2. `python manage.py check --deploy`
3. Validar `/health/live` e `/health/ready`
4. Confirmar alertas críticos zerados

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define o mínimo de segurança exigido para qualquer ambiente com dados reais.

**Valor que protege.** Protege tenants, dados sensíveis, autenticação, autorização, segredos e superfícies públicas.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve bloquear configurações inseguras e validar permissões nos workflows críticos.

**Para production-ready.** Exige hardening, scans contínuos, resposta a incidentes, rotação de credenciais e revisão de acessos.
