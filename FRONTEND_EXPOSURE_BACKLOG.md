# Backlog de Exposição Frontend

Backlog técnico derivado da varredura estática dos ViewSets e rotas da API.

Este documento lista recursos que já possuem sinal de existência no backend, mas precisam ser confirmados, organizados ou expostos correctamente no frontend.

---

## Base da varredura

A API v1 registra os ViewSets por domínio em `api/v1/routing/routes.py`.

O padrão de rota aplicado pelo roteador é:

```text
/api/v1/<domínio>/<recurso>/
```

Para o domínio de laboratório clínico, o prefixo é:

```text
/api/v1/clinical_laboratory/<recurso>/
```

---

## Prioridade 0 — Lacunas de frontend que bloqueiam beta

| Prioridade | Recurso | Endpoint esperado | Ação frontend necessária | Observação |
| --- | --- | --- | --- | --- |
| P0 | Requisições laboratoriais | `/api/v1/clinical_laboratory/order/` | Garantir listagem, detalhe, criar, editar e ações. | Deve ser recurso principal. |
| P0 | Itens da requisição | `/api/v1/clinical_laboratory/order_item/` | Renderizar apenas dentro do detalhe da requisição. | Não deve aparecer como lista solta. |
| P0 | Colheitas | `/api/v1/clinical_laboratory/collection/` | Expor listagem/detalhe/acções. | Fluxo de amostras depende disso. |
| P0 | Amostras | `/api/v1/clinical_laboratory/sample/` | Expor listagem/detalhe e ações receber/aceitar/rejeitar. | Rastreabilidade crítica. |
| P0 | Resultados | `/api/v1/clinical_laboratory/result/` | Expor lançamento e detalhe. | Deve ligar pedido, amostra e exame. |
| P0 | Validações | `/api/v1/clinical_laboratory/validation/` | Expor como ação/segunda camada de resultado. | Não deve ser recurso operacional solto para recepção. |
| P0 | Laudos | `/api/v1/clinical_laboratory/report/` | Expor detalhe, assinar, entregar, imprimir/exportar. | Crítico para operação clínica. |
| P0 | Faturas | `/api/v1/billing/invoice/` | Corrigir PDF/erro 500 e integração com serviço. | Bloqueador financeiro. |
| P0 | Lotes de farmácia | `/api/v1/pharmacy/lot/` | Corrigir erro reportado no frontend. | Bloqueador para farmácia. |
| P0 | Sessão ativa | endpoints auth/sessão | Confirmar renovação por atividade real. | Bloqueador global. |

---

## Prioridade 1 — Qualidade laboratorial

O backend possui ViewSets de qualidade dentro do domínio `clinical_laboratory`.

| Recurso | Endpoint esperado | Ação frontend necessária | Observação |
| --- | --- | --- | --- |
| Documentos da qualidade | `/api/v1/clinical_laboratory/quality_document/` | Criar menu Qualidade → Documentos. | Possui ação `aprovar`. |
| Não conformidades | `/api/v1/clinical_laboratory/nonconformity/` | Criar listagem, detalhe, criar e encerrar. | Possui ação `encerrar`. |
| Acções correctivas | `/api/v1/clinical_laboratory/corrective_action/` | Criar fluxo CAPA. | Possui ações `concluir`, `verificar`, `fechar`. |
| Auditorias internas | `/api/v1/clinical_laboratory/internal_audit/` | Criar listagem/detalhe. | Deve ligar achados. |
| Achados de auditoria | `/api/v1/clinical_laboratory/audit_finding/` | Expor dentro de auditoria e/ou lista filtrável. | Segunda camada recomendada. |
| Indicadores de qualidade | `/api/v1/clinical_laboratory/quality_indicator/` | Criar tela de indicadores. | Pode alimentar dashboard. |
| Registos de formação | `/api/v1/clinical_laboratory/training_record/` | Criar tela de formações. | Importante para conformidade. |
| Competências | `/api/v1/clinical_laboratory/competency/` | Criar tela de avaliação de competência. | Relacionar equipa/teste. |
| Reclamações | `/api/v1/clinical_laboratory/complaint/` | Criar tela de reclamações. | Pode originar NC. |
| Avaliação de risco | `/api/v1/clinical_laboratory/risk_assessment/` | Criar tela de riscos. | Ponte com biossegurança. |
| Revisão pela gestão | `/api/v1/clinical_laboratory/management_review/` | Criar tela de revisão pela gestão. | Necessária para maturidade ISO. |

### Organização frontend recomendada

```text
Laboratório
  Qualidade
    Documentos
    Não conformidades
    Acções correctivas
    Auditorias internas
    Indicadores
    Formação e competência
    Reclamações
    Riscos
    Revisão pela gestão
```

---

## Prioridade 1 — Biossegurança

O backend possui ViewSets de biossegurança dentro do domínio `clinical_laboratory`.

| Recurso | Endpoint esperado | Ação frontend necessária | Observação |
| --- | --- | --- | --- |
| Perigos biológicos | `/api/v1/clinical_laboratory/hazard/` | Criar catálogo de perigos. | Pode ser cadastro base. |
| Incidentes de exposição | `/api/v1/clinical_laboratory/exposure_incident/` | Criar fluxo de incidente. | Dados sensíveis; RBAC restrito. |
| EPIs | `/api/v1/clinical_laboratory/ppe/` | Criar cadastro/estoque de EPIs. | Deve mostrar mínimo/actual. |
| Distribuição de EPIs | `/api/v1/clinical_laboratory/ppe_distribution/` | Criar registo de entrega. | Vincular staff/departamento. |
| Resíduos | `/api/v1/clinical_laboratory/waste/` | Criar registo de resíduos. | Rastreabilidade operacional. |
| Descontaminação | `/api/v1/clinical_laboratory/decontamination/` | Criar registo de descontaminação. | Área, produto, equipamento. |
| Resposta a derrames | `/api/v1/clinical_laboratory/spill/` | Criar fluxo de derrames. | Pode ligar a incidente. |
| Vacinação ocupacional | `/api/v1/clinical_laboratory/vaccination/` | Criar tela restrita. | Dado sensível. |
| Inspeções de biossegurança | `/api/v1/clinical_laboratory/biosafety_inspection/` | Criar tela de inspeções. | Pode gerar NC/achado. |

### Organização frontend recomendada

```text
Laboratório
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

## Prioridade 1 — Microbiologia e exames especiais

| Recurso | Endpoint esperado | Ação frontend necessária | Observação |
| --- | --- | --- | --- |
| Culturas | `/api/v1/clinical_laboratory/culture/` | Criar fluxo de microbiologia. | Vincular amostra/item. |
| Isolados | `/api/v1/clinical_laboratory/isolate/` | Expor dentro da cultura. | Segunda camada recomendada. |
| Antibiograma | `/api/v1/clinical_laboratory/antibiogram/` | Expor dentro do isolado/cultura. | Segunda camada recomendada. |
| Resultado molecular | `/api/v1/clinical_laboratory/molecular_result/` | Criar tela de biologia molecular. | Pode ficar beta interna. |
| Baciloscopia | `/api/v1/clinical_laboratory/afb_smear/` | Criar tela de baciloscopia. | Pode ficar beta interna. |
| Notificação crítica | `/api/v1/clinical_laboratory/critical_notification/` | Expor para supervisor/clinico. | Importante para resultados críticos. |

---

## Prioridade 2 — Catálogo de recursos da IA/AutoForm

Foi observado que o catálogo de recursos contém entradas antigas como:

```text
clinical-labrequest
clinical-labrequestitem
clinical-resultitem
clinical-exam
clinical-sample
```

Mas os endpoints novos do LIS estão no domínio:

```text
clinical_laboratory-*
```

### Lacuna provável

O assistente interno, AutoForm, registry ou qualquer camada de descoberta pode continuar sugerindo recursos antigos de `clinical-*`, enquanto o backend novo opera em `clinical_laboratory-*`.

### Ação recomendada

Adicionar labels e aliases para os recursos novos:

```text
clinical_laboratory-sector
clinical_laboratory-test
clinical_laboratory-panel
clinical_laboratory-order
clinical_laboratory-order_item
clinical_laboratory-collection
clinical_laboratory-sample
clinical_laboratory-reception
clinical_laboratory-rejection
clinical_laboratory-worklist
clinical_laboratory-result
clinical_laboratory-validation
clinical_laboratory-report
clinical_laboratory-quality_document
clinical_laboratory-nonconformity
clinical_laboratory-corrective_action
clinical_laboratory-hazard
clinical_laboratory-exposure_incident
clinical_laboratory-ppe
clinical_laboratory-biosafety_inspection
```

---

## Regras de implementação frontend

1. **Listas principais**
   - order, collection, sample, result, report, quality_document, nonconformity, hazard, exposure_incident devem ter listagem própria.

2. **Segunda camada**
   - order_item deve aparecer dentro de order.
   - validation deve aparecer dentro de result/report.
   - isolate deve aparecer dentro de culture.
   - antibiogram deve aparecer dentro de isolate/culture.
   - audit_finding deve aparecer dentro de internal_audit.

3. **Ações**
   - Ações críticas devem ficar no detalhe do recurso e respeitar RBAC.

4. **Estados visuais**
   - loading, empty, error e forbidden devem estar tratados.

5. **Menus**
   - Qualidade e Biossegurança devem ser submenus de Laboratório, não módulos soltos sem contexto.

---

## Critério de conclusão deste backlog

Este backlog pode ser marcado como concluído quando:

- [ ] todos os recursos P0 aparecem no frontend;
- [ ] Qualidade possui menu e telas principais;
- [ ] Biossegurança possui menu e telas principais;
- [ ] recursos de segunda camada não aparecem como listas soltas indevidas;
- [ ] catálogo/registry reconhece `clinical_laboratory-*`;
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi atualizado com resultado real da testagem;
- [ ] fluxo laboratório → faturamento → pagamento foi testado manualmente.
