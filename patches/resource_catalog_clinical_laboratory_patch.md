# Patch Orientado — Catálogo `clinical_laboratory`

Este patch orientado descreve a alteração segura a aplicar em:

```text
apps/ai_assistant/tools/resource_catalog.py
```

Motivo: o ficheiro é longo e não deve ser substituído manualmente sem validação local. Este documento permite aplicar a alteração com Codex, terminal ou edição manual controlada.

---

## Objectivo

Adicionar suporte explícito ao domínio:

```text
clinical_laboratory
```

no catálogo de recursos usado pela IA operacional, descoberta de recursos, AutoForm e possíveis menus genéricos.

---

## 1. Adicionar em `MODULE_LABELS`

Localizar:

```python
MODULE_LABELS: dict[str, tuple[str, str]] = {
    "audit": ("Auditoria", "Audit"),
    "dashboard": ("Dashboard", "Dashboard"),
    "clinical": ("Clínico", "Clinical"),
```

Adicionar logo após `clinical`:

```python
    "clinical_laboratory": ("Laboratório Clínico", "Clinical laboratory"),
```

Resultado esperado:

```python
MODULE_LABELS: dict[str, tuple[str, str]] = {
    "audit": ("Auditoria", "Audit"),
    "dashboard": ("Dashboard", "Dashboard"),
    "clinical": ("Clínico", "Clinical"),
    "clinical_laboratory": ("Laboratório Clínico", "Clinical laboratory"),
    "consultations": ("Consultas", "Consultations"),
```

---

## 2. Adicionar labels em `RESOURCE_LABELS`

Localizar o bloco:

```python
RESOURCE_LABELS: dict[str, tuple[str, str]] = {
```

Adicionar as entradas abaixo perto dos recursos `clinical-*`:

```python
    # Laboratório Clínico — LIS
    "clinical_laboratory-sector": ("Setores do laboratório", "Laboratory sectors"),
    "clinical_laboratory-test": ("Exames laboratoriais", "Laboratory tests"),
    "clinical_laboratory-panel": ("Painéis de exames", "Test panels"),
    "clinical_laboratory-order": ("Requisições laboratoriais", "Laboratory orders"),
    "clinical_laboratory-order_item": ("Itens da requisição laboratorial", "Laboratory order items"),
    "clinical_laboratory-collection": ("Colheitas", "Sample collections"),
    "clinical_laboratory-sample": ("Amostras laboratoriais", "Laboratory samples"),
    "clinical_laboratory-reception": ("Recepção de amostras", "Sample reception"),
    "clinical_laboratory-rejection": ("Rejeições de amostras", "Sample rejections"),
    "clinical_laboratory-worklist": ("Listas de trabalho", "Worklists"),
    "clinical_laboratory-result": ("Resultados laboratoriais", "Laboratory results"),
    "clinical_laboratory-validation": ("Validações de resultados", "Result validations"),
    "clinical_laboratory-report": ("Laudos laboratoriais", "Laboratory reports"),
    "clinical_laboratory-critical_notification": ("Notificações de resultado crítico", "Critical result notifications"),
    "clinical_laboratory-culture": ("Culturas microbiológicas", "Microbiology cultures"),
    "clinical_laboratory-isolate": ("Isolados microbiológicos", "Microbiology isolates"),
    "clinical_laboratory-antibiogram": ("Antibiogramas", "Antibiograms"),
    "clinical_laboratory-molecular_result": ("Resultados moleculares", "Molecular results"),
    "clinical_laboratory-afb_smear": ("Baciloscopias", "Acid-fast smears"),
    "clinical_laboratory-quality_document": ("Documentos da qualidade", "Quality documents"),
    "clinical_laboratory-nonconformity": ("Não conformidades", "Nonconformities"),
    "clinical_laboratory-corrective_action": ("Acções correctivas", "Corrective actions"),
    "clinical_laboratory-internal_audit": ("Auditorias internas", "Internal audits"),
    "clinical_laboratory-audit_finding": ("Achados de auditoria", "Audit findings"),
    "clinical_laboratory-quality_indicator": ("Indicadores da qualidade", "Quality indicators"),
    "clinical_laboratory-training_record": ("Registos de formação", "Training records"),
    "clinical_laboratory-competency": ("Avaliações de competência", "Competency assessments"),
    "clinical_laboratory-complaint": ("Reclamações", "Complaints"),
    "clinical_laboratory-risk_assessment": ("Avaliações de risco", "Risk assessments"),
    "clinical_laboratory-management_review": ("Revisões pela gestão", "Management reviews"),
    "clinical_laboratory-hazard": ("Perigos biológicos", "Biological hazards"),
    "clinical_laboratory-exposure_incident": ("Incidentes de exposição", "Exposure incidents"),
    "clinical_laboratory-ppe": ("EPIs", "PPE items"),
    "clinical_laboratory-ppe_distribution": ("Distribuição de EPIs", "PPE distributions"),
    "clinical_laboratory-waste": ("Resíduos laboratoriais", "Laboratory waste records"),
    "clinical_laboratory-decontamination": ("Descontaminações", "Decontamination records"),
    "clinical_laboratory-spill": ("Derrames", "Spill response records"),
    "clinical_laboratory-vaccination": ("Vacinação ocupacional", "Occupational vaccinations"),
    "clinical_laboratory-biosafety_inspection": ("Inspeções de biossegurança", "Biosafety inspections"),
```

---

## 3. Adicionar aliases em `RESOURCE_ALIASES`

Localizar:

```python
RESOURCE_ALIASES: dict[str, tuple[str, ...]] = {
```

Adicionar as entradas abaixo perto dos aliases `clinical-*`:

```python
    # Laboratório Clínico — LIS
    "clinical_laboratory-order": (
        "requisição laboratorial",
        "requisicao laboratorial",
        "requisições laboratoriais",
        "requisicoes laboratoriais",
        "pedido laboratorial",
        "pedido de laboratório",
        "pedido de laboratorio",
        "requisição de exames",
        "requisicao de exames",
        "pedidos de exames",
        "lab order",
        "laboratory order",
        "laboratory orders",
    ),
    "clinical_laboratory-order_item": (
        "item da requisição laboratorial",
        "item da requisicao laboratorial",
        "itens da requisição",
        "itens da requisicao",
        "item de pedido laboratorial",
        "laboratory order item",
        "order item",
    ),
    "clinical_laboratory-test": (
        "exame laboratorial",
        "exames laboratoriais",
        "análise laboratorial",
        "analise laboratorial",
        "análises laboratoriais",
        "analises laboratoriais",
        "teste laboratorial",
        "catálogo de exames",
        "catalogo de exames",
        "lab test",
        "laboratory test",
        "laboratory tests",
    ),
    "clinical_laboratory-panel": (
        "painel de exames",
        "painéis de exames",
        "paineis de exames",
        "grupo de exames",
        "pacote de exames",
        "test panel",
        "laboratory panel",
    ),
    "clinical_laboratory-sample": (
        "amostra",
        "amostras",
        "amostra laboratorial",
        "amostra biológica",
        "amostra biologica",
        "sample",
        "laboratory sample",
        "biological sample",
    ),
    "clinical_laboratory-collection": (
        "colheita",
        "colheitas",
        "coleta",
        "coletas",
        "colheita de amostra",
        "sample collection",
    ),
    "clinical_laboratory-reception": (
        "recepção de amostra",
        "recepcao de amostra",
        "recepção de amostras",
        "recepcao de amostras",
        "sample reception",
    ),
    "clinical_laboratory-rejection": (
        "rejeição de amostra",
        "rejeicao de amostra",
        "rejeições de amostras",
        "rejeicoes de amostras",
        "sample rejection",
    ),
    "clinical_laboratory-worklist": (
        "lista de trabalho",
        "listas de trabalho",
        "bancada",
        "worklist",
        "laboratory worklist",
    ),
    "clinical_laboratory-result": (
        "resultado laboratorial",
        "resultados laboratoriais",
        "resultado de exame",
        "lançamento de resultado",
        "lancamento de resultado",
        "lab result",
        "laboratory result",
    ),
    "clinical_laboratory-validation": (
        "validação de resultado",
        "validacao de resultado",
        "validações de resultados",
        "validacoes de resultados",
        "result validation",
    ),
    "clinical_laboratory-report": (
        "laudo",
        "laudos",
        "laudo laboratorial",
        "relatório laboratorial",
        "relatorio laboratorial",
        "lab report",
        "laboratory report",
    ),
    "clinical_laboratory-nonconformity": (
        "não conformidade",
        "nao conformidade",
        "não conformidades",
        "nao conformidades",
        "ocorrência da qualidade",
        "ocorrencia da qualidade",
        "nonconformity",
        "quality nonconformity",
    ),
    "clinical_laboratory-corrective_action": (
        "acção correctiva",
        "ação corretiva",
        "acao corretiva",
        "acção preventiva",
        "ação preventiva",
        "capa",
        "CAPA",
        "corrective action",
        "preventive action",
    ),
    "clinical_laboratory-quality_document": (
        "documento da qualidade",
        "documentos da qualidade",
        "procedimento da qualidade",
        "manual da qualidade",
        "quality document",
    ),
    "clinical_laboratory-internal_audit": (
        "auditoria interna",
        "auditorias internas",
        "internal audit",
    ),
    "clinical_laboratory-hazard": (
        "perigo biológico",
        "perigo biologico",
        "perigos biológicos",
        "perigos biologicos",
        "biological hazard",
    ),
    "clinical_laboratory-exposure_incident": (
        "incidente de exposição",
        "incidente de exposicao",
        "exposição ocupacional",
        "exposicao ocupacional",
        "acidente biológico",
        "acidente biologico",
        "exposure incident",
        "occupational exposure",
    ),
    "clinical_laboratory-ppe": (
        "epi",
        "epis",
        "equipamento de proteção individual",
        "equipamento de protecao individual",
        "ppe",
        "personal protective equipment",
    ),
    "clinical_laboratory-biosafety_inspection": (
        "inspeção de biossegurança",
        "inspecao de biosseguranca",
        "inspeções de biossegurança",
        "inspecoes de biosseguranca",
        "biosafety inspection",
        "biosafety audit",
    ),
```

---

## 4. Verificações após aplicar

Executar localmente:

```bash
python manage.py check
python -m pytest apps/ai_assistant -q
ruff check apps/ai_assistant/tools/resource_catalog.py
```

Se houver testes específicos do catálogo:

```bash
python -m pytest apps/ai_assistant/tests -q
```

---

## 5. Resultado esperado

Depois do patch:

- IA interna deve reconhecer `clinical_laboratory` como módulo.
- Pesquisa por “requisição laboratorial” deve apontar para `clinical_laboratory-order`.
- Pesquisa por “amostra” deve conseguir apontar para `clinical_laboratory-sample`.
- Pesquisa por “não conformidade” deve apontar para `clinical_laboratory-nonconformity`.
- Pesquisa por “incidente de exposição” deve apontar para `clinical_laboratory-exposure_incident`.
- Pesquisa por “inspeção de biossegurança” deve apontar para `clinical_laboratory-biosafety_inspection`.

---

## 6. Cuidados

- Não remover os aliases antigos `clinical-*` de imediato.
- Não trocar todos os recursos antigos automaticamente sem confirmar compatibilidade.
- Garantir que `clinical_laboratory-order_item` continue como segunda camada no frontend.
- Garantir que validações, isolados, antibiogramas e achados de auditoria não virem listas soltas indevidas para perfis operacionais.
