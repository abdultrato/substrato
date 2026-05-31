# IA Operacional - Normalizacao De Aliases Fase 3

Gerado em UTC: 2026-05-30T20:44:22.148702+00:00

## Resumo

- Entradas de alias: 39020
- Aliases normalizados unicos: 6198
- Recursos cobertos: 227
- Modulos cobertos: 37
- Aliases ambiguos detectados: 1363

## Fontes

- `canonical_resource_alias`: 51
- `model_field`: 9500
- `module_alias`: 2554
- `ordering_field`: 661
- `resource_alias`: 1948
- `resource_identity`: 2729
- `search_field`: 950
- `serializer_canonical_field`: 10649
- `serializer_input_alias`: 4883
- `serializer_output_alias`: 4788
- `viewset_action`: 307

## Probes

| Entrada | Primeiros recursos encontrados |
| --- | --- |
| `dente` | dental-odontogram (992), dental-prosthesis_lab_order (841), dental-treatment_item (779), dental-appointment (624), dental-patient_treatment_plan (624) |
| `odontologia` | dental-appointment (312), dental-odontogram (312), dental-treatment_item (312), dental-prosthesis_lab_order (312), dental-patient_treatment_plan (312) |
| `planos dentarios expirados` | dental-patient_treatment_plan (1278) |
| `plano dentario valido` | dental-patient_treatment_plan (1134), dental-treatment_plan (794) |
| `historico dentario` | dental-record (1148) |
| `consulta dentaria` | dental-appointment (1050), dental-treatment_item (749), dental-record (749), dental-odontogram (708), dental-prosthesis_lab_order (708) |
| `stock` | warehouse-warehouse (792), warehouse-item_category (792), warehouse-shipment (792), warehouse-cycle_count (792), warehouse-item (792) |
| `faturas pendentes` | billing-invoice (427) |
| `funcionarios ferias` | human_resources-employee (942), human_resources-ferias (884) |

## Achados Prioritarios

- Aliases de modulos, recursos, serializers, campos e acoes agora passam por um indice canonico unico.
- O matching de recursos passa a tolerar acentos, separadores, plurais simples e termos de serializers.
- 1363 aliases continuam ambiguos e devem ser revistos com contexto activo; primeiros: atualizado em, atualizado por, deletado por, eliminado, eliminado em, versao, version, tenant id.
- A fase 4 deve usar este indice para normalizar texto livre antes da decisao de intencao.
