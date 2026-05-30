# Segurança de Supply Chain

## Objetivo
Reduzir risco de dependências vulneráveis e melhorar rastreabilidade dos componentes usados em produção.

## Controles implementados
1. `Dependabot` com atualização semanal de `pip`, `npm` e GitHub Actions.
2. `Dependency Review` em PR com bloqueio para severidade `high` ou superior.
3. Geração contínua de SBOM (backend e frontend) no workflow `sbom.yml`.
4. Lockfile versionado em `frontend-next/package-lock.json`.

## Workflows relacionados
1. `/.github/workflows/dependency-review.yml`
2. `/.github/workflows/sbom.yml`
3. `/.github/workflows/ci.yml`
4. `/.github/workflows/codeql.yml`

## Uso operacional
1. Em PRs: revisar alerta de dependência antes de merge.
2. Em releases: anexar artefactos SBOM à evidência de mudança.
3. Em incidentes de segurança: usar SBOM para identificar exposição por pacote/versão.

## Política de resposta
1. Dependência crítica/alta: tratar antes da próxima release.
2. Dependência média: priorizar no sprint vigente.
3. Dependência baixa: avaliar risco/contexto e registrar no backlog técnico.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Controla o risco introduzido por dependências, imagens, workflows e artefactos externos.

**Valor que protege.** Protege a cadeia de entrega contra vulnerabilidades e alterações não verificadas.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve manter lockfiles, Dependabot, auditorias e revisão de dependências novas.

**Para production-ready.** Exige SBOM quando aplicável, scans por release, política de actualização e resposta a CVEs.
