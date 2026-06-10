# Lacunas do Catálogo de Recursos — `clinical_laboratory`

Documento técnico para alinhar o catálogo de recursos, aliases, AutoForm, IA operacional, menus e frontend com os endpoints reais do módulo de Laboratório Clínico.

---

## Contexto

A varredura estática indicou que o backend possui ViewSets reais para o domínio:

```text
clinical_laboratory
```

O padrão esperado de endpoint é:

```text
/api/v1/clinical_laboratory/<resource>/
```

Porém, o catálogo de recursos analisado ainda mostra recursos antigos ou genéricos como:

```text
clinical-labrequest
clinical-labrequestitem
clinical-resultitem
clinical-exam
clinical-sample
```

Esses recursos antigos podem continuar úteis para o domínio `clinical`, mas não devem impedir que o novo domínio `clinical_laboratory` seja descoberto, exibido, pesquisado e usado pelo frontend/IA.

---

## Problema

Se o catálogo/registry não reconhecer `clinical_laboratory-*`, podem ocorrer falhas como:

1. IA interna não encontra corretamente recursos de laboratório clínico.
2. AutoForm ou telas genéricas não geram formulários para endpoints novos.
3. Menus usam nomes antigos e apontam para endpoints errados.
4. Recursos de qualidade e biossegurança ficam invisíveis mesmo existindo no backend.
5. Itens de pedido podem aparecer como recurso solto em vez de segunda camada.
6. A equipa pode acreditar que não existe API, quando a API existe mas não foi exposta no frontend.

---

## Regra de nomenclatura recomendada

Usar o formato:

```text
<domain>-<resource>
```

Para o domínio de Laboratório Clínico:

```text
clinical_laboratory-sector
clinical_laboratory-test
clinical_laboratory-panel
clinical_laboratory-order
clinical_laboratory-order_item
```

O hífen separa domínio/recurso no identificador de catálogo; o underscore permanece dentro do nome real do domínio e do recurso quando necessário.

---

## Recursos obrigatórios no catálogo

### Núcleo do laboratório

| Resource key | Label PT | Label EN | Endpoint esperado | Exposição frontend |
| --- | --- | --- | --- | --- |
| `clinical_laboratory-sector` | Setores do laboratório | Laboratory sectors | `/api/v1/clinical_laboratory/sector/` | Lista própria |
| `clinical_laboratory-test` | Exames laboratoriais | Laboratory tests | `/api/v1/clinical_laboratory/test/` | Lista própria + seletor filtrável |
| `clinical_laboratory-panel` | Painéis de exames | Test panels | `/api/v1/clinical_laboratory/panel/` | Lista própria |
| `clinical_laboratory-order` | Requisições laboratoriais | Laboratory orders | `/api/v1/clinical_laboratory/order/` | Lista principal |
| `clinical_laboratory-order_item` | Itens da requisição laboratorial | Laboratory order items | `/api/v1/clinical_laboratory/order_item/` | Segunda camada dentro da requisição |
| `clinical_laboratory-collection` | Colheitas | Sample collections | `/api/v1/clinical_laboratory/collection/` | Lista própria |
| `clinical_laboratory-sample` | Amostras laboratoriais | Laboratory samples | `/api/v1/clinical_laboratory/sample/` | Lista própria |
| `clinical_laboratory-reception` | Recepção de amostras | Sample reception | `/api/v1/clinical_laboratory/reception/` | Lista própria ou ação da amostra |
| `clinical_laboratory-rejection` | Rejeições de amostras | Sample rejections | `/api/v1/clinical_laboratory/rejection/` | Lista própria ou ação da amostra |
| `clinical_laboratory-worklist` | Listas de trabalho | Worklists | `/api/v1/clinical_laboratory/worklist/` | Lista própria |
| `clinical_laboratory-result` | Resultados laboratoriais | Laboratory results | `/api/v1/clinical_laboratory/result/` | Lista própria + detalhe |
| `clinical_laboratory-validation` | Validações de resultados | Result validations | `/api/v1/clinical_laboratory/validation/` | Segunda camada dentro de resultado/laudo |
| `clinical_laboratory-report` | Laudos laboratoriais | Laboratory reports | `/api/v1/clinical_laboratory/report/` | Lista própria + detalhe |
| `clinical_laboratory-critical_notification` | Notificações de resultado crítico | Critical result notifications | `/api/v1/clinical_laboratory/critical_notification/` | Lista restrita |

---

## Recursos de microbiologia e exames especiais

| Resource key | Label PT | Label EN | Endpoint esperado | Exposição frontend |
| --- | --- | --- | --- | --- |
| `clinical_laboratory-culture` | Culturas microbiológicas | Microbiology cultures | `/api/v1/clinical_laboratory/culture/` | Lista própria ou subfluxo |
| `clinical_laboratory-isolate` | Isolados microbiológicos | Microbiology isolates | `/api/v1/clinical_laboratory/isolate/` | Segunda camada dentro da cultura |
| `clinical_laboratory-antibiogram` | Antibiogramas | Antibiograms | `/api/v1/clinical_laboratory/antibiogram/` | Segunda camada dentro do isolado/cultura |
| `clinical_laboratory-molecular_result` | Resultados moleculares | Molecular results | `/api/v1/clinical_laboratory/molecular_result/` | Lista própria ou beta interna |
| `clinical_laboratory-afb_smear` | Baciloscopias | Acid-fast smears | `/api/v1/clinical_laboratory/afb_smear/` | Lista própria ou beta interna |

---

## Recursos de gestão da qualidade

| Resource key | Label PT | Label EN | Endpoint esperado | Exposição frontend |
| --- | --- | --- | --- | --- |
| `clinical_laboratory-quality_document` | Documentos da qualidade | Quality documents | `/api/v1/clinical_laboratory/quality_document/` | Qualidade → Documentos |
| `clinical_laboratory-nonconformity` | Não conformidades | Nonconformities | `/api/v1/clinical_laboratory/nonconformity/` | Qualidade → Não conformidades |
| `clinical_laboratory-corrective_action` | Acções correctivas | Corrective actions | `/api/v1/clinical_laboratory/corrective_action/` | Qualidade → CAPA |
| `clinical_laboratory-internal_audit` | Auditorias internas | Internal audits | `/api/v1/clinical_laboratory/internal_audit/` | Qualidade → Auditorias |
| `clinical_laboratory-audit_finding` | Achados de auditoria | Audit findings | `/api/v1/clinical_laboratory/audit_finding/` | Segunda camada dentro da auditoria |
| `clinical_laboratory-quality_indicator` | Indicadores da qualidade | Quality indicators | `/api/v1/clinical_laboratory/quality_indicator/` | Qualidade → Indicadores |
| `clinical_laboratory-training_record` | Registos de formação | Training records | `/api/v1/clinical_laboratory/training_record/` | Qualidade → Formação |
| `clinical_laboratory-competency` | Avaliações de competência | Competency assessments | `/api/v1/clinical_laboratory/competency/` | Qualidade → Competência |
| `clinical_laboratory-complaint` | Reclamações | Complaints | `/api/v1/clinical_laboratory/complaint/` | Qualidade → Reclamações |
| `clinical_laboratory-risk_assessment` | Avaliações de risco | Risk assessments | `/api/v1/clinical_laboratory/risk_assessment/` | Qualidade → Riscos |
| `clinical_laboratory-management_review` | Revisões pela gestão | Management reviews | `/api/v1/clinical_laboratory/management_review/` | Qualidade → Revisão pela gestão |

---

## Recursos de biossegurança

| Resource key | Label PT | Label EN | Endpoint esperado | Exposição frontend |
| --- | --- | --- | --- | --- |
| `clinical_laboratory-hazard` | Perigos biológicos | Biological hazards | `/api/v1/clinical_laboratory/hazard/` | Biossegurança → Perigos |
| `clinical_laboratory-exposure_incident` | Incidentes de exposição | Exposure incidents | `/api/v1/clinical_laboratory/exposure_incident/` | Biossegurança → Incidentes |
| `clinical_laboratory-ppe` | EPIs | PPE items | `/api/v1/clinical_laboratory/ppe/` | Biossegurança → EPIs |
| `clinical_laboratory-ppe_distribution` | Distribuição de EPIs | PPE distributions | `/api/v1/clinical_laboratory/ppe_distribution/` | Biossegurança → Distribuição |
| `clinical_laboratory-waste` | Resíduos laboratoriais | Laboratory waste records | `/api/v1/clinical_laboratory/waste/` | Biossegurança → Resíduos |
| `clinical_laboratory-decontamination` | Descontaminações | Decontamination records | `/api/v1/clinical_laboratory/decontamination/` | Biossegurança → Descontaminação |
| `clinical_laboratory-spill` | Derrames | Spill response records | `/api/v1/clinical_laboratory/spill/` | Biossegurança → Derrames |
| `clinical_laboratory-vaccination` | Vacinação ocupacional | Occupational vaccinations | `/api/v1/clinical_laboratory/vaccination/` | Biossegurança → Vacinação restrita |
| `clinical_laboratory-biosafety_inspection` | Inspeções de biossegurança | Biosafety inspections | `/api/v1/clinical_laboratory/biosafety_inspection/` | Biossegurança → Inspeções |

---

## Aliases recomendados

### `clinical_laboratory-order`

```text
requisição laboratorial
requisicao laboratorial
pedido laboratorial
pedido de laboratório
pedido de laboratorio
lab order
laboratory order
requisições de exames
pedidos de exames
```

### `clinical_laboratory-test`

```text
exame laboratorial
exames laboratoriais
análise laboratorial
analises laboratoriais
teste laboratorial
lab test
laboratory test
catálogo de exames
catalogo de exames
```

### `clinical_laboratory-sample`

```text
amostra
amostras
amostra laboratorial
amostra biológica
amostra biologica
sample
laboratory sample
biological sample
```

### `clinical_laboratory-result`

```text
resultado laboratorial
resultados laboratoriais
resultado de exame
lançamento de resultado
lancamento de resultado
laboratory result
lab result
```

### `clinical_laboratory-report`

```text
laudo
laudos
laudo laboratorial
relatório laboratorial
relatorio laboratorial
laboratory report
lab report
```

### `clinical_laboratory-nonconformity`

```text
não conformidade
nao conformidade
não conformidades
nao conformidades
ocorrência da qualidade
ocorrencia da qualidade
nonconformity
quality nonconformity
```

### `clinical_laboratory-corrective_action`

```text
acção correctiva
ação corretiva
acao corretiva
CAPA
acção preventiva
ação preventiva
corrective action
preventive action
```

### `clinical_laboratory-exposure_incident`

```text
incidente de exposição
incidente de exposicao
exposição ocupacional
exposicao ocupacional
acidente biológico
acidente biologico
exposure incident
occupational exposure
```

### `clinical_laboratory-biosafety_inspection`

```text
inspeção de biossegurança
inspecao de biosseguranca
inspeções de biossegurança
inspecoes de biosseguranca
biosafety inspection
biosafety audit
```

---

## Relação com recursos antigos `clinical-*`

Os recursos antigos podem permanecer para compatibilidade, mas devem ser tratados com cuidado.

| Recurso antigo | Possível recurso novo | Regra recomendada |
| --- | --- | --- |
| `clinical-labrequest` | `clinical_laboratory-order` | Novo LIS deve usar `clinical_laboratory-order`. |
| `clinical-labrequestitem` | `clinical_laboratory-order_item` | Deve aparecer como segunda camada. |
| `clinical-resultitem` | `clinical_laboratory-result` | Resultado novo deve usar `clinical_laboratory-result`. |
| `clinical-exam` | `clinical_laboratory-test` | Catálogo novo deve usar `clinical_laboratory-test`. |
| `clinical-sample` | `clinical_laboratory-sample` | Amostra nova deve usar `clinical_laboratory-sample`. |

---

## Estratégia de migração segura

1. **Adicionar labels e aliases novos sem remover os antigos.**
2. **Criar redirecionamento lógico no frontend quando o utilizador pesquisar por termos antigos.**
3. **Marcar recursos antigos como compatibilidade/legado quando houver tela nova equivalente.**
4. **Garantir que menus da beta apontem para `clinical_laboratory-*`.**
5. **Manter itens de pedido/resultados/achados como segunda camada quando necessário.**
6. **Validar permissões antes de expor ações críticas.**

---

## Critério de conclusão

Esta lacuna estará fechada quando:

- [ ] `clinical_laboratory-*` existir no catálogo de recursos.
- [ ] aliases principais estiverem registrados.
- [ ] menus de Laboratório apontarem para recursos novos.
- [ ] IA/assistente conseguir localizar pedidos, amostras, resultados, laudos, qualidade e biossegurança.
- [ ] recursos antigos `clinical-*` não causarem ambiguidade na beta.
- [ ] `FRONTEND_EXPOSURE_BACKLOG.md` estiver sincronizado com a implementação real.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` estiver atualizado após testagem.

---

## Próxima tarefa recomendada

Após este documento, a próxima tarefa sem terminal é criar uma proposta de patch para `apps/ai_assistant/tools/resource_catalog.py`, adicionando:

- `MODULE_LABELS["clinical_laboratory"]`;
- labels `RESOURCE_LABELS` para recursos `clinical_laboratory-*`;
- aliases `RESOURCE_ALIASES` para os recursos mais pesquisados.
