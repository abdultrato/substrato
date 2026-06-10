# Readiness — Qualidade Laboratorial e Biossegurança

Checklist de prontidão dos submódulos de Gestão da Qualidade e Biossegurança Laboratorial para a beta do Substrato.

Este documento foi criado após varredura estática do backend indicar que os ViewSets existem dentro do domínio `clinical_laboratory`, mas ainda precisam ser confirmados, organizados e expostos corretamente no frontend.

---

## Objectivo

Qualidade e Biossegurança devem transformar o Laboratório Clínico de um fluxo operacional básico para um sistema auditável, controlado e preparado para uso institucional.

Fluxo esperado:

```text
Documento → Não conformidade → Acção correctiva → Auditoria → Indicador → Revisão pela gestão
```

E, para biossegurança:

```text
Perigo → Incidente/Exposição → Resposta → Registo → Inspecção → Acção correctiva
```

---

## Endpoints backend identificados

### Gestão da Qualidade

| Recurso | Endpoint esperado | Ação backend identificada |
| --- | --- | --- |
| Documentos da qualidade | `/api/v1/clinical_laboratory/quality_document/` | `aprovar` |
| Não conformidades | `/api/v1/clinical_laboratory/nonconformity/` | `encerrar` |
| Acções correctivas | `/api/v1/clinical_laboratory/corrective_action/` | `concluir`, `verificar`, `fechar` |
| Auditorias internas | `/api/v1/clinical_laboratory/internal_audit/` | CRUD |
| Achados de auditoria | `/api/v1/clinical_laboratory/audit_finding/` | CRUD |
| Indicadores da qualidade | `/api/v1/clinical_laboratory/quality_indicator/` | CRUD |
| Formação da equipa | `/api/v1/clinical_laboratory/training_record/` | CRUD |
| Avaliação de competência | `/api/v1/clinical_laboratory/competency/` | CRUD |
| Reclamações | `/api/v1/clinical_laboratory/complaint/` | CRUD |
| Avaliação de risco | `/api/v1/clinical_laboratory/risk_assessment/` | CRUD |
| Revisão pela gestão | `/api/v1/clinical_laboratory/management_review/` | CRUD |

### Biossegurança

| Recurso | Endpoint esperado | Ação backend identificada |
| --- | --- | --- |
| Perigos biológicos | `/api/v1/clinical_laboratory/hazard/` | CRUD |
| Incidentes de exposição | `/api/v1/clinical_laboratory/exposure_incident/` | CRUD |
| EPIs | `/api/v1/clinical_laboratory/ppe/` | CRUD |
| Distribuição de EPIs | `/api/v1/clinical_laboratory/ppe_distribution/` | CRUD |
| Resíduos | `/api/v1/clinical_laboratory/waste/` | CRUD |
| Descontaminação | `/api/v1/clinical_laboratory/decontamination/` | CRUD |
| Derrames/spill response | `/api/v1/clinical_laboratory/spill/` | CRUD |
| Vacinação ocupacional | `/api/v1/clinical_laboratory/vaccination/` | CRUD |
| Inspeções de biossegurança | `/api/v1/clinical_laboratory/biosafety_inspection/` | CRUD |

---

## Organização frontend recomendada

```text
Laboratório
  Qualidade
    Documentos da qualidade
    Não conformidades
    Acções correctivas
    Auditorias internas
    Indicadores
    Formação e competência
    Reclamações
    Avaliação de risco
    Revisão pela gestão

  Biossegurança
    Perigos biológicos
    Incidentes de exposição
    EPIs
    Distribuição de EPIs
    Resíduos
    Descontaminação
    Derrames
    Vacinação ocupacional
    Inspeções
```

---

## Prioridade de implementação frontend

| Prioridade | Recurso | Motivo |
| --- | --- | --- |
| P0 | Não conformidades | Base para controlo de falhas, incidentes e qualidade. |
| P0 | Acções correctivas | Necessária para fechar não conformidades e auditorias. |
| P0 | Incidentes de exposição | Crítico para biossegurança e segurança ocupacional. |
| P0 | Inspeções de biossegurança | Gera evidência de conformidade operacional. |
| P1 | Documentos da qualidade | Base documental e aprovação controlada. |
| P1 | Auditorias internas | Essencial para maturidade de qualidade. |
| P1 | Avaliação de risco | Ponte entre qualidade e biossegurança. |
| P1 | EPIs e distribuição | Controlo operacional básico. |
| P2 | Indicadores | Importante para dashboard e gestão. |
| P2 | Formação e competência | Importante para conformidade e capacitação. |
| P2 | Revisão pela gestão | Maturidade avançada de gestão. |
| P2 | Reclamações | Gestão de satisfação e não conformidades externas. |

---

## Fluxo 1 — Documentos da qualidade

### Backend

- [ ] Endpoint responde.
- [ ] Listagem filtra por código, título, tipo e estado.
- [ ] Detalhe mostra versão, responsável e próxima revisão.
- [ ] Ação `aprovar` funciona para perfil autorizado.
- [ ] Documento aprovado fica bloqueado ou versionado conforme regra definida.
- [ ] Alterações são auditáveis.

### Frontend

- [ ] Tela aparece em Laboratório → Qualidade → Documentos.
- [ ] Listagem mostra código, título, tipo, estado e revisão.
- [ ] Detalhe abre corretamente.
- [ ] Criar/editar funciona para perfil autorizado.
- [ ] Ação aprovar aparece apenas para perfil autorizado.
- [ ] Documento vencido/próximo da revisão aparece sinalizado.

### Testes mínimos

- [ ] Teste automatizado cria documento.
- [ ] Teste automatizado aprova documento com perfil autorizado.
- [ ] Teste automatizado bloqueia aprovação por perfil não autorizado.
- [ ] Teste manual aprova documento pelo frontend.

---

## Fluxo 2 — Não conformidades

### Backend

- [ ] Endpoint responde.
- [ ] Não conformidade possui código, descrição, origem, severidade, estado e sector quando aplicável.
- [ ] Ação `encerrar` funciona conforme regra.
- [ ] Encerramento exige resolução ou acção correctiva quando aplicável.
- [ ] Alterações são auditáveis.

### Frontend

- [ ] Tela aparece em Laboratório → Qualidade → Não conformidades.
- [ ] Listagem mostra código, origem, severidade, estado e data.
- [ ] Detalhe mostra descrição, causa, acções correctivas e histórico.
- [ ] Criar não conformidade funciona para perfil autorizado.
- [ ] Encerrar aparece apenas para perfil autorizado.
- [ ] Não conformidade crítica fica destacada.

### Testes mínimos

- [ ] Teste automatizado cria não conformidade.
- [ ] Teste automatizado encerra não conformidade conforme regra.
- [ ] Teste automatizado bloqueia encerramento sem permissão.
- [ ] Teste manual cria e encerra uma não conformidade.

---

## Fluxo 3 — Acções correctivas

### Backend

- [ ] Endpoint responde.
- [ ] Acção correctiva fica vinculada à não conformidade quando aplicável.
- [ ] Ação `concluir` funciona.
- [ ] Ação `verificar` funciona com parâmetro de eficácia.
- [ ] Ação `fechar` funciona após critérios mínimos.
- [ ] Prazos vencidos podem ser identificados.

### Frontend

- [ ] Tela aparece em Laboratório → Qualidade → Acções correctivas.
- [ ] Acções aparecem também no detalhe da não conformidade.
- [ ] Listagem mostra prazo, estado, responsável e tipo.
- [ ] Concluir/verificar/fechar aparecem conforme estado e permissão.
- [ ] Acções vencidas ficam sinalizadas.

### Testes mínimos

- [ ] Teste automatizado cria acção correctiva.
- [ ] Teste automatizado conclui acção.
- [ ] Teste automatizado verifica eficácia.
- [ ] Teste automatizado fecha acção.
- [ ] Teste manual executa ciclo CAPA completo.

---

## Fluxo 4 — Auditorias internas e achados

### Backend

- [ ] Auditoria interna possui endpoint de listagem e detalhe.
- [ ] Achados ficam vinculados à auditoria.
- [ ] Achados podem gerar não conformidade ou acção correctiva quando aplicável.
- [ ] Auditoria possui estado e data.
- [ ] Resultados são auditáveis.

### Frontend

- [ ] Auditorias aparecem em Laboratório → Qualidade → Auditorias internas.
- [ ] Achados aparecem como segunda camada dentro da auditoria.
- [ ] Criar auditoria funciona para perfil autorizado.
- [ ] Criar achado funciona dentro da auditoria.
- [ ] Achado crítico fica destacado.

### Testes mínimos

- [ ] Teste automatizado cria auditoria.
- [ ] Teste automatizado cria achado vinculado.
- [ ] Teste manual cria auditoria com achado.

---

## Fluxo 5 — Indicadores, formação, competência e revisão

### Backend

- [ ] Indicadores respondem via endpoint.
- [ ] Formação da equipa responde via endpoint.
- [ ] Avaliação de competência responde via endpoint.
- [ ] Revisão pela gestão responde via endpoint.
- [ ] Recursos possuem filtros úteis por estado, data e responsável quando aplicável.

### Frontend

- [ ] Indicadores aparecem no submenu de Qualidade.
- [ ] Formação e competência aparecem em área própria.
- [ ] Revisão pela gestão aparece em área própria.
- [ ] Vencimentos/expirações aparecem sinalizados.
- [ ] Dados podem alimentar dashboard futuramente.

### Testes mínimos

- [ ] Teste automatizado lista indicadores.
- [ ] Teste automatizado lista formações.
- [ ] Teste automatizado lista competências.
- [ ] Teste manual valida navegação das telas.

---

## Fluxo 6 — Incidentes de exposição

### Backend

- [ ] Endpoint responde.
- [ ] Incidente possui data/hora, material envolvido, local, actividade e estado.
- [ ] Incidente pode vincular não conformidade quando aplicável.
- [ ] Dados sensíveis possuem acesso restrito.
- [ ] Registo é auditável.

### Frontend

- [ ] Tela aparece em Laboratório → Biossegurança → Incidentes de exposição.
- [ ] Listagem mostra data, tipo, estado e área sem expor informação sensível em excesso.
- [ ] Detalhe exige perfil autorizado.
- [ ] Criar incidente funciona para perfil autorizado.
- [ ] Estados críticos ficam sinalizados.

### Testes mínimos

- [ ] Teste automatizado cria incidente.
- [ ] Teste automatizado bloqueia acesso sem permissão.
- [ ] Teste automatizado respeita tenant isolation.
- [ ] Teste manual cria incidente com perfil autorizado.

---

## Fluxo 7 — EPIs, resíduos e descontaminação

### Backend

- [ ] EPIs respondem via endpoint.
- [ ] Distribuição de EPIs responde via endpoint.
- [ ] Resíduos respondem via endpoint.
- [ ] Descontaminação responde via endpoint.
- [ ] Registos possuem responsável, data e área/departamento quando aplicável.

### Frontend

- [ ] EPIs aparecem no submenu de Biossegurança.
- [ ] Distribuição de EPIs aparece ligada ao EPI/staff.
- [ ] Resíduos aparecem com tipo e estado.
- [ ] Descontaminação mostra área, produto e data.
- [ ] Baixo estoque de EPI aparece sinalizado quando disponível.

### Testes mínimos

- [ ] Teste automatizado cria EPI.
- [ ] Teste automatizado distribui EPI.
- [ ] Teste automatizado cria registo de resíduos.
- [ ] Teste automatizado cria registo de descontaminação.
- [ ] Teste manual valida telas principais.

---

## Fluxo 8 — Derrames, vacinação e inspeções

### Backend

- [ ] Derrames respondem via endpoint.
- [ ] Vacinação ocupacional responde via endpoint.
- [ ] Inspeções respondem via endpoint.
- [ ] Inspeção pode vincular não conformidade quando aplicável.
- [ ] Vacinação possui controlo de acesso restrito.

### Frontend

- [ ] Derrames aparecem no submenu de Biossegurança.
- [ ] Vacinação ocupacional aparece apenas para perfil autorizado.
- [ ] Inspeções aparecem com data, área, inspector e estado.
- [ ] Inspeção com achados críticos fica sinalizada.

### Testes mínimos

- [ ] Teste automatizado cria registo de derrame.
- [ ] Teste automatizado bloqueia vacinação para perfil não autorizado.
- [ ] Teste automatizado cria inspeção.
- [ ] Teste manual valida navegação e permissões.

---

## Segurança e permissões

- [ ] Recepção não encerra não conformidade crítica.
- [ ] Técnico não aprova documento da qualidade sem permissão.
- [ ] Apenas supervisor/gestor autorizado verifica eficácia de acção correctiva.
- [ ] Incidentes de exposição possuem acesso restrito.
- [ ] Vacinação ocupacional possui acesso restrito.
- [ ] Utilizador de outro tenant não vê qualidade/biossegurança de outro tenant.
- [ ] Frontend oculta acções proibidas.
- [ ] Backend bloqueia acções proibidas mesmo se chamadas manualmente.

---

## Estados recomendados

### Não conformidade

| Estado | Regra |
| --- | --- |
| `aberta` | Requer análise e/ou acção. |
| `em_investigacao` | Causa em análise. |
| `acao_planeada` | CAPA definida. |
| `em_execucao` | Acção em andamento. |
| `verificacao` | Aguardando verificação de eficácia. |
| `encerrada` | Fechada com evidência. |
| `cancelada` | Cancelada com motivo. |

### Acção correctiva

| Estado | Regra |
| --- | --- |
| `planeada` | Acção criada. |
| `em_execucao` | Em andamento. |
| `concluida` | Implementada. |
| `verificada` | Eficácia avaliada. |
| `fechada` | Encerrada. |
| `ineficaz` | Requer nova acção. |

### Incidente de exposição

| Estado | Regra |
| --- | --- |
| `reportado` | Incidente registado. |
| `em_avaliacao` | Avaliação em curso. |
| `acompanhamento` | Seguimento ocupacional. |
| `encerrado` | Fechado com evidência. |

---

## Dados de demonstração

Para beta, deve existir massa mínima de dados:

- [ ] 3 documentos da qualidade.
- [ ] 2 não conformidades.
- [ ] 2 acções correctivas.
- [ ] 1 auditoria interna.
- [ ] 2 achados de auditoria.
- [ ] 3 indicadores de qualidade.
- [ ] 2 registos de formação.
- [ ] 1 avaliação de competência.
- [ ] 1 avaliação de risco.
- [ ] 2 perigos biológicos.
- [ ] 1 incidente de exposição.
- [ ] 3 EPIs.
- [ ] 2 distribuições de EPIs.
- [ ] 1 inspeção de biossegurança.

---

## Critério para marcar como beta-ready

Qualidade e Biossegurança só podem ser marcadas como `beta-ready` quando:

- [ ] Menu Qualidade existe dentro de Laboratório.
- [ ] Menu Biossegurança existe dentro de Laboratório.
- [ ] Não conformidades aparecem no frontend.
- [ ] Acções correctivas aparecem no frontend.
- [ ] Incidentes de exposição aparecem no frontend com RBAC restrito.
- [ ] Inspeções de biossegurança aparecem no frontend.
- [ ] Acções críticas funcionam com permissão adequada.
- [ ] Tenant isolation foi testado.
- [ ] Dados sensíveis não aparecem para perfis não autorizados.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi actualizado após testagem manual.

---

## Próxima evolução recomendada

Após este readiness, implementar ou validar:

- dashboard de qualidade e biossegurança;
- alertas de acções vencidas;
- geração de PDF/relatório de auditoria;
- indicadores automáticos por período;
- integração entre incidente, não conformidade e acção correctiva;
- testes automatizados para permissões e tenant isolation.
