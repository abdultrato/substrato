# Roadmap Command Center Operacional

## Objetivo
Transformar o Substrato num Command Center operacional com automação fim-a-fim entre módulos, observabilidade ativa, analytics executivo e governança consistente de acesso/idioma.

## Sprint 1 (base operacional)
- Observabilidade ativa:
  - Endpoint agregado `monitoring/telemetry/command_center/` com:
    - saúde global (SLO), 4xx/5xx, top rotas com falha, backlog da outbox;
    - saúde por módulo (taxa de sucesso e latência média);
    - alertas automáticos por severidade (critical/warning).
  - Página frontend de Command Center para exploração e triagem.
- Relatórios agendáveis:
  - metadados de agendamento (daily/weekly/monthly) e próxima execução.
- Critérios de aceite:
  - painel exibe dados reais por tenant;
  - alertas são calculados automaticamente sem placeholders.

## Sprint 2 (orquestração por eventos)
- Fluxo orientado a eventos entre módulos:
  - criação de requisição clínica gera evento de domínio;
  - consumidores (enfermagem/laboratório/farmácia) recebem tarefa rastreável.
- Estado rastreável:
  - trilha por evento: emitido -> entregue -> executado -> concluído/falhado.
- Critérios de aceite:
  - cada evento tem correlação e auditoria ponta a ponta;
  - falhas de entrega aparecem no Command Center como alerta operacional.

## Sprint 3 (analytics executivo + governança)
- Analytics cruzado multi-módulo:
  - dimensões por módulo, setor, utilizador, período, rota e estado;
  - drill-down para causas (rotas, tipos de erro, latência, impacto financeiro/clínico).
- Governança:
  - RBAC por perfil de negócio (clínico, educação, administração, financeiro);
  - i18n PT/EN centralizado por chaves, eliminando textos soltos.
- Critérios de aceite:
  - indicadores executivos consistentes entre backend e frontend;
  - alternância de idioma efetiva em todo o sistema.

## Sequência técnica recomendada
1. Consolidar base de dados operacional (Sprint 1).
2. Integrar eventos críticos clínicos/operacionais no barramento (Sprint 2).
3. Expandir analytics e governança de produto (Sprint 3).

## Métricas de sucesso do programa
- >= 99% de sucesso global em rotas críticas.
- Redução sustentada de 5xx em produção.
- Tempo médio de resposta para incidentes (MTTR) menor por ciclo.
- Cobertura de idioma PT/EN sem conteúdo residual fora da camada i18n.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Orienta o Command Center como visão operacional consolidada para decisão executiva e suporte.

**Valor que protege.** Protege a capacidade de observar tenants, fluxos críticos, incidentes, SLOs e prioridades numa superfície única.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve mostrar KPIs reais, estados de fila, incidentes, saúde de módulos e alertas accionáveis.

**Para production-ready.** Exige dados fiáveis, permissões por perfil, drill-down auditável e integração com alertas/runbooks.
