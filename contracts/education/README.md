# Education contracts

This folder stores contracts consumed by other bounded contexts without importing
Education models directly.

Current scope:
- event payload contracts for StudentCreated, EnrollmentCompleted, GradePublished,
  ExamScheduled, LessonUploaded
- request/response expectations for internal integration APIs

Governance rules:
- no direct cross-domain ORM imports
- transport contracts are versioned
- backward compatibility is mandatory for integration consumers

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define contratos do domínio Education consumidos por outros bounded contexts sem import directo de modelos.

**Valor que protege.** Protege a migração do legado escolar, compatibilidade entre domínios e independência do módulo de educação.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir eventos, payloads e integrações mínimas de estudantes, matrículas, notas, exames e conteúdos.

**Para production-ready.** Exige contratos versionados, exemplos, testes de compatibilidade e plano de descontinuação do legado.
