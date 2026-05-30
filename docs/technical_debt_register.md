# Registro de Dívida Técnica

Use este arquivo para gestão formal de dívida técnica.

| ID | Área | Item | Impacto | Owner | Plano | Prazo | Status |
|---|---|---|---|---|---|---|---|
| TD-001 | API/Relatórios | Consolidar exportações síncronas legadas para modo assíncrono total | Alto | Backend | Migrar endpoints restantes para `export_job` | 2026-06-30 | Aberto |
| TD-002 | Observabilidade | Expandir dashboards com SLO/Error Budget por tenant | Médio | Ops | Adicionar painéis e recording rules | 2026-06-15 | Aberto |
| TD-003 | Performance DB | Revisar índices para filtros de histórico clínico e faturamento | Alto | Backend/DBA | Profiling + migration de índices | 2026-06-20 | Aberto |

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Mantém a dívida técnica explícita, priorizada e ligada a impacto operacional.

**Valor que protege.** Protege o roadmap contra decisões invisíveis que atrasam beta ou fragilizam produção.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve listar dívidas de impacto alto com owner, prazo, mitigação e critério de fecho.

**Para production-ready.** Exige revisão recorrente, ligação a incidentes/SLOs e remoção de dívida bloqueante.
