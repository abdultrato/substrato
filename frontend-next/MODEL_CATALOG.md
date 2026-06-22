# Backend Model Catalog

Source of truth for frontend/backend contract alignment.


## Regeneration

```bash
.venv/bin/python scripts/export_model_catalog.py
```

- JSON: `frontend-next/model_catalog.json`

## Totals

- apps: 40
- models: 256
- fields: 5333
- fields_with_choices: 330
- choices_total_items: 2040

## By app/model

### ai_assistant

#### ai_assistant.AiInvestigation

- verbose_name: Investigação da IA
- db_table: ai_assistant_investigation
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| confidence_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| findings | JSONField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| intent | CharField | no |  | 0 |
| next_steps | JSONField | no |  | 0 |
| question | TextField | no |  | 0 |
| recommended_questions | JSONField | no |  | 0 |
| result_summary | TextField | no |  | 0 |
| scope | JSONField | no |  | 0 |
| session | ForeignKey | yes | fk:ai_assistant.AiSession | 0 |
| sources | JSONField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| tool_names | JSONField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `open`=Aberta; `ready`=Pronta; `blocked`=Bloqueada; `archived`=Arquivada

#### ai_assistant.AiKnowledgeEntry

- verbose_name: Entrada de Conhecimento da IA
- db_table: ai_assistant_knowledge_entry
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| aliases_en | JSONField | no |  | 0 |
| aliases_pt | JSONField | no |  | 0 |
| answer_en | TextField | no |  | 0 |
| answer_pt | TextField | yes |  | 0 |
| category | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| follow_ups_en | JSONField | no |  | 0 |
| follow_ups_pt | JSONField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| module_key | CharField | no |  | 0 |
| priority | PositiveSmallIntegerField | yes |  | 0 |
| questions_en | JSONField | no |  | 0 |
| questions_pt | JSONField | no |  | 0 |
| semantic_terms | JSONField | no |  | 0 |
| slug | SlugField | yes |  | 0 |
| source | CharField | yes |  | 3 |
| status | CharField | yes |  | 3 |
| tags | JSONField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- source (3): `custom`=Personalizada; `system_override`=Substitui entrada do sistema; `imported`=Importada
- status (3): `draft`=Rascunho; `active`=Activa; `archived`=Arquivada

#### ai_assistant.AiMessage

- verbose_name: Mensagem da IA
- db_table: ai_assistant_message
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| content | TextField | no |  | 0 |
| content_redacted | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| role | CharField | yes |  | 4 |
| session | ForeignKey | yes | fk:ai_assistant.AiSession | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| token_input_count | PositiveIntegerField | yes |  | 0 |
| token_output_count | PositiveIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- role (4): `user`=Utilizador; `assistant`=Assistente; `system`=Sistema; `tool`=Ferramenta

#### ai_assistant.AiOperationalTask

- verbose_name: Tarefa Operacional da IA
- db_table: ai_assistant_operational_task
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| action | OneToOneField | no | fk:ai_assistant.AiSuggestedAction | 0 |
| assigned_group | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| due_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| module_key | CharField | no |  | 0 |
| priority | CharField | yes |  | 4 |
| session | ForeignKey | yes | fk:ai_assistant.AiSession | 0 |
| source_reference | CharField | no |  | 0 |
| source_type | CharField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- priority (4): `low`=Baixa; `normal`=Normal; `high`=Alta; `critical`=Crítica
- status (4): `open`=Aberta; `in_progress`=Em execução; `done`=Concluída; `cancelled`=Cancelada

#### ai_assistant.AiPolicyEvent

- verbose_name: Evento de Política da IA
- db_table: ai_assistant_policy_event
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| blocked | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| policy_key | CharField | yes |  | 0 |
| reason | TextField | no |  | 0 |
| session | ForeignKey | no | fk:ai_assistant.AiSession | 0 |
| severity | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- severity (3): `info`=Informação; `warning`=Aviso; `critical`=Crítico

#### ai_assistant.AiSession

- verbose_name: Sessão da IA
- db_table: ai_assistant_session
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active_module | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| language | CharField | yes |  | 2 |
| last_message_at | DateTimeField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- language (2): `pt`=Português; `en`=Inglês
- status (3): `active`=Activa; `closed`=Encerrada; `archived`=Arquivada

#### ai_assistant.AiSuggestedAction

- verbose_name: Acção Sugerida pela IA
- db_table: ai_assistant_suggested_action
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| action_type | CharField | yes |  | 0 |
| confirmation_summary | TextField | no |  | 0 |
| confirmed_at | DateTimeField | no |  | 0 |
| confirmed_by | ForeignKey | no | fk:identidade.User | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| executed_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| payload | JSONField | no |  | 0 |
| payload_redacted | JSONField | no |  | 0 |
| requires_confirmation | BooleanField | yes |  | 0 |
| result_href | CharField | no |  | 0 |
| result_summary | TextField | no |  | 0 |
| session | ForeignKey | yes | fk:ai_assistant.AiSession | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `pending_confirmation`=Pendente de confirmação; `confirmed`=Confirmada; `cancelled`=Cancelada; `expired`=Expirada; `failed`=Falhada

#### ai_assistant.AiToolCall

- verbose_name: Chamada de Ferramenta da IA
- db_table: ai_assistant_tool_call
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| duration_ms | PositiveIntegerField | no |  | 0 |
| error_message | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| input_redacted | JSONField | no |  | 0 |
| message | ForeignKey | no | fk:ai_assistant.AiMessage | 0 |
| mode | CharField | yes |  | 3 |
| output_summary | TextField | no |  | 0 |
| session | ForeignKey | yes | fk:ai_assistant.AiSession | 0 |
| sources | JSONField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tool_name | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- mode (3): `read`=Leitura; `prepare_action`=Preparar acção; `write_confirmed`=Escrita confirmada
- status (4): `pending`=Pendente; `success`=Sucesso; `blocked`=Bloqueada; `error`=Erro

### auditoria_atividades

#### auditoria_atividades.UserActivity

- verbose_name: Actividade do Utilizador
- db_table: auditoria_atividades_atividadeusuario
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| duration_ms | PositiveIntegerField | no |  | 0 |
| full_path | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| ip | GenericIPAddressField | no |  | 0 |
| message | CharField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| method | CharField | yes |  | 0 |
| object_id | CharField | no |  | 0 |
| path | CharField | yes |  | 0 |
| status_code | PositiveSmallIntegerField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| user_agent | CharField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| view_action | CharField | no |  | 0 |
| view_basename | CharField | no |  | 0 |

### bloodbank

#### bloodbank.BloodDonation

- verbose_name: Doação de sangue
- db_table: bloodbank_blood_donation
- fields: 38

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| bag_identifier | CharField | yes |  | 0 |
| blood_pressure_diastolic | PositiveIntegerField | no |  | 0 |
| blood_pressure_systolic | PositiveIntegerField | no |  | 0 |
| blood_type | CharField | yes |  | 9 |
| collected_at | DateTimeField | yes |  | 0 |
| collected_by | ForeignKey | no | fk:identidade.User | 0 |
| contraindications | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| donation_type | CharField | yes |  | 2 |
| donor | ForeignKey | yes | fk:clinical.Patient | 0 |
| donor_height_cm | PositiveIntegerField | no |  | 0 |
| donor_role | CharField | yes |  | 2 |
| donor_weight_kg | DecimalField | no |  | 0 |
| hemoglobin_g_dl | DecimalField | no |  | 0 |
| hepatitis_b_hbsag_test | CharField | yes |  | 5 |
| hepatitis_c_anti_hcv_test | CharField | yes |  | 5 |
| hiv_test | CharField | yes |  | 5 |
| id | BigAutoField | no |  | 0 |
| malaria_test | CharField | yes |  | 5 |
| notes | TextField | no |  | 0 |
| processed_at | DateTimeField | no |  | 0 |
| pulse_bpm | PositiveIntegerField | no |  | 0 |
| replacement_for | ForeignKey | no | fk:clinical.Patient | 0 |
| screening_status | CharField | yes |  | 3 |
| status | CharField | yes |  | 4 |
| syphilis_rpr_test | CharField | yes |  | 5 |
| temperature_c | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| test_notes | TextField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| volume_ml | PositiveIntegerField | yes |  | 0 |

**Choices**
- blood_type (9): `O-`=O negativo; `O+`=O positivo; `A-`=A negativo; `A+`=A positivo; `B-`=B negativo; `B+`=B positivo; `AB-`=AB negativo; `AB+`=AB positivo; `UNK`=Não informado
- donation_type (2): `WBL`=Sangue total; `APH`=Aferese
- donor_role (2): `VOL`=Voluntario; `REP`=Repositor
- hepatitis_b_hbsag_test (5): `PEN`=Pendente; `NEG`=Negativo; `POS`=Positivo; `INC`=Inconclusivo; `NDO`=Não realizado
- hepatitis_c_anti_hcv_test (5): `PEN`=Pendente; `NEG`=Negativo; `POS`=Positivo; `INC`=Inconclusivo; `NDO`=Não realizado
- hiv_test (5): `PEN`=Pendente; `NEG`=Negativo; `POS`=Positivo; `INC`=Inconclusivo; `NDO`=Não realizado
- malaria_test (5): `PEN`=Pendente; `NEG`=Negativo; `POS`=Positivo; `INC`=Inconclusivo; `NDO`=Não realizado
- screening_status (3): `PEN`=Pendente; `APR`=Aprovada; `REJ`=Rejeitada
- status (4): `REG`=Registrada; `SCR`=Em triagem; `COM`=Concluida; `CAN`=Cancelada
- syphilis_rpr_test (5): `PEN`=Pendente; `NEG`=Negativo; `POS`=Positivo; `INC`=Inconclusivo; `NDO`=Não realizado

#### bloodbank.BloodStockMovement

- verbose_name: Movimentação de stock de sangue
- db_table: bloodbank_blood_stock_movement
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination_storage | ForeignKey | no | fk:bloodbank.BloodStorage | 0 |
| id | BigAutoField | no |  | 0 |
| moved_at | DateTimeField | yes |  | 0 |
| movement_type | CharField | yes |  | 10 |
| notes | TextField | no |  | 0 |
| performed_by | ForeignKey | no | fk:identidade.User | 0 |
| reason | CharField | no |  | 0 |
| source_storage | ForeignKey | no | fk:bloodbank.BloodStorage | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit | ForeignKey | yes | fk:bloodbank.BloodUnit | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- movement_type (10): `INB`=Entrada; `OUT`=Saída; `TRF`=Transferência; `RSV`=Reserva; `RLS`=Liberação; `FWD`=Aviação para setor; `RTN`=Devolução ao banco de sangue; `DSC`=Descarte; `EXP`=Baixa por validade; `ADJ`=Ajuste manual

#### bloodbank.BloodStorage

- verbose_name: Armazenamento de sangue
- db_table: bloodbank_blood_storage
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| capacity_units | PositiveIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| is_active | BooleanField | yes |  | 0 |
| last_validation_at | DateTimeField | no |  | 0 |
| location | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| temperature_max_c | DecimalField | yes |  | 0 |
| temperature_min_c | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### bloodbank.BloodStorageMaintenance

- verbose_name: Manutenção de banco de sangue
- db_table: bloodbank_blood_storage_maintenance
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| actions_taken | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| findings | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| maintenance_type | CharField | yes |  | 5 |
| next_due_at | DateTimeField | no |  | 0 |
| notes | TextField | no |  | 0 |
| performed_at | DateTimeField | no |  | 0 |
| scheduled_at | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| storage | ForeignKey | yes | fk:bloodbank.BloodStorage | 0 |
| technician_name | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- maintenance_type (5): `PRV`=Preventiva; `COR`=Corretiva; `CAL`=Calibração; `SAN`=Higienização; `TMP`=Validação de temperatura
- status (4): `SCH`=Agendada; `INP`=Em andamento; `COM`=Concluída; `CAN`=Cancelada

#### bloodbank.BloodTransfusion

- verbose_name: Transfusão de sangue
- db_table: bloodbank_blood_transfusion
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| blood_unit | ForeignKey | yes | fk:bloodbank.BloodUnit | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| finished_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| indication | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| performed_by | ForeignKey | no | fk:identidade.User | 0 |
| reaction_notes | TextField | no |  | 0 |
| recipient | ForeignKey | yes | fk:clinical.Patient | 0 |
| requested_at | DateTimeField | yes |  | 0 |
| requested_by | ForeignKey | no | fk:identidade.User | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `REQ`=Solicitada; `APR`=Aprovada; `INP`=Em andamento; `COM`=Concluída; `CAN`=Cancelada; `REA`=Reação adversa

#### bloodbank.BloodUnit

- verbose_name: Unidade de sangue
- db_table: bloodbank_blood_unit
- fields: 30

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| blood_type | CharField | yes |  | 9 |
| collected_at | DateTimeField | yes |  | 0 |
| component_type | CharField | yes |  | 5 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dispatch_outcome | CharField | yes |  | 4 |
| dispatch_outcome_at | DateTimeField | no |  | 0 |
| dispatch_outcome_by | ForeignKey | no | fk:identidade.User | 0 |
| dispatch_outcome_notes | TextField | no |  | 0 |
| donation | ForeignKey | yes | fk:bloodbank.BloodDonation | 0 |
| expires_at | DateTimeField | yes |  | 0 |
| forwarded_at | DateTimeField | no |  | 0 |
| forwarded_by | ForeignKey | no | fk:identidade.User | 0 |
| forwarded_to_sector | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| is_irradiated | BooleanField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| reserved_for | ForeignKey | no | fk:clinical.Patient | 0 |
| status | CharField | yes |  | 7 |
| storage | ForeignKey | no | fk:bloodbank.BloodStorage | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_number | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| volume_ml | PositiveIntegerField | yes |  | 0 |

**Choices**
- blood_type (9): `O-`=O negativo; `O+`=O positivo; `A-`=A negativo; `A+`=A positivo; `B-`=B negativo; `B+`=B positivo; `AB-`=AB negativo; `AB+`=AB positivo; `UNK`=Não informado
- component_type (5): `WB`=Sangue total; `RBC`=Concentrado de hemacias; `PLS`=Plasma fresco; `PLT`=Concentrado de plaquetas; `CRY`=Crioprecipitado
- dispatch_outcome (4): `PEN`=Pendente; `TRN`=Transfundida; `RET`=Devolvida; `DSC`=Descartada
- status (7): `QUA`=Quarentena; `AVL`=Disponível; `RES`=Reservada; `FWD`=Aviada para setor; `TRN`=Transfundida; `EXP`=Expirada; `DSC`=Descartada

### cirurgia

#### cirurgia.AnesthesiaRecord

- verbose_name: Registo de Anestesia
- db_table: cirurgia_anestesia
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| airway_management | CharField | no |  | 0 |
| anesthesia_type | CharField | yes |  | 6 |
| anesthetist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| asa_class | CharField | no |  | 0 |
| complications | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| ended_at | DateTimeField | no |  | 0 |
| fluids | JSONField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| medications | JSONField | no |  | 0 |
| notes | TextField | no |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 4 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- anesthesia_type (6): `GENERAL`=Geral; `REGIONAL`=Regional; `LOCAL`=Local; `SEDATION`=Sedação; `COMBINED`=Combinada; `NONE`=Sem anestesia
- status (4): `PLANNED`=Planeada; `IN_PROGRESS`=Em curso; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### cirurgia.LargeSurgery

- verbose_name: Grande cirurgia
- db_table: cirurgia_cirurgia
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| canceled_at | DateTimeField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| estimated_price | MoneyField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| procedure | CharField | no |  | 0 |
| procedures | ManyToManyField | no | many_to_many:cirurgia.SurgicalProcedure | 0 |
| scheduled_for | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| surgeon | ForeignKey | no | fk:identidade.User | 0 |
| surgery_size | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `AGENDADA`=Agendada; `EM_ANDAMENTO`=Em andamento; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada
- surgery_size (2): `PEQUENA`=Pequena; `GRANDE`=Grande

#### cirurgia.OperatingRoom

- verbose_name: Centro Cirúrgico / Sala Operatória
- db_table: cirurgia_centro_cirurgico
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| capacity | PositiveSmallIntegerField | yes |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment_notes | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| location | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| room_type | CharField | yes |  | 6 |
| status | CharField | yes |  | 5 |
| sterile | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- room_type (6): `GENERAL`=Geral; `MINOR`=Pequena cirurgia; `MAJOR`=Grande cirurgia; `ENDOSCOPY`=Endoscopia; `OBSTETRIC`=Obstétrica; `OTHER`=Outra
- status (5): `AVAILABLE`=Disponível; `OCCUPIED`=Ocupada; `CLEANING`=Em limpeza; `MAINTENANCE`=Manutenção; `INACTIVE`=Inativa

#### cirurgia.OperativeReport

- verbose_name: Relatório Operatório
- db_table: cirurgia_relatorio_operatorio
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| complications | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| ended_at | DateTimeField | no |  | 0 |
| estimated_blood_loss_ml | PositiveIntegerField | yes |  | 0 |
| findings | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| pathology_accession_number | CharField | no |  | 0 |
| postoperative_diagnosis | TextField | no |  | 0 |
| preoperative_diagnosis | TextField | no |  | 0 |
| primary_surgeon | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| procedure_performed | TextField | no |  | 0 |
| signed_at | DateTimeField | no |  | 0 |
| specimen_sent_to_pathology | BooleanField | yes |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 4 |
| surgery | OneToOneField | yes | fk:cirurgia.Surgery | 0 |
| technique | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `FINAL`=Final; `AMENDED`=Retificado; `CANCELLED`=Cancelado

#### cirurgia.RecoveryRecord

- verbose_name: Recuperação Pós-Anestésica
- db_table: cirurgia_recuperacao
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| admitted_at | DateTimeField | yes |  | 0 |
| aldrete_score | PositiveSmallIntegerField | yes |  | 0 |
| complications | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination | CharField | no |  | 0 |
| discharged_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| nurse | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| pain_score | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| vital_signs | JSONField | no |  | 0 |

**Choices**
- status (5): `ADMITTED`=Admitido; `MONITORING`=Em vigilância; `READY_DISCHARGE`=Alta preparada; `DISCHARGED`=Alta; `TRANSFERRED`=Transferido

#### cirurgia.SmallSurgery

- verbose_name: Pequena cirurgia
- db_table: cirurgia_cirurgia
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| canceled_at | DateTimeField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| estimated_price | MoneyField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| procedure | CharField | no |  | 0 |
| procedures | ManyToManyField | no | many_to_many:cirurgia.SurgicalProcedure | 0 |
| scheduled_for | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| surgeon | ForeignKey | no | fk:identidade.User | 0 |
| surgery_size | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `AGENDADA`=Agendada; `EM_ANDAMENTO`=Em andamento; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada
- surgery_size (2): `PEQUENA`=Pequena; `GRANDE`=Grande

#### cirurgia.Surgery

- verbose_name: Cirurgia
- db_table: cirurgia_cirurgia
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| canceled_at | DateTimeField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| estimated_price | MoneyField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| procedure | CharField | no |  | 0 |
| procedures | ManyToManyField | no | many_to_many:cirurgia.SurgicalProcedure | 0 |
| scheduled_for | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| surgeon | ForeignKey | no | fk:identidade.User | 0 |
| surgery_size | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `AGENDADA`=Agendada; `EM_ANDAMENTO`=Em andamento; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada
- surgery_size (2): `PEQUENA`=Pequena; `GRANDE`=Grande

#### cirurgia.SurgicalConsumption

- verbose_name: Consumo Cirúrgico
- db_table: cirurgia_consumo
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| batch_number | CharField | no |  | 0 |
| consumed_at | DateTimeField | yes |  | 0 |
| consumed_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| material | ForeignKey | no | fk:cirurgia.SurgicalMaterial | 0 |
| notes | TextField | no |  | 0 |
| product | ForeignKey | no | fk:farmacia.Product | 0 |
| quantity | DecimalField | yes |  | 0 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### cirurgia.SurgicalMaterial

- verbose_name: Material Cirúrgico
- db_table: cirurgia_material
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| material_type | CharField | yes |  | 6 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| product | ForeignKey | no | fk:farmacia.Product | 0 |
| reusable | BooleanField | yes |  | 0 |
| sterile | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- material_type (6): `INSTRUMENT`=Instrumental; `CONSUMABLE`=Consumível; `IMPLANT`=Implante; `MEDICATION`=Medicamento; `SUTURE`=Sutura; `OTHER`=Outro

#### cirurgia.SurgicalProcedure

- verbose_name: Procedimento Cirúrgico
- db_table: cirurgia_procedimentocirurgico
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| base_price | MoneyField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### cirurgia.SurgicalSafetyChecklist

- verbose_name: Checklist de Segurança Cirúrgica
- db_table: cirurgia_checklist_seguranca
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| anesthesia_safety_checked | BooleanField | yes |  | 0 |
| antibiotic_prophylaxis | BooleanField | yes |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| completed_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| consent_confirmed | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| instrument_count_confirmed | BooleanField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| patient_identity_confirmed | BooleanField | yes |  | 0 |
| phase | CharField | yes |  | 3 |
| procedure_confirmed | BooleanField | yes |  | 0 |
| site_marked | BooleanField | yes |  | 0 |
| specimens_labeled | BooleanField | yes |  | 0 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- phase (3): `SIGN_IN`=Antes da indução; `TIME_OUT`=Antes da incisão; `SIGN_OUT`=Antes da saída

#### cirurgia.SurgicalSchedule

- verbose_name: Agenda Cirúrgica
- db_table: cirurgia_agenda_cirurgica
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| cancellation_reason | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| operating_room | ForeignKey | no | fk:cirurgia.OperatingRoom | 0 |
| priority | CharField | yes |  | 3 |
| scheduled_end | DateTimeField | no |  | 0 |
| scheduled_start | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 6 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- priority (3): `ELECTIVE`=Eletiva; `URGENT`=Urgente; `EMERGENCY`=Emergência
- status (6): `REQUESTED`=Solicitada; `SCHEDULED`=Agendada; `CONFIRMED`=Confirmada; `IN_PROGRESS`=Em curso; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### cirurgia.SurgicalTeamMember

- verbose_name: Membro da Equipa Cirúrgica
- db_table: cirurgia_equipa_cirurgica
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| lead | BooleanField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| present | BooleanField | yes |  | 0 |
| role | CharField | yes |  | 7 |
| surgery | ForeignKey | yes | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- role (7): `SURGEON`=Cirurgião; `ASSISTANT`=Assistente; `ANESTHETIST`=Anestesista; `SCRUB_NURSE`=Instrumentista; `CIRCULATING_NURSE`=Circulante; `PERFUSIONIST`=Perfusionista; `OTHER`=Outro

### clinical

#### clinical.ClinicalEvent

- verbose_name: Evento clínico
- db_table: clinico_eventoclinico
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | yes |  | 0 |
| event_type | CharField | yes |  | 12 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| request | ForeignKey | no | fk:clinical.LabRequest | 0 |
| result | ForeignKey | no | fk:clinical.ResultItem | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- event_type (12): `result_criado`=Resultado Criado; `result_interpretado`=Resultado Interpretado; `result_validado`=Resultado Validado; `result_critico`=Resultado Crítico; `request_criada`=Requisição Criada; `request_processamento`=Requisição em Processamento; `request_validada`=Requisição Validada; `request_cancelada`=Requisição Cancelada; `medication_prescrita`=Medicação Prescrita; `medication_administrada`=Medicação Administrada; `observation_clinica`=Observação Clínica; `diagnóstico`=Diagnóstico

#### clinical.ClinicalHistory

- verbose_name: Histórico clínico
- db_table: clinico_historicoclinico
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| description | TextField | yes |  | 0 |
| event_date | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |

#### clinical.ClinicalReference

- verbose_name: Referência clínica
- db_table: clinico_referenciaclinica
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical_high | DecimalField | no |  | 0 |
| critical_low | DecimalField | no |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exam_field | ForeignKey | yes | fk:clinical.LabExamField | 0 |
| id | BigAutoField | no |  | 0 |
| maximum_age_days | PositiveIntegerField | no |  | 0 |
| maximum_value | DecimalField | no |  | 0 |
| minimum_age_days | PositiveIntegerField | no |  | 0 |
| minimum_value | DecimalField | no |  | 0 |
| name | CharField | yes |  | 0 |
| sex | CharField | no |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- sex (2): `Masculino`=Masculino; `Femenino`=Femenino

#### clinical.LabExam

- verbose_name: Exame
- db_table: clinico_exame
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| method | MethodField | yes |  | 42 |
| name | CharField | yes |  | 0 |
| price | MoneyField | yes |  | 0 |
| sample_options | ManyToManyField | no | many_to_many:clinical.Sample | 0 |
| sample_type | ForeignKey | yes | fk:clinical.Sample | 0 |
| sector | SectorField | no |  | 25 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| turnaround_hours | PositiveIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- method (42): `Enzimatico`=Enzimático; `Colorimetrico`=Colorimétrico; `Espectrofotometrico`=Espectrofotométrico; `Turbidimetrico`=Turbidimétrico; `Nefelometrico`=Nefelométrico; `Potenciometrico`=Potenciométrico; `Eletroquimico`=Eletroquímico; `ELISA`=ELISA; `Quimioluminescencia`=Quimioluminescência; `Eletroquimioluminescencia`=Eletroquimioluminescência; `Imunofluorescencia`=Imunofluorescência; `Imunoturbidimetria`=Imunoturbidimetria; `Aglutinacao`=Aglutinação; `Cultura`=Cultura; `Antibiograma`=Antibiograma; `Microscopico`=Microscópico; `ColoracaoGram`=Coloração de Gram; `ColoracaoZiehl`=Ziehl-Neelsen; `IsolamentoMicrobiano`=Isolamento Microbiano; `CitometriaFluxo`=Citometria de Fluxo; `HematologiaAutomatizada`=Hematologia Automatizada; `MicroscopiaOptica`=Microscopia Óptica; `PCR`=PCR; `RT_PCR`=RT-PCR; `PCRTempoReal`=PCR em Tempo Real; `Sequenciamento`=Sequenciamento Genético; `HibridizacaoMolecular`=Hibridização Molecular; `Genotipagem`=Genotipagem; `Cromatografia`=Cromatografia; `CromatografiaGasosa`=Cromatografia Gasosa; `CromatografiaLiquida`=Cromatografia Líquida; `HPLC`=Cromatografia Líquida de Alta Eficiência; `Eletroforese`=Eletroforese; `Isoeletrofoque`=Isoeletrofocalização; `Sedimentacao`=Sedimentação; `Flutuacao`=Flutuação; `KatoKatz`=Kato-Katz; `TiraReagente`=Tira Reagente; `AnaliseMicroscopica`=Análise Microscópica; `EspectrometriaMassa`=Espectrometria de Massa; `MALDI_TOF`=MALDI-TOF; `RessonanciaMagneticaNuclear`=Ressonância Magnética Nuclear
- sector (25): `Hematologia`=Hematologia; `Bioquimica`=Bioquímica; `Microbiologia`=Microbiologia; `Imunologia`=Imunologia; `Serologia`=Serologia; `Parasitologia`=Parasitologia; `BiologiaMolecular`=Biologia Molecular; `Toxicologia`=Toxicologia; `Hormonios`=Hormônios e Endocrinologia; `MarcadoresTumorais`=Marcadores Tumorais; `Coagulacao`=Coagulação; `Urinalise`=Urinálise; `LiquidosCorporais`=Líquidos Corporais; `Gasometria`=Gasometria; `NutricaoClinica`=Nutrição Clínica; `Micologia`=Micologia; `Virologia`=Virologia; `Bacteriologia`=Bacteriologia; `BancoSangue`=Banco de Sangue; `ImunoHematologia`=Imuno-hematologia; `Triagem`=Triagem Laboratorial; `RecepcaoAmostras`=Recepção de Amostras; `ControleQualidade`=Controle de Qualidade; `Pesquisa`=Pesquisa Laboratorial; `Outro`=Outro

#### clinical.LabExamField

- verbose_name: parâmetro
- db_table: clinico_examecampo
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical_max | DecimalField | no |  | 0 |
| critical_min | DecimalField | no |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exam | ForeignKey | yes | fk:clinical.LabExam | 0 |
| id | BigAutoField | no |  | 0 |
| max_delta | DecimalField | no |  | 0 |
| name | CharField | yes |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| reference_max | DecimalField | no |  | 0 |
| reference_min | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 4 |
| unit | CharField | yes |  | 12 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (4): `NUMERICO`=Numérico; `QUALITATIVO`=Qualitativo; `SEMIQUANTITATIVO`=Semi-quantitativo; `TEXTO`=Texto Livre
- unit (12): `g/dl`=g/dl; `mg/dl`=mg/dl; `mmol/l`=mmol/l; `µmol/l`=µmol/l; `cel/mm3`=cel/mm3; `x10³/µl`=x10³/µl; `x10⁶/µL`=x10⁶/µL; `%`=%; `u/l`=u/l; `p/µL`=p/µL; `ph`=ph; `fl`=fl

#### clinical.LabRequest

- verbose_name: Requisição de exam
- db_table: clinico_requisicaoanalise
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| analyst | ForeignKey | no | fk:identidade.User | 0 |
| clinical_status | CharField | yes |  | 9 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exams | ManyToManyField | no | many_to_many:clinical.LabExam | 0 |
| external_executing_company | ForeignKey | no | fk:entidades.Company | 0 |
| fasting_hours | PositiveIntegerField | yes |  | 0 |
| has_critical_result | BooleanField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| requesting_company | ForeignKey | no | fk:entidades.Company | 0 |
| requires_fasting | BooleanField | yes |  | 0 |
| samples | ManyToManyField | no | many_to_many:clinical.Sample | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 2 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- clinical_status (9): `NAO_URGENTE`=Não urgente; `NORMAL`=Normal; `ROTINA`=Rotina; `POUCO_URGENTE`=Pouco urgente; `PRIORITARIO`=Prioritário; `URGENTE`=Urgente; `MUITO_URGENTE`=Muito urgente; `URGENTISSIMO`=Urgentíssimo; `EMERGENCIA`=Emergência
- status (6): `pendente`=Pendente; `em_analise`=Em Análise; `aguardando_validacao`=Aguardando Validação; `validado`=Validado; `rejeitado`=Rejeitado; `desconsiderado`=Desconsiderado
- type (2): `LAB`=Laboratório; `MED`=Exame médico

#### clinical.LabRequestItem

- verbose_name: Item de requisição
- db_table: clinico_requisicaoitem
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exam | ForeignKey | no | fk:clinical.LabExam | 0 |
| id | BigAutoField | no |  | 0 |
| medical_exam | ForeignKey | no | fk:clinical.MedicalExam | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| request | ForeignKey | yes | fk:clinical.LabRequest | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### clinical.MedicalExam

- verbose_name: Exame médico
- db_table: clinico_examemedico
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| method | MedicalExamMethodField | yes |  | 16 |
| name | CharField | yes |  | 0 |
| price | MoneyField | yes |  | 0 |
| sector | MedicalExamSectorField | no |  | 11 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| turnaround_hours | PositiveIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- method (16): `USG`=Ultrassonografia / Ecografia; `RX`=Raio-X Convencional; `CT`=Tomografia Computorizada (CT); `RM`=Ressonância Magnética (RM); `MG`=Mamografia; `DXA`=Densitometria Óssea (DXA); `ECO`=Ecocardiograma; `ECG`=Eletrocardiograma (ECG); `HOLTER`=Holter; `MAPA`=MAPA (PA 24h); `EEG`=Eletroencefalograma (EEG); `ENDO`=Endoscopia; `COLONO`=Colonoscopia; `ANGIO`=Angiografia; `MN`=Medicina Nuclear / Cintilografia; `OUT`=Outro
- sector (11): `Radiologia`=Radiologia; `DiagnosticoImagem`=Diagnóstico por Imagem; `Cardiologia`=Cardiologia; `GinecoObstetricia`=Ginecologia/Obstetrícia; `Ortopedia`=Ortopedia/Traumato; `Neurologia`=Neurologia; `Otorrino`=Otorrinolaringologia; `Oftalmologia`=Oftalmologia; `MedicinaNuclear`=Medicina Nuclear; `Endoscopia`=Endoscopia; `Outro`=Outro

#### clinical.MedicalExamField

- verbose_name: parâmetro de exam médico
- db_table: clinico_examemedicocampo
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exam | ForeignKey | yes | fk:clinical.MedicalExam | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 6 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (6): `PDF`=Laudo/Relatório (PDF); `IMAGEM`=Imagem (JPEG/PNG); `DICOM`=DICOM; `VIDEO`=Vídeo/loop; `TEXTO`=Texto livre; `NUMERICO`=Valor numérico

#### clinical.MedicalResultFile

- verbose_name: Arquivo de result médico
- db_table: clinico_resultadomedicoarquivo
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| file | FileField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| medical_exam | ForeignKey | yes | fk:clinical.MedicalExam | 0 |
| request_item | ForeignKey | no | fk:clinical.LabRequestItem | 0 |
| result | ForeignKey | yes | fk:clinical.Result | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 6 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (6): `PDF`=Laudo/Relatório (PDF); `IMAGEM`=Imagem (JPEG/PNG); `DICOM`=DICOM; `VIDEO`=Vídeo/loop; `TEXTO`=Texto livre; `NUMERICO`=Valor numérico

#### clinical.Patient

- verbose_name: Entrada
- db_table: clinico_paciente
- fields: 40

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| address | CharField | no |  | 0 |
| address_city | CharField | no |  | 0 |
| address_complement | CharField | no |  | 0 |
| address_country | CountryField | no |  | 249 |
| address_neighborhood | CharField | no |  | 0 |
| address_number | CharField | no |  | 0 |
| address_postal_code | CharField | no |  | 0 |
| address_province | CharField | no |  | 0 |
| address_street | CharField | no |  | 0 |
| birth_date | DateField | no |  | 0 |
| blood_type | CharField | yes |  | 9 |
| companion_contact | CharField | no |  | 0 |
| companion_email | NormalizedEmailField | no |  | 0 |
| companion_name | CharField | no |  | 0 |
| companion_relationship | CharField | no |  | 0 |
| contact | PhoneField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| document_number | CharField | no |  | 0 |
| document_type | CharField | yes |  | 8 |
| email | NormalizedEmailField | no |  | 0 |
| gender | CharField | yes |  | 2 |
| gestational_age_weeks | PositiveIntegerField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| is_replacement_donor_inapt | BooleanField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| origin_company | ForeignKey | no | fk:entidades.Company | 0 |
| pregnant | BooleanField | yes |  | 0 |
| provenance | CharField | no |  | 13 |
| race_origin | CharField | yes |  | 6 |
| replacement_donor_inapt_at | DateTimeField | no |  | 0 |
| replacement_donor_inapt_reason | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- address_country (249): `AF`=Afeganistão; `ZA`=África do Sul; `AL`=Albânia; `DE`=Alemanha; `AD`=Andorra; `AO`=Angola; `AI`=Anguilla; `AQ`=Antártica; `AG`=Antígua e Barbuda; `SA`=Arábia Saudita; `DZ`=Argélia; `AR`=Argentina; `AM`=Armênia; `AW`=Aruba; `AU`=Austrália; `AT`=Áustria; `AZ`=Azerbaijão; `BS`=Bahamas; `BH`=Bahrain; `BD`=Bangladesh; `BB`=Barbados; `BE`=Bélgica; `BZ`=Belize; `BJ`=Benin; `BM`=Bermudas; `BY`=Bielorrússia; `BO`=Bolívia; `BQ`=Bonaire, Saba e Santo Eustáquio; `BA`=Bósnia e Herzegovina; `BW`=Botsuana; `BR`=Brasil; `BN`=Brunei; `BG`=Bulgária; `BF`=Burkina Faso; `BI`=Burundi; `BT`=Butão; `CV`=Cabo Verde; `CM`=Camarões; `KH`=Camboja; `CA`=Canadá; `QA`=Catar; `KZ`=Cazaquistão; `TD`=Chade; `CL`=Chile; `CN`=China; `CY`=Chipre; `SG`=Cingapura; `CO`=Colômbia; `KM`=Comores; `CG`=Congo, República do Congo; `KP`=Coréia do Norte; `KR`=Coréia do Sul; `CR`=Costa Rica; `CI`=Costa do Marfim; `HR`=Croácia; `CU`=Cuba; `CW`=Curação; `DK`=Dinamarca; `DJ`=Djibuti; `DM`=Dominicana; `EG`=Egito; `SV`=El Salvador; `AE`=Emirados Árabes Unidos; `EC`=Equador; `ER`=Eritreia; `SK`=Eslováquia; `SI`=Eslovénia; `ES`=Espanha; `SZ`=Essuatíni; `PS`=Estado da Palestina; `US`=Estados Unidos; `UM`=Estados Unidos Ilhas Menores Distantes; `EE`=Estônia; `SJ`=Esvalbarda; `ET`=Etiópia; `FJ`=Fiji; `PH`=Filipinas; `FI`=Finlândia; `FR`=França; `GA`=Gabão; `GM`=Gâmbia; `GH`=Gana; `GE`=Geórgia; `GS`=Geórgia do Sul e Sanduíche do Sul; `GI`=Gibraltar; `GD`=Granada; `GR`=Grécia; `GL`=Groenlândia; `GP`=Guadalupe; `GU`=Guão; `GT`=Guatemala; `GG`=Guernesei; `GY`=Guiana; `GF`=Guiana Francesa; `GN`=Guiné; `GQ`=Guiné Equatorial; `GW`=Guiné-Bissau; `HT`=Haiti; `NL`=Holanda; `HN`=Honduras; `HK`=Hong Kong; `HU`=Hungria; `YE`=Iémen; `BV`=Ilha Bouvet; `HM`=Ilha Heard e Ilhas McDonald; `NF`=Ilha Norfolk; `IM`=Ilha de Man; `CX`=Ilha do Natal; `AX`=Ilhas Alanda; `KY`=Ilhas Cayman; `CC`=Ilhas Cocos (Keeling); `CK`=Ilhas Cook; `FK`=Ilhas Falkland (Malvinas); `FO`=Ilhas Faroe; `MP`=Ilhas Marianas do Norte; `MH`=Ilhas Marshall; `PN`=Ilhas Pitcairn; `SB`=Ilhas Salomão; `TC`=Ilhas Turks e Caicos; `VG`=Ilhas Virgens Britânicas; `VI`=Ilhas Virgens dos Estados Unidos; `IN`=Índia; `ID`=Indonésia; `IR`=Irã; `IQ`=Iraque; `IE`=Irlanda; `IS`=Islândia; `IL`=Israel; `IT`=Itália; `JM`=Jamaica; `JP`=Japão; `JE`=Jérsia; `JO`=Jordânia; `KW`=Kuweit; `LA`=Laos; `LS`=Lesoto; `LV`=Letónia; `LB`=Líbano; `LR`=Libéria; `LY`=Líbia; `LI`=Listenstaina; `LT`=Lituânia; `LU`=Luxemburgo; `MO`=Macau; `MK`=Macedônia do Norte; `MG`=Madagáscar; `MY`=Malásia; `MW`=Malavi; `MV`=Maldivas; `ML`=Mali; `MT`=Malta; `MA`=Marrocos; `MQ`=Martinica; `MU`=Maurício; `MR`=Mauritânia; `YT`=Mayotte; `MX`=México; `MM`=Mianmar; `FM`=Micronésia; `MZ`=Moçambique; `MD`=Moldova; `MC`=Monaco; `MN`=Mongólia; `ME`=Montenegro; `MS`=Montserrat; `NA`=Namíbia; `NR`=Nauru; `NP`=Nepal; `NI`=Nicarágua; `NE`=Níger; `NG`=Nigeria; `NU`=Niue; `NO`=Noruega; `NC`=Nova Caledônia; `NZ`=Nova Zelândia; `OM`=Oman; `PW`=Palau; `PA`=Panamá; `PG`=Papua Nova Guiné; `PK`=Paquistão; `PY`=Paraguai; `PE`=Peru; `PF`=Polinésia Francesa; `PL`=Polônia; `PR`=Porto Rico; `PT`=Portugal; `KE`=Quênia; `KG`=Quirguistão; `KI`=Quiribati; `GB`=Reino Unido; `CF`=República Centro-Africana; `CD`=República Democrática do Congo; `DO`=República Dominicana; `RE`=Reunião; `RO`=Romênia; `RW`=Ruanda; `RU`=Rússia; `EH`=Saara Ocidental; `WS`=Samoa; `AS`=Samoa Americana; `SM`=San Marino; `SH`=Santa Helena; `LC`=Santa Lúcia; `VA`=Santa Sé; `BL`=São Bartolomeu; `KN`=São Cristóvão e Neves; `SX`=São Martinho (Países Baixos); `MF`=São Martinho (Parte Francesa); `PM`=São Pedro e Miquelão; `ST`=São Tomé e Príncipe; `VC`=São Vicente e Granadinas; `SN`=Senegal; `SL`=Serra Leoa; `RS`=Sérvia; `SC`=Seychelles; `SY`=Síria; `SO`=Somália; `LK`=Sri Lanka; `SD`=Sudão; `SS`=Sudão do Sul; `SE`=Suécia; `CH`=Suíça; `SR`=Suriname; `TH`=Tailândia; `TW`=Taiwan; `TJ`=Tajiquistão; `TZ`=Tanzânia; `CZ`=Tchéquia; `IO`=Território Britânico do Oceano Índico; `TF`=Territórios Franceses do Sul; `TL`=Timor-leste; `TG`=Togo; `TK`=Tokelau; `TO`=Tonga; `TT`=Trinidad e Tobago; `TN`=Tunísia; `TM`=Turcomenistão; `TR`=Turquia; `TV`=Tuvalu; `UA`=Ucrânia; `UG`=Uganda; `UY`=Uruguai; `UZ`=Uzbequistão; `VU`=Vanuatu; `VE`=Venezuela; `VN`=Vietnã; `WF`=Wallis e Futuna; `ZM`=Zâmbia; `ZW`=Zimbábue
- blood_type (9): `O-`=O negativo; `O+`=O positivo; `A-`=A negativo; `A+`=A positivo; `B-`=B negativo; `B+`=B positivo; `AB-`=AB negativo; `AB+`=AB positivo; `UNK`=Nao informado
- document_type (8): `BI`=Bilhete de Identidade; `PASS`=Passaporte; `DIRE`=Documento de Identificação de Residente Estrangeiro; `CC`=Carta de Condução; `NUIT`=Número Único de Identificação Tributária; `CE`=Cartão de Eleitor; `CN`=Certidão de Nascimento; `OUT`=Outro
- gender (2): `Masculino`=Masculino; `Femenino`=Femenino
- provenance (13): `Ambulatório`=Ambulatório; `Clínica Externa`=Clínica Externa; `Medicina Ocupacional`=Medicina Ocupacional; `Maternidade`=Maternidade; `Ginecologia`=Ginecologia; `Pediatria`=Pediatria; `Banco de Socorros`=Banco de Socorros; `Consulta Externa`=Consulta Externa; `Urologia`=Urologia; `Cirurgia`=Cirurgia; `Dentária`=Dentária; `Oftalmologia`=Oftalmologia; `Outro`=Outro
- race_origin (6): `Branca`=Branca; `Negra`=Negra; `Parda`=Parda; `Amarela`=Amarela; `Indígena`=Indígena; `Outro`=Outro

#### clinical.Result

- verbose_name: resultado
- db_table: clinico_resultado
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| analyst | ForeignKey | no | fk:identidade.User | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| finalized | BooleanField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| request | OneToOneField | yes | fk:clinical.LabRequest | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### clinical.ResultItem

- verbose_name: result item
- db_table: clinico_resultadoitem
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| clinical_status | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical_alert | BooleanField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| disregard_reason | TextField | no |  | 0 |
| disregard_validated_by | ForeignKey | no | fk:identidade.User | 0 |
| disregard_validation_date | DateTimeField | no |  | 0 |
| disregarded_at | DateTimeField | no |  | 0 |
| disregarded_by | ForeignKey | no | fk:identidade.User | 0 |
| exam_field | ForeignKey | yes | fk:clinical.LabExamField | 0 |
| id | BigAutoField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| report_color | CharField | no |  | 0 |
| result | ForeignKey | yes | fk:clinical.Result | 0 |
| result_value | DecimalField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| validated_by | ForeignKey | no | fk:identidade.User | 0 |
| validation_date | DateTimeField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `pendente`=Pendente; `em_analise`=Em Análise; `aguardando_validacao`=Aguardando Validação; `validado`=Validado; `rejeitado`=Rejeitado; `desconsiderado`=Desconsiderado

#### clinical.Sample

- verbose_name: Amostra
- db_table: clinico_amostra
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| anticoagulant | CharField | no |  | 0 |
| bottle_type | CharField | yes |  | 9 |
| cap_color | CharField | no |  | 0 |
| collection_instructions | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| fasting_hours | PositiveIntegerField | yes |  | 0 |
| fasting_required | BooleanField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| minimum_volume_ml | DecimalField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| stability_hours | PositiveIntegerField | yes |  | 0 |
| storage_temperature | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- bottle_type (9): `TUBO_SECO`=Tubo seco (soro); `TUBO_EDTA`=Tubo EDTA; `TUBO_CITRATO`=Tubo citrato; `TUBO_FLUORETO`=Tubo fluoreto; `FRASCO_URINA`=Frasco de urina; `FRASCO_FEZES`=Frasco de fezes; `FRASCO_ESTERIL`=Frasco estéril; `HEMOCULTURA`=Frasco de hemocultura; `OUTRO`=Outro

### consultas

#### consultas.ConsultationSpecialty

- verbose_name: Especialidade (Consulta)
- db_table: consultas_especialidadeconsulta
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| base_price | MoneyField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### consultas.Holiday

- verbose_name: Feriado
- db_table: consultas_feriado
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### consultas.MedicalConsultation

- verbose_name: Consulta Médica
- db_table: consultas_consultamedica
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| canceled_at | DateTimeField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| consultation_type | CharField | yes |  | 4 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| doctor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| manual_holiday | BooleanField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| price | MoneyField | yes |  | 0 |
| price_multiplier | DecimalField | yes |  | 0 |
| schedule_type | CharField | yes |  | 4 |
| scheduled_for | DateTimeField | yes |  | 0 |
| specialty | ForeignKey | no | fk:consultas.ConsultationSpecialty | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- consultation_type (4): `IN_PERSON`=Presencial; `TELEMEDICINE`=Telemedicina; `ASYNC`=Assíncrona; `REMOTE_MONITORING`=Monitoramento remoto
- schedule_type (4): `NORMAL`=Normal (08h-18h); `FORA_EXPEDIENTE`=Fora de expediente (19h-07h); `FIM_SEMANA`=Fim de semana; `FERIADO_MANUAL`=Feriado (marcado)
- status (3): `MARCADA`=Marcada; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada

### contabilidade

#### contabilidade.Account

- verbose_name: Conta contábil
- db_table: contabilidade_conta
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 5 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (5): `ATI`=Ativo; `PAS`=Passivo; `REC`=Receita; `DES`=Despesa; `PAT`=Patrimônio

#### contabilidade.AccountBalance

- verbose_name: Saldo de Conta
- db_table: contabilidade_saldoconta
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| account | OneToOneField | yes | fk:contabilidade.Account | 0 |
| current_balance | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |

#### contabilidade.FinancialReconciliation

- verbose_name: Conciliação financeira
- db_table: contabilidade_conciliacaofinanceira
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accounting_value | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discrepancy | DecimalField | yes |  | 0 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | yes | fk:faturamento.Invoice | 0 |
| name | CharField | yes |  | 0 |
| received_amount | DecimalField | yes |  | 0 |
| reconciled | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### contabilidade.LedgerEntry

- verbose_name: Lançamento contábil
- db_table: contabilidade_ledgerentry
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accounting_date | DateField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| current_hash | CharField | no |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | yes |  | 0 |
| external_reference | CharField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| idempotency_key | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| previous_hash | CharField | no |  | 0 |
| reversal_of | OneToOneField | no | fk:contabilidade.LedgerEntry | 0 |
| reversal_reason | TextField | no |  | 0 |
| reversed | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### contabilidade.LedgerLine

- verbose_name: Linha contábil
- db_table: contabilidade_ledgerline
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| account | ForeignKey | yes | fk:contabilidade.Account | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| entry | ForeignKey | yes | fk:contabilidade.LedgerEntry | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| nature | CharField | yes |  | 2 |
| position | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| value | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- nature (2): `D`=Débito; `C`=Crédito

#### contabilidade.LegacyEntry

- verbose_name: Lançamento legado
- db_table: contabilidade_lancamento
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| confirmed | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### contabilidade.LegacyMovement

- verbose_name: Movimento legado
- db_table: contabilidade_movimento
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| account | ForeignKey | yes | fk:contabilidade.Account | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| credit | DecimalField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| debit | DecimalField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| entry | ForeignKey | yes | fk:contabilidade.LegacyEntry | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### creditos_financiamento

#### creditos_financiamento.CreditInstallment

- verbose_name: Parcela de Crédito
- db_table: creditos_financiamento_parcela
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| due_date | DateField | yes |  | 0 |
| fee_amount | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| installment_number | PositiveSmallIntegerField | yes |  | 0 |
| interest_amount | DecimalField | yes |  | 0 |
| invoice | ForeignKey | no | fk:faturamento.Invoice | 0 |
| notes | TextField | no |  | 0 |
| paid_amount | DecimalField | yes |  | 0 |
| paid_at | DateTimeField | no |  | 0 |
| payment | ForeignKey | no | fk:pagamentos.Payment | 0 |
| principal_amount | DecimalField | yes |  | 0 |
| procedure_financing | ForeignKey | no | fk:creditos_financiamento.ElectiveProcedureFinancing | 0 |
| status | CharField | yes |  | 6 |
| student_funding | ForeignKey | no | fk:creditos_financiamento.StudentFunding | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total_amount | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `SCHEDULED`=Agendada; `PARTIAL`=Parcial; `PAID`=Paga; `OVERDUE`=Vencida; `WAIVED`=Perdoada; `CANCELLED`=Cancelada

#### creditos_financiamento.ElectiveProcedureFinancing

- verbose_name: Financiamento de Procedimento
- db_table: creditos_financiamento_procedimento
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| annual_interest_rate | DecimalField | yes |  | 0 |
| approval_reference | CharField | no |  | 0 |
| collateral_notes | TextField | no |  | 0 |
| contract_number | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| down_payment | DecimalField | yes |  | 0 |
| financed_amount | DecimalField | yes |  | 0 |
| financier_company | ForeignKey | no | fk:entidades.Company | 0 |
| first_due_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| installment_amount | DecimalField | yes |  | 0 |
| invoice | ForeignKey | no | fk:faturamento.Invoice | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| principal_amount | DecimalField | yes |  | 0 |
| procedure_description | CharField | yes |  | 0 |
| risk_rating | CharField | yes |  | 3 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| term_months | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- risk_rating (3): `LOW`=Baixo; `MEDIUM`=Médio; `HIGH`=Alto
- status (6): `APPLICATION`=Em análise; `APPROVED`=Aprovado; `ACTIVE`=Ativo; `PAID`=Liquidado; `DEFAULTED`=Em incumprimento; `CANCELLED`=Cancelado

#### creditos_financiamento.HealthConsortium

- verbose_name: Consórcio de Saúde
- db_table: creditos_financiamento_consorcio_saude
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| admin_fee_percent | DecimalField | yes |  | 0 |
| awarded_at | DateField | no |  | 0 |
| consortium_type | CharField | yes |  | 4 |
| contribution_amount | DecimalField | yes |  | 0 |
| covered_services | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expected_award_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | no | fk:faturamento.Invoice | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| quota_number | CharField | no |  | 0 |
| sponsor_company | ForeignKey | no | fk:entidades.Company | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| target_amount | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| term_months | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- consortium_type (4): `HEALTH_PLAN`=Plano de saúde; `DENTAL_PLAN`=Plano odontológico; `PROCEDURE_PACKAGE`=Pacote de procedimentos; `FAMILY_GROUP`=Grupo familiar
- status (5): `DRAFT`=Rascunho; `ACTIVE`=Ativo; `AWARDED`=Contemplado; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

#### creditos_financiamento.ReimbursementClaim

- verbose_name: Convênio e Reembolso
- db_table: creditos_financiamento_reembolso
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| administrative_reference | CharField | no |  | 0 |
| appeal_notes | TextField | no |  | 0 |
| appeal_submitted_at | DateTimeField | no |  | 0 |
| approved_amount | DecimalField | yes |  | 0 |
| claim_type | CharField | yes |  | 4 |
| claimed_amount | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| decision_at | DateTimeField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| denied_amount | DecimalField | yes |  | 0 |
| glosa_reason | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | no | fk:faturamento.Invoice | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| payer_company | ForeignKey | no | fk:entidades.Company | 0 |
| reimbursed_amount | DecimalField | yes |  | 0 |
| response_due_date | DateField | no |  | 0 |
| status | CharField | yes |  | 8 |
| submitted_at | DateTimeField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- claim_type (4): `AGREEMENT`=Convênio; `INSURANCE`=Seguro; `PUBLIC`=Programa público; `PRIVATE`=Reembolso privado
- status (8): `SUBMITTED`=Submetido; `UNDER_REVIEW`=Em análise; `APPROVED`=Aprovado; `GLOSSED`=Glosado; `APPEALED`=Recurso submetido; `PAID`=Reembolsado; `REJECTED`=Rejeitado; `CANCELLED`=Cancelado

#### creditos_financiamento.StudentFunding

- verbose_name: Bolsa e Financiamento Estudantil
- db_table: creditos_financiamento_estudantil
- fields: 31

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| academic_year | CharField | no |  | 0 |
| annual_interest_rate | DecimalField | yes |  | 0 |
| application_reference | CharField | no |  | 0 |
| approval_reference | CharField | no |  | 0 |
| approved_amount | DecimalField | yes |  | 0 |
| conditions | TextField | no |  | 0 |
| course | ForeignKey | no | fk:education.Course | 0 |
| coverage_percent | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| end_date | DateField | no |  | 0 |
| enrollment | ForeignKey | no | fk:education.Enrollment | 0 |
| financed_amount | DecimalField | yes |  | 0 |
| funding_type | CharField | yes |  | 5 |
| id | BigAutoField | no |  | 0 |
| monthly_installment | DecimalField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| sponsor_company | ForeignKey | no | fk:entidades.Company | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 7 |
| student | ForeignKey | yes | fk:education.StudentProfile | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| term_months | PositiveSmallIntegerField | yes |  | 0 |
| tuition_amount | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- funding_type (5): `SCHOLARSHIP`=Bolsa; `STUDENT_LOAN`=Financiamento estudantil; `INSTALLMENT_PLAN`=Parcelamento académico; `GRANT`=Subsídio; `DISCOUNT`=Desconto
- status (7): `APPLICATION`=Em análise; `APPROVED`=Aprovado; `ACTIVE`=Ativo; `SUSPENDED`=Suspenso; `COMPLETED`=Concluído; `DEFAULTED`=Em incumprimento; `CANCELLED`=Cancelado

### diagnosticos

#### diagnosticos.SpecialtyDiagnosticEquipment

- verbose_name: Equipamento de Diagnóstico Especializado
- db_table: diagnostico_especializado_equipamento
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| integration_endpoint | CharField | no |  | 0 |
| last_quality_control | DateField | no |  | 0 |
| location | CharField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| modality | CharField | yes |  | 15 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| next_quality_control | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| serial_number | CharField | no |  | 0 |
| specialty | CharField | yes |  | 4 |
| station_name | CharField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- modality (15): `ECG`=Eletrocardiograma; `ECHOCARDIOGRAM`=Ecocardiograma; `EXERCISE_TEST`=Teste ergométrico; `HOLTER`=Holter; `AMBULATORY_BP`=MAPA; `EEG`=EEG; `EVOKED_POTENTIAL`=Potencial evocado; `TRANSCRANIAL_DOPPLER`=Doppler transcraniano; `EMG`=Eletromiografia; `VISUAL_FIELD`=Campo visual; `CORNEAL_TOPOGRAPHY`=Topografia corneal; `OCT`=OCT; `TONOMETRY`=Tonometria; `FUNDUS_PHOTOGRAPHY`=Retinografia; `OTHER`=Outra
- specialty (4): `CARDIOLOGY`=Cardiologia; `NEUROLOGY`=Neurologia; `OPHTHALMOLOGY`=Oftalmologia; `OTHER`=Outra
- status (3): `ACTIVE`=Ativo; `MAINTENANCE`=Em manutenção; `INACTIVE`=Inativo

#### diagnosticos.SpecialtyDiagnosticIntegrationEvent

- verbose_name: Evento de Integração Diagnóstica
- db_table: diagnostico_especializado_integracao
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| direction | CharField | yes |  | 2 |
| equipment | ForeignKey | no | fk:diagnosticos.SpecialtyDiagnosticEquipment | 0 |
| error_message | TextField | no |  | 0 |
| event_at | DateTimeField | yes |  | 0 |
| event_type | CharField | yes |  | 6 |
| external_order_id | CharField | no |  | 0 |
| external_system | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| message_control_id | CharField | no |  | 0 |
| order | ForeignKey | no | fk:diagnosticos.SpecialtyDiagnosticOrder | 0 |
| order_number | CharField | no |  | 0 |
| payload | JSONField | no |  | 0 |
| response | JSONField | no |  | 0 |
| retry_count | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- direction (2): `OUTBOUND`=Saída; `INBOUND`=Entrada
- event_type (6): `WORKLIST_CREATE`=Criar worklist; `WORKLIST_UPDATE`=Atualizar worklist; `DEVICE_IMPORT`=Importar do equipamento; `RESULT_SYNC`=Sincronizar resultado; `REPORT_SEND`=Enviar laudo; `ERROR`=Erro
- status (5): `PENDING`=Pendente; `SENT`=Enviado; `ACKNOWLEDGED`=Confirmado; `FAILED`=Falhou; `IGNORED`=Ignorado

#### diagnosticos.SpecialtyDiagnosticMeasurement

- verbose_name: Medição de Diagnóstico Especializado
- db_table: diagnostico_especializado_medicao
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| abnormal | BooleanField | yes |  | 0 |
| code | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical | BooleanField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| interpretation | TextField | no |  | 0 |
| measured_at | DateTimeField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| numeric_value | DecimalField | no |  | 0 |
| order | ForeignKey | yes | fk:diagnosticos.SpecialtyDiagnosticOrder | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| reference_range | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| text_value | TextField | no |  | 0 |
| unit | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| value_type | CharField | yes |  | 5 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- value_type (5): `NUMERIC`=Numérico; `TEXT`=Texto; `BOOLEAN`=Booleano; `WAVEFORM`=Traçado; `IMAGE`=Imagem

#### diagnosticos.SpecialtyDiagnosticOrder

- verbose_name: Exame de Diagnóstico Especializado
- db_table: diagnostico_especializado_pedido
- fields: 36

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acquisition_notes | TextField | no |  | 0 |
| clinical_indication | TextField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | no | fk:diagnosticos.SpecialtyDiagnosticEquipment | 0 |
| external_order_id | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| measurements_complete | BooleanField | yes |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| modality | CharField | yes |  | 15 |
| notes | TextField | no |  | 0 |
| order_number | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| performed_at | DateTimeField | no |  | 0 |
| preparation_notes | TextField | no |  | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| priority | CharField | yes |  | 3 |
| protocol | ForeignKey | no | fk:diagnosticos.SpecialtyDiagnosticProtocol | 0 |
| report_available | BooleanField | yes |  | 0 |
| requested_at | DateTimeField | yes |  | 0 |
| requesting_doctor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| scheduled_at | DateTimeField | no |  | 0 |
| specialist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| specialty | CharField | yes |  | 4 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 9 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- modality (15): `ECG`=Eletrocardiograma; `ECHOCARDIOGRAM`=Ecocardiograma; `EXERCISE_TEST`=Teste ergométrico; `HOLTER`=Holter; `AMBULATORY_BP`=MAPA; `EEG`=EEG; `EVOKED_POTENTIAL`=Potencial evocado; `TRANSCRANIAL_DOPPLER`=Doppler transcraniano; `EMG`=Eletromiografia; `VISUAL_FIELD`=Campo visual; `CORNEAL_TOPOGRAPHY`=Topografia corneal; `OCT`=OCT; `TONOMETRY`=Tonometria; `FUNDUS_PHOTOGRAPHY`=Retinografia; `OTHER`=Outra
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `STAT`=Emergência
- specialty (4): `CARDIOLOGY`=Cardiologia; `NEUROLOGY`=Neurologia; `OPHTHALMOLOGY`=Oftalmologia; `OTHER`=Outra
- status (9): `REQUESTED`=Solicitado; `SCHEDULED`=Agendado; `IN_PROGRESS`=Em execução; `PERFORMED`=Realizado; `REPORTING`=Em laudo; `REPORTED`=Laudado; `VALIDATED`=Validado; `DELIVERED`=Entregue; `CANCELLED`=Cancelado

#### diagnosticos.SpecialtyDiagnosticProtocol

- verbose_name: Protocolo de Diagnóstico Especializado
- db_table: diagnostico_especializado_protocolo
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acquisition_instructions | TextField | no |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_measurements | JSONField | no |  | 0 |
| default_report_template | TextField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| modality | CharField | yes |  | 15 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| preparation | TextField | no |  | 0 |
| specialty | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| typical_duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- modality (15): `ECG`=Eletrocardiograma; `ECHOCARDIOGRAM`=Ecocardiograma; `EXERCISE_TEST`=Teste ergométrico; `HOLTER`=Holter; `AMBULATORY_BP`=MAPA; `EEG`=EEG; `EVOKED_POTENTIAL`=Potencial evocado; `TRANSCRANIAL_DOPPLER`=Doppler transcraniano; `EMG`=Eletromiografia; `VISUAL_FIELD`=Campo visual; `CORNEAL_TOPOGRAPHY`=Topografia corneal; `OCT`=OCT; `TONOMETRY`=Tonometria; `FUNDUS_PHOTOGRAPHY`=Retinografia; `OTHER`=Outra
- specialty (4): `CARDIOLOGY`=Cardiologia; `NEUROLOGY`=Neurologia; `OPHTHALMOLOGY`=Oftalmologia; `OTHER`=Outra

#### diagnosticos.SpecialtyDiagnosticReport

- verbose_name: Laudo de Diagnóstico Especializado
- db_table: diagnostico_especializado_laudo
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical_notified_at | DateTimeField | no |  | 0 |
| critical_result | BooleanField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| findings | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| impression | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| order | ForeignKey | yes | fk:diagnosticos.SpecialtyDiagnosticOrder | 0 |
| recommendations | TextField | no |  | 0 |
| report_file | FileField | no |  | 0 |
| reported_at | DateTimeField | yes |  | 0 |
| signed_at | DateTimeField | no |  | 0 |
| specialist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| status | CharField | yes |  | 5 |
| technique | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| version_number | PositiveSmallIntegerField | yes |  | 0 |

**Choices**
- status (5): `DRAFT`=Rascunho; `PRELIMINARY`=Preliminar; `FINAL`=Final; `AMENDED`=Retificado; `CANCELLED`=Cancelado

### education

#### education.Assignment

- verbose_name: Trabalho
- db_table: education_assignment
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| allow_late_submission | BooleanField | yes |  | 0 |
| allow_multiple_submissions | BooleanField | yes |  | 0 |
| classroom | ForeignKey | no | fk:education.Classroom | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| due_at | DateTimeField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| instructions | TextField | no |  | 0 |
| max_score | DecimalField | yes |  | 0 |
| max_submissions | PositiveIntegerField | yes |  | 0 |
| opens_at | DateTimeField | no |  | 0 |
| published_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 3 |
| teacher | ForeignKey | no | fk:education.TeacherProfile | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| work_category | CharField | yes |  | 3 |

**Choices**
- status (3): `DRAFT`=Draft; `PUBLISHED`=Published; `CLOSED`=Closed
- work_category (3): `MANDATORY`=Mandatory; `HYGIENIC`=Hygienic; `OPTIONAL`=Optional

#### education.AssignmentSubmission

- verbose_name: Submissão de Trabalho
- db_table: education_assignment_submission
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assignment | ForeignKey | yes | fk:education.Assignment | 0 |
| attachment_url | URLField | no |  | 0 |
| attempt_number | PositiveIntegerField | yes |  | 0 |
| content_text | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| graded_at | DateTimeField | no |  | 0 |
| graded_by | ForeignKey | no | fk:education.TeacherProfile | 0 |
| id | BigAutoField | no |  | 0 |
| max_score_snapshot | DecimalField | yes |  | 0 |
| score | DecimalField | no |  | 0 |
| status | CharField | yes |  | 3 |
| student | ForeignKey | yes | fk:education.StudentProfile | 0 |
| submitted_at | DateTimeField | yes |  | 0 |
| teacher_feedback | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `SUBMITTED`=Submitted; `LATE`=Late; `GRADED`=Graded

#### education.AttendanceRecord

- verbose_name: Presença
- db_table: education_attendance_record
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| attendance_date | DateField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| id | BigAutoField | no |  | 0 |
| notes | CharField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `PRESENT`=Present; `ABSENT`=Absent; `LATE`=Late; `EXCUSED`=Excused

#### education.Classroom

- verbose_name: Turma
- db_table: education_classroom
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| academic_year | CharField | yes |  | 0 |
| capacity | PositiveIntegerField | yes |  | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| homeroom_teacher | ForeignKey | no | fk:education.TeacherProfile | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### education.Course

- verbose_name: Curso
- db_table: education_course
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| workload_hours | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `DRAFT`=Draft; `ACTIVE`=Active; `ARCHIVED`=Archived

#### education.DisciplineScheduleItem

- verbose_name: Item do Cronograma da Disciplina
- db_table: education_discipline_schedule_item
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| classroom | ForeignKey | yes | fk:education.Classroom | 0 |
| completed_at | DateTimeField | no |  | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| item_type | CharField | yes |  | 4 |
| linked_assignment | ForeignKey | no | fk:education.Assignment | 0 |
| linked_content | ForeignKey | no | fk:education.LearningContent | 0 |
| linked_examination | ForeignKey | no | fk:education.Examination | 0 |
| notes | CharField | no |  | 0 |
| requires_attendance | BooleanField | yes |  | 0 |
| scheduled_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- item_type (4): `TEST`=Test; `ASSIGNMENT`=Assignment; `THEME`=Theme; `EXERCISE`=Exercise
- status (3): `PLANNED`=Planned; `COMPLETED`=Completed; `OVERDUE`=Overdue

#### education.DisciplineScheduleStudentStatus

- verbose_name: Estado do Estudante no Cronograma
- db_table: education_discipline_schedule_student_status
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| attendance_status_snapshot | CharField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| completion_marked | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| id | BigAutoField | no |  | 0 |
| notes | CharField | no |  | 0 |
| schedule_item | ForeignKey | yes | fk:education.DisciplineScheduleItem | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `PENDING`=Pending; `SUCCESS`=Success; `OVERDUE`=Overdue

#### education.Enrollment

- verbose_name: Matrícula
- db_table: education_enrollment
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| classroom | ForeignKey | yes | fk:education.Classroom | 0 |
| closed_on | DateField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrolled_on | DateField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| status | CharField | yes |  | 5 |
| student | ForeignKey | yes | fk:education.StudentProfile | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `PENDING`=Pending; `ACTIVE`=Active; `TRANSFERRED`=Transferred; `COMPLETED`=Completed; `CANCELLED`=Cancelled

#### education.Examination

- verbose_name: Exame
- db_table: education_examination
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| classroom | ForeignKey | no | fk:education.Classroom | 0 |
| closes_at | DateTimeField | no |  | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline_final_stage | CharField | no |  | 3 |
| duration_minutes | PositiveIntegerField | yes |  | 0 |
| exam_type | CharField | yes |  | 4 |
| id | BigAutoField | no |  | 0 |
| max_attempts | PositiveIntegerField | yes |  | 0 |
| max_score | DecimalField | yes |  | 0 |
| opens_at | DateTimeField | no |  | 0 |
| pass_mark | DecimalField | yes |  | 0 |
| published_at | DateTimeField | no |  | 0 |
| scheduled_for | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| test_slot | PositiveSmallIntegerField | no |  | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline_final_stage (3): `NORMAL`=Normal; `RECORRENCIA`=Recorrencia; `ESPECIAL`=Especial
- exam_type (4): `REGULAR`=Regular; `TEST`=Test; `DISCIPLINE_FINAL`=Discipline final; `COURSE_FINAL`=Course final
- status (3): `DRAFT`=Draft; `PUBLISHED`=Published; `CLOSED`=Closed

#### education.ExaminationAttempt

- verbose_name: Tentativa de Exame
- db_table: education_examination_attempt
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| attempt_number | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| examination | ForeignKey | yes | fk:education.Examination | 0 |
| expires_at | DateTimeField | yes |  | 0 |
| graded_at | DateTimeField | no |  | 0 |
| graded_by | ForeignKey | no | fk:education.TeacherProfile | 0 |
| id | BigAutoField | no |  | 0 |
| max_score_snapshot | DecimalField | yes |  | 0 |
| requires_year_repeat | BooleanField | yes |  | 0 |
| score | DecimalField | no |  | 0 |
| started_at | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| student | ForeignKey | yes | fk:education.StudentProfile | 0 |
| submission_payload | TextField | no |  | 0 |
| submitted_at | DateTimeField | no |  | 0 |
| teacher_feedback | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| time_limit_minutes_snapshot | PositiveIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `OPENED`=Opened; `SUBMITTED`=Submitted; `EXPIRED`=Expired

#### education.GradeRecord

- verbose_name: Nota
- db_table: education_grade_record
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assignment_submission | ForeignKey | no | fk:education.AssignmentSubmission | 0 |
| component | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| examination_attempt | ForeignKey | no | fk:education.ExaminationAttempt | 0 |
| id | BigAutoField | no |  | 0 |
| max_score | DecimalField | yes |  | 0 |
| published_at | DateTimeField | no |  | 0 |
| score | DecimalField | yes |  | 0 |
| teacher | ForeignKey | no | fk:education.TeacherProfile | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| weight | DecimalField | yes |  | 0 |

#### education.LearningContent

- verbose_name: Conteúdo de Aprendizagem
- db_table: education_learning_content
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| author | ForeignKey | no | fk:education.TeacherProfile | 0 |
| body | TextField | no |  | 0 |
| content_type | CharField | yes |  | 6 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| external_url | URLField | no |  | 0 |
| file_url | URLField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| published | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- content_type (6): `LESSON`=Lesson; `DOCUMENT`=Document; `VIDEO`=Video; `LINK`=Link; `BIBLIOGRAPHY`=Bibliography; `THEMATIC_MAP`=Thematic map

#### education.RandomTest

- verbose_name: Teste Aleatório
- db_table: education_random_test
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| classroom | ForeignKey | yes | fk:education.Classroom | 0 |
| closes_at | DateTimeField | no |  | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| duration_minutes | PositiveIntegerField | yes |  | 0 |
| enrollment | ForeignKey | yes | fk:education.Enrollment | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| opens_at | DateTimeField | no |  | 0 |
| question_count | PositiveIntegerField | yes |  | 0 |
| random_seed | CharField | no |  | 0 |
| scheduled_for | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| student | ForeignKey | yes | fk:education.StudentProfile | 0 |
| teacher | ForeignKey | no | fk:education.TeacherProfile | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `SCHEDULED`=Scheduled; `OPENED`=Opened; `COMPLETED`=Completed; `EXPIRED`=Expired; `CANCELLED`=Cancelled

#### education.Skill

- verbose_name: Competência
- db_table: education_skill
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| category | CharField | yes |  | 4 |
| code | CharField | yes |  | 0 |
| course | ForeignKey | yes | fk:education.Course | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| level | CharField | yes |  | 3 |
| name | CharField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- category (4): `TECHNICAL`=Technical; `COGNITIVE`=Cognitive; `SOCIOEMOTIONAL`=Socioemotional; `LANGUAGE`=Language
- level (3): `FOUNDATION`=Foundation; `INTERMEDIATE`=Intermediate; `ADVANCED`=Advanced
- status (2): `ACTIVE`=Active; `ARCHIVED`=Archived

#### education.StudentProfile

- verbose_name: Estudante
- db_table: education_student_profile
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| birth_date | DateField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| guardian_name | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| status | CharField | yes |  | 3 |
| student_code | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | yes | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `ACTIVE`=Active; `INACTIVE`=Inactive; `SUSPENDED`=Suspended

#### education.TeacherProfile

- verbose_name: Professor
- db_table: education_teacher_profile
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| specialty | CharField | no |  | 0 |
| status | CharField | yes |  | 2 |
| teacher_code | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | yes | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (2): `ACTIVE`=Active; `INACTIVE`=Inactive

### enfermagem

#### enfermagem.NursingEvolution

- verbose_name: Evolução de Enfermagem
- db_table: enfermagem_evolucaoenfermagem
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| evolution_date | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| observation | TextField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.NursingPrescription

- verbose_name: Prescrição de Enfermagem
- db_table: enfermagem_prescricaoenfermagem
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| prescription_date | DateTimeField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.NursingRecord

- verbose_name: Registro de Enfermagem
- db_table: enfermagem_registroenfermagem
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| collection_guidance | JSONField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| lab_request | OneToOneField | no | fk:clinical.LabRequest | 0 |
| name | CharField | yes |  | 0 |
| observation | TextField | no |  | 0 |
| origin_role | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| priority | CharField | yes |  | 3 |
| record_date | DateTimeField | no |  | 0 |
| record_kind | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

**Choices**
- priority (3): `URG`=Urgente; `NOR`=Normal; `BAI`=Baixa
- record_kind (2): `MANUAL`=Manual; `LAB_COLLECTION_REQUEST`=Requisição laboratorial para coleta

#### enfermagem.NursingVitalSign

- verbose_name: Sinal Vital
- db_table: enfermagem_sinalvitalenfermagem
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| blood_pressure | CharField | no |  | 0 |
| collected_at | DateTimeField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| heart_rate | PositiveIntegerField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| oxygen_saturation | PositiveIntegerField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| record | ForeignKey | yes | fk:enfermagem.NursingRecord | 0 |
| respiratory_rate | PositiveIntegerField | no |  | 0 |
| temperature_c | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.Procedure

- verbose_name: Procedimento
- db_table: enfermagem_procedimento
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| billed_at | DateTimeField | no |  | 0 |
| billing_status | CharField | yes |  | 3 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| executed_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| materials_subtotal | DecimalField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| performed_date | DateTimeField | yes |  | 0 |
| professional | ManyToManyField | no | many_to_many:identidade.User | 0 |
| selected_catalogs | ManyToManyField | no | many_to_many:enfermagem.ProcedureCatalog | 0 |
| selected_materials | ManyToManyField | no | many_to_many:farmacia.Product | 0 |
| services_subtotal | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |
| workflow_status | CharField | yes |  | 6 |

**Choices**
- billing_status (3): `PEN`=Pendente; `PAR`=Parcial; `BIL`=Faturado
- workflow_status (6): `REQ`=Marcado; `BIL`=Faturado; `EXE`=Executado; `CON`=Concluído; `NCO`=Não concluído; `PAR`=Parcial

#### enfermagem.ProcedureCatalog

- verbose_name: Catálogo de Procedimento
- db_table: enfermagem_procedimentocatalogo
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_price | MoneyField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| estimated_duration_minutes | PositiveIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| procedure_code | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.ProcedureCatalogMaterial

- verbose_name: Material de Procedimento
- db_table: enfermagem_procedimentocatalogomaterial
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| catalog | ForeignKey | yes | fk:enfermagem.ProcedureCatalog | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_quantity | DecimalField | yes |  | 0 |
| default_unit_cost | MoneyField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| observation | TextField | no |  | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.ProcedureItem

- verbose_name: Procedimento de Enfermagem - Item
- db_table: enfermagem_procedimentoitem
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| billed | BooleanField | yes |  | 0 |
| billed_at | DateTimeField | no |  | 0 |
| catalog | ForeignKey | no | fk:enfermagem.ProcedureCatalog | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| executed_at | DateTimeField | no |  | 0 |
| execution_status | CharField | yes |  | 4 |
| id | BigAutoField | no |  | 0 |
| observation | TextField | no |  | 0 |
| performed | BooleanField | yes |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| procedure | ForeignKey | yes | fk:enfermagem.Procedure | 0 |
| quantity | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_price | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

**Choices**
- execution_status (4): `PEN`=Pendente; `EXE`=Executado; `CON`=Concluído; `NCO`=Não concluído

#### enfermagem.ProcedureItemValue

- verbose_name: Valor do Item de Procedimento
- db_table: enfermagem_procedimentoitemvalor
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | OneToOneField | yes | fk:enfermagem.ProcedureItem | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_price | MoneyField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.ProcedureMaterial

- verbose_name: Material do Procedimento
- db_table: enfermagem_procedimentomaterial
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| inventory_movement | OneToOneField | no | fk:farmacia.InventoryMovement | 0 |
| lot | ForeignKey | no | fk:farmacia.Lot | 0 |
| observation | TextField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| procedure | ForeignKey | yes | fk:enfermagem.Procedure | 0 |
| procedure_item | ForeignKey | no | fk:enfermagem.ProcedureItem | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| quantity | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.ProcedureMaterialValue

- verbose_name: Valor do Material do Procedimento
- db_table: enfermagem_procedimentomaterialvalor
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| material | OneToOneField | yes | fk:enfermagem.ProcedureMaterial | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | MoneyField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.Ward

- verbose_name: Enfermaria
- db_table: enfermagem_enfermaria
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### enfermagem.WardAdmission

- verbose_name: Internamento (Enfermaria)
- db_table: enfermagem_internamentoenfermaria
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| admission_date | DateTimeField | yes |  | 0 |
| bed | ForeignKey | yes | fk:enfermagem.WardBed | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discharged_at | DateTimeField | no |  | 0 |
| estimated_observation_hours | PositiveSmallIntegerField | no |  | 0 |
| expected_discharge_date | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| next_medication_at | DateTimeField | no |  | 0 |
| next_medication_description | CharField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | no | fk:enfermagem.Ward | 0 |

#### enfermagem.WardBed

- verbose_name: Cama
- db_table: enfermagem_camaenfermaria
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| number | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| ward | ForeignKey | yes | fk:enfermagem.Ward | 0 |

### entidades

#### entidades.Company

- verbose_name: Empresa
- db_table: entidades_empresa
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| contacts | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| email | EmailField | no |  | 0 |
| headquarters_address | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| nib | CharField | no |  | 0 |
| notes | TextField | no |  | 0 |
| nuit | CharField | no |  | 0 |
| phone1 | CharField | no |  | 0 |
| phone2 | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### equipamentos

#### equipamentos.Equipment

- verbose_name: Equipamento
- db_table: equipamentos_equipamento
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acquisition_date | DateField | no |  | 0 |
| acquisition_status | CharField | yes |  | 2 |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| initial_failure_type | CharField | no |  | 0 |
| initial_operational_status | CharField | yes |  | 3 |
| location | CharField | no |  | 0 |
| maintenance_required_since | DateTimeField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| requires_maintenance | BooleanField | yes |  | 0 |
| responsible | CharField | no |  | 0 |
| serial_number | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- acquisition_status (2): `NOVO`=Novo; `USADO`=Usado
- initial_operational_status (3): `FUNCIONANDO`=A funcionar; `AVARIADO`=Avariado; `DESLIGADO`=Desligado

### farmacia

#### farmacia.InventoryMovement

- verbose_name: Movimento de estoque
- db_table: farmacia_movimentoestoque
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| lot | ForeignKey | yes | fk:farmacia.Lot | 0 |
| material_request_item | ForeignKey | no | fk:farmacia.MaterialRequisitionItem | 0 |
| name | CharField | yes |  | 0 |
| origin | CharField | yes |  | 4 |
| quantity | PositiveIntegerField | yes |  | 0 |
| sale_item | ForeignKey | no | fk:farmacia.SaleItem | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- origin (4): `VEND`=Venda; `PROC`=Procedimento; `AJUS`=Ajuste; `REQ`=Requisição
- type (3): `ENT`=Entrada; `SAI`=Saída; `AJU`=Ajuste

#### farmacia.Lot

- verbose_name: Lote
- db_table: farmacia_lote
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expiration_date | DateField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| initial_quantity | PositiveIntegerField | yes |  | 0 |
| lot_number | CharField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| sale_price | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### farmacia.MaterialRequisition

- verbose_name: Requisição de material
- db_table: farmacia_requisicaomaterial
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| fulfilled_at | DateTimeField | no |  | 0 |
| fulfilled_by | ForeignKey | no | fk:identidade.User | 0 |
| hold_reason | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| on_hold_at | DateTimeField | no |  | 0 |
| on_hold_by | ForeignKey | no | fk:identidade.User | 0 |
| requested_by_department | CharField | no |  | 0 |
| sector | CharField | yes |  | 6 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- sector (6): `LAB`=Laboratório; `ENF`=Enfermagem; `REC`=Recepção; `MED`=Medicina; `MOC`=Medicina Ocupacional; `OUT`=Outros setores
- status (4): `PEN`=Pendente; `PAR`=Parcialmente aviada; `FUL`=Aviada; `HLD`=Arquivada (aguarda estoque)

#### farmacia.MaterialRequisitionItem

- verbose_name: Item da requisição de material
- db_table: farmacia_requisicaomaterialitem
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| lot | ForeignKey | yes | fk:farmacia.Lot | 0 |
| notes | TextField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| requested_quantity | PositiveIntegerField | yes |  | 0 |
| requisition | ForeignKey | yes | fk:farmacia.MaterialRequisition | 0 |
| supplied_quantity | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### farmacia.ParentCategory

- verbose_name: Categoria Pai
- db_table: farmacia_categoriapai
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### farmacia.Product

- verbose_name: Produto
- db_table: farmacia_produto
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat_by_default | BooleanField | yes |  | 0 |
| category | ForeignKey | no | fk:farmacia.ProductCategory | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| sale_price | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (3): `MED`=Medicamento; `MAT`=Material; `OUT`=Outro

#### farmacia.ProductCategory

- verbose_name: Categoria de Produto
- db_table: farmacia_categoriaproduto
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| parent_category | ForeignKey | no | fk:farmacia.ParentCategory | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### farmacia.Sale

- verbose_name: Venda
- db_table: farmacia_venda
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| number | CharField | yes |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### farmacia.SaleItem

- verbose_name: Item de Venda
- db_table: farmacia_itemvenda
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| quantity | PositiveIntegerField | yes |  | 0 |
| sale | ForeignKey | yes | fk:farmacia.Sale | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_price | DecimalField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### farmacia_clinica

#### farmacia_clinica.AntibioticStewardshipReview

- verbose_name: Revisão de Terapia Antibiótica
- db_table: farmacia_clinica_antibiotico_revisao
- fields: 32

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| action_taken | TextField | no |  | 0 |
| antibiotic | ForeignKey | yes | fk:farmacia.Product | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| culture_result | TextField | no |  | 0 |
| custom_id | CharField | no |  | 0 |
| deescalation_recommended | BooleanField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dose_optimized | BooleanField | yes |  | 0 |
| escalation_reason | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| indication | TextField | yes |  | 0 |
| infection_site | CharField | no |  | 0 |
| notes | TextField | no |  | 0 |
| organism | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| planned_duration_days | PositiveSmallIntegerField | yes |  | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| recommendation | TextField | no |  | 0 |
| renal_adjustment_required | BooleanField | yes |  | 0 |
| review_due_date | DateField | no |  | 0 |
| reviewed_at | DateTimeField | no |  | 0 |
| reviewer | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapy_type | CharField | yes |  | 4 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `PENDING`=Pendente; `APPROVED`=Aprovada; `DEESCALATE`=Descalonar; `ESCALATE`=Escalonar; `STOP`=Suspender; `COMPLETED`=Concluída
- therapy_type (4): `EMPIRIC`=Empírica; `TARGETED`=Guiada por cultura; `PROPHYLAXIS`=Profilaxia; `OTHER`=Outra

#### farmacia_clinica.ClinicalPharmacyIngredient

- verbose_name: Ingrediente de Preparação IV
- db_table: farmacia_clinica_ingrediente
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| concentration | CharField | no |  | 0 |
| controlled_substance | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| hazardous | BooleanField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| lot | ForeignKey | yes | fk:farmacia.Lot | 0 |
| notes | TextField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| preparation | ForeignKey | yes | fk:farmacia_clinica.ClinicalPharmacyIVPreparation | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| quantity_unit | CharField | yes |  | 7 |
| quantity_value | DecimalField | yes |  | 0 |
| role | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- quantity_unit (7): `MG`=mg; `G`=g; `MCG`=mcg; `ML`=ml; `L`=L; `IU`=UI; `UNIT`=unidade
- role (6): `ACTIVE`=Ativo; `DILUENT`=Diluente; `ELECTROLYTE`=Eletrólito; `ADDITIVE`=Aditivo; `SOLVENT`=Solvente; `OTHER`=Outro

#### farmacia_clinica.ClinicalPharmacyIVPreparation

- verbose_name: Preparação IV
- db_table: farmacia_clinica_preparacao_iv
- fields: 41

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| beyond_use_hours | PositiveSmallIntegerField | yes |  | 0 |
| compatibility_check_passed | BooleanField | yes |  | 0 |
| container_type | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| diluent | CharField | no |  | 0 |
| dispensed_at | DateTimeField | no |  | 0 |
| dose_unit | CharField | yes |  | 7 |
| dose_value | DecimalField | yes |  | 0 |
| expires_at | DateTimeField | no |  | 0 |
| final_volume_ml | DecimalField | yes |  | 0 |
| hazardous_drug | BooleanField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| infusion_duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| lot | ForeignKey | no | fk:farmacia.Lot | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| pharmacist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| preparation_type | CharField | yes |  | 6 |
| prepared_at | DateTimeField | no |  | 0 |
| prepared_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| priority | CharField | yes |  | 3 |
| product | ForeignKey | no | fk:farmacia.Product | 0 |
| protocol_reference | CharField | no |  | 0 |
| rejection_reason | TextField | no |  | 0 |
| requested_at | DateTimeField | yes |  | 0 |
| route | CharField | no |  | 0 |
| scheduled_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 8 |
| sterility_check_passed | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| verified_at | DateTimeField | no |  | 0 |
| verifier | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- dose_unit (7): `MG`=mg; `G`=g; `MCG`=mcg; `ML`=ml; `L`=L; `IU`=UI; `UNIT`=unidade
- preparation_type (6): `IV_ADMIXTURE`=Mistura intravenosa; `CHEMOTHERAPY`=Quimioterápico; `TPN`=Nutrição parenteral total; `ANTIBIOTIC`=Antibiótico intravenoso; `BIOLOGIC`=Biológico; `OTHER`=Outra
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `STAT`=Emergência
- status (8): `REQUESTED`=Solicitada; `VERIFIED`=Verificada; `IN_PREPARATION`=Em preparação; `PREPARED`=Preparada; `DISPENSED`=Dispensada; `ADMINISTERED`=Administrada; `REJECTED`=Rejeitada; `CANCELLED`=Cancelada

#### farmacia_clinica.ControlledSubstanceMovement

- verbose_name: Movimento de Substância Controlada
- db_table: farmacia_clinica_controlado_movimento
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| chain_of_custody_code | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| lot | ForeignKey | yes | fk:farmacia.Lot | 0 |
| movement_at | DateTimeField | yes |  | 0 |
| movement_type | CharField | yes |  | 6 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| preparation | ForeignKey | no | fk:farmacia_clinica.ClinicalPharmacyIVPreparation | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| product | ForeignKey | yes | fk:farmacia.Product | 0 |
| quantity | DecimalField | yes |  | 0 |
| reason | TextField | no |  | 0 |
| responsible | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| running_balance | DecimalField | yes |  | 0 |
| schedule | CharField | yes |  | 5 |
| source | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit | CharField | yes |  | 7 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| witness | ForeignKey | no | fk:recursos_humanos.Employee | 0 |

**Choices**
- movement_type (6): `RECEIPT`=Recepção; `DISPENSE`=Dispensa; `ADMINISTER`=Administração; `RETURN`=Devolução; `WASTE`=Descarte; `ADJUSTMENT`=Ajuste
- schedule (5): `SCHEDULE_I`=Lista I; `SCHEDULE_II`=Lista II; `SCHEDULE_III`=Lista III; `SCHEDULE_IV`=Lista IV; `OTHER`=Outra
- unit (7): `MG`=mg; `G`=g; `MCG`=mcg; `ML`=ml; `L`=L; `IU`=UI; `UNIT`=unidade

#### farmacia_clinica.DrugInteractionRule

- verbose_name: Regra de Interação Medicamentosa
- db_table: farmacia_clinica_interacao_regra
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| clinical_effect | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| interacting_drug | ForeignKey | yes | fk:farmacia.Product | 0 |
| mechanism | TextField | no |  | 0 |
| name | CharField | yes |  | 0 |
| primary_drug | ForeignKey | yes | fk:farmacia.Product | 0 |
| recommendation | TextField | yes |  | 0 |
| severity | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- severity (4): `MINOR`=Menor; `MODERATE`=Moderada; `MAJOR`=Grave; `CONTRAINDICATED`=Contraindicada

#### farmacia_clinica.MedicationInteractionCheck

- verbose_name: Verificação de Interação Medicamentosa
- db_table: farmacia_clinica_interacao_verificacao
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| action_taken | TextField | no |  | 0 |
| checked_at | DateTimeField | yes |  | 0 |
| clinical_context | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| interacting_drug | ForeignKey | yes | fk:farmacia.Product | 0 |
| notes | TextField | no |  | 0 |
| override_reason | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| pharmacist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| primary_drug | ForeignKey | yes | fk:farmacia.Product | 0 |
| recommendation | TextField | no |  | 0 |
| rule | ForeignKey | no | fk:farmacia_clinica.DrugInteractionRule | 0 |
| severity | CharField | yes |  | 4 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- severity (4): `MINOR`=Menor; `MODERATE`=Moderada; `MAJOR`=Grave; `CONTRAINDICATED`=Contraindicada
- status (4): `PENDING`=Pendente; `REVIEWED`=Revista; `OVERRIDDEN`=Justificada; `CLEARED`=Liberada

### faturamento

#### faturamento.Invoice

- verbose_name: Fatura
- db_table: faturamento_fatura
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| consultation | OneToOneField | no | fk:consultas.MedicalConsultation | 0 |
| consultations | ManyToManyField | no | many_to_many:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| insurance_amount | DecimalField | yes |  | 0 |
| origin | CharField | yes |  | 6 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| patient_amount | DecimalField | yes |  | 0 |
| procedure | ForeignKey | no | fk:enfermagem.Procedure | 0 |
| procedures | ManyToManyField | no | many_to_many:enfermagem.Procedure | 0 |
| request | OneToOneField | no | fk:clinical.LabRequest | 0 |
| sale | OneToOneField | no | fk:farmacia.Sale | 0 |
| status | CharField | yes |  | 4 |
| subtotal | DecimalField | yes |  | 0 |
| surgery | OneToOneField | no | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_amount | DecimalField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- origin (6): `CLI`=Clínico; `FAR`=Farmácia; `ENF`=Enfermagem; `CON`=Consulta; `CIR`=Cirurgia; `MIX`=Mista
- status (4): `RASC`=Rascunho; `EMIT`=Emitida; `PAGA`=Paga; `CANC`=Cancelada

#### faturamento.InvoiceHistory

- verbose_name: Histórico de Fatura
- db_table: faturamento_historicofatura
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| event_type | CharField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | yes | fk:faturamento.Invoice | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### faturamento.InvoiceItem

- verbose_name: Item de Fatura
- db_table: faturamento_faturaitem
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| applies_vat | BooleanField | yes |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| exam | ForeignKey | no | fk:clinical.LabExam | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | yes | fk:faturamento.Invoice | 0 |
| item_type | CharField | yes |  | 7 |
| medical_exam | ForeignKey | no | fk:clinical.MedicalExam | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| procedure_item | ForeignKey | no | fk:enfermagem.ProcedureItem | 0 |
| procedure_material | ForeignKey | no | fk:enfermagem.ProcedureMaterial | 0 |
| product | ForeignKey | no | fk:farmacia.Product | 0 |
| quantity | DecimalField | yes |  | 0 |
| sale_item | ForeignKey | no | fk:farmacia.SaleItem | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_price | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vat_percentage | DecimalField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- item_type (7): `EXA`=Exame; `EXM`=Exame médico; `FAR`=Item de farmácia; `PRC`=Serviço de enfermagem; `MAT`=Material de enfermagem; `CON`=Consulta médica; `AJU`=Ajuste manual

### fisioterapia

#### fisioterapia.FunctionalAssessment

- verbose_name: Avaliação Funcional
- db_table: fisioterapia_avaliacao_funcional
- fields: 31

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assessed_at | DateTimeField | yes |  | 0 |
| balance_score | PositiveSmallIntegerField | yes |  | 0 |
| body_region | CharField | yes |  | 13 |
| clinical_diagnosis | TextField | no |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| functional_diagnosis | TextField | no |  | 0 |
| functional_independence_score | PositiveSmallIntegerField | yes |  | 0 |
| goals | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| limitations | TextField | no |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| mobility_score | PositiveSmallIntegerField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| pain_score | PositiveSmallIntegerField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| precautions | TextField | no |  | 0 |
| primary_complaint | TextField | no |  | 0 |
| range_of_motion | TextField | no |  | 0 |
| status | CharField | yes |  | 4 |
| strength_score | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (13): `CERVICAL`=Cervical; `SHOULDER`=Ombro; `ELBOW`=Cotovelo; `WRIST_HAND`=Punho/Mão; `THORACIC`=Torácica; `LUMBAR`=Lombar; `HIP`=Anca; `KNEE`=Joelho; `ANKLE_FOOT`=Tornozelo/Pé; `NEUROLOGICAL`=Neurológica; `CARDIORESPIRATORY`=Cardiorrespiratória; `GLOBAL`=Global; `OTHER`=Outra
- status (4): `DRAFT`=Rascunho; `ACTIVE`=Ativa; `FINALIZED`=Finalizada; `CANCELLED`=Cancelada

#### fisioterapia.PhysiotherapyDevice

- verbose_name: Aparelho de Fisioterapia
- db_table: fisioterapia_aparelho
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device_type | CharField | yes |  | 9 |
| id | BigAutoField | no |  | 0 |
| last_maintenance | DateField | no |  | 0 |
| location | CharField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| next_maintenance | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| serial_number | CharField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- device_type (9): `ELECTROTHERAPY`=Eletroterapia; `ULTRASOUND`=Ultrassom; `LASER`=Laser; `TENS`=TENS; `CPM`=Mobilização passiva contínua; `EXERCISE`=Exercício; `RESPIRATORY`=Respiratório; `MOBILITY`=Mobilidade; `OTHER`=Outro
- status (3): `ACTIVE`=Ativo; `MAINTENANCE`=Em manutenção; `INACTIVE`=Inativo

#### fisioterapia.RehabilitationDeviceUsage

- verbose_name: Uso de Aparelho
- db_table: fisioterapia_aparelho_uso
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device | ForeignKey | yes | fk:fisioterapia.PhysiotherapyDevice | 0 |
| duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| ended_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| outcome | TextField | no |  | 0 |
| session | ForeignKey | yes | fk:fisioterapia.RehabilitationSession | 0 |
| settings | CharField | no |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### fisioterapia.RehabilitationProgressNote

- verbose_name: Evolução de Reabilitação
- db_table: fisioterapia_evolucao
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| functional_score | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| pain_score | PositiveSmallIntegerField | yes |  | 0 |
| plan | ForeignKey | yes | fk:fisioterapia.RehabilitationTreatmentPlan | 0 |
| progress_percent | DecimalField | yes |  | 0 |
| recommendations | TextField | no |  | 0 |
| recorded_at | DateTimeField | yes |  | 0 |
| session | ForeignKey | no | fk:fisioterapia.RehabilitationSession | 0 |
| summary | TextField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| trend | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- trend (3): `IMPROVED`=Melhorou; `STABLE`=Estável; `WORSENED`=Piorou

#### fisioterapia.RehabilitationSession

- verbose_name: Sessão de Reabilitação
- db_table: fisioterapia_sessao
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| balance_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| ended_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| interventions_performed | TextField | no |  | 0 |
| mobility_score | PositiveSmallIntegerField | yes |  | 0 |
| next_steps | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| pain_after | PositiveSmallIntegerField | yes |  | 0 |
| pain_before | PositiveSmallIntegerField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| patient_response | TextField | no |  | 0 |
| plan | ForeignKey | yes | fk:fisioterapia.RehabilitationTreatmentPlan | 0 |
| scheduled_at | DateTimeField | yes |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| strength_score | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `SCHEDULED`=Agendada; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluída; `MISSED`=Faltou; `CANCELLED`=Cancelada

#### fisioterapia.RehabilitationTreatmentPlan

- verbose_name: Plano de Tratamento de Reabilitação
- db_table: fisioterapia_plano_tratamento
- fields: 30

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assessment | ForeignKey | no | fk:fisioterapia.FunctionalAssessment | 0 |
| body_region | CharField | yes |  | 13 |
| completed_sessions | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| end_date | DateField | no |  | 0 |
| frequency_per_week | PositiveSmallIntegerField | yes |  | 0 |
| home_program | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| objectives | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| planned_sessions | PositiveSmallIntegerField | yes |  | 0 |
| precautions | TextField | no |  | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| progress_percent | DecimalField | yes |  | 0 |
| protocol | TextField | no |  | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (13): `CERVICAL`=Cervical; `SHOULDER`=Ombro; `ELBOW`=Cotovelo; `WRIST_HAND`=Punho/Mão; `THORACIC`=Torácica; `LUMBAR`=Lombar; `HIP`=Anca; `KNEE`=Joelho; `ANKLE_FOOT`=Tornozelo/Pé; `NEUROLOGICAL`=Neurológica; `CARDIORESPIRATORY`=Cardiorrespiratória; `GLOBAL`=Global; `OTHER`=Outra
- status (5): `DRAFT`=Rascunho; `ACTIVE`=Ativo; `PAUSED`=Pausado; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

#### fisioterapia.TreatmentPlanIntervention

- verbose_name: Intervenção do Plano
- db_table: fisioterapia_plano_intervencao
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| body_region | CharField | yes |  | 13 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | yes |  | 0 |
| device | ForeignKey | no | fk:fisioterapia.PhysiotherapyDevice | 0 |
| dosage | CharField | no |  | 0 |
| duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| instructions | TextField | no |  | 0 |
| intensity | CharField | no |  | 0 |
| intervention_type | CharField | yes |  | 8 |
| plan | ForeignKey | yes | fk:fisioterapia.RehabilitationTreatmentPlan | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| repetitions | PositiveSmallIntegerField | yes |  | 0 |
| sets | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (13): `CERVICAL`=Cervical; `SHOULDER`=Ombro; `ELBOW`=Cotovelo; `WRIST_HAND`=Punho/Mão; `THORACIC`=Torácica; `LUMBAR`=Lombar; `HIP`=Anca; `KNEE`=Joelho; `ANKLE_FOOT`=Tornozelo/Pé; `NEUROLOGICAL`=Neurológica; `CARDIORESPIRATORY`=Cardiorrespiratória; `GLOBAL`=Global; `OTHER`=Outra
- intervention_type (8): `EXERCISE`=Exercício terapêutico; `MANUAL_THERAPY`=Terapia manual; `ELECTROTHERAPY`=Eletroterapia; `RESPIRATORY`=Fisioterapia respiratória; `GAIT_TRAINING`=Treino de marcha; `MOBILITY`=Mobilidade; `EDUCATION`=Educação do paciente; `OTHER`=Outro

### identidade

#### identidade.PasswordResetToken

- verbose_name: Token de Reset de Password
- db_table: identidade_passwordresettoken
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| token | CharField | no |  | 0 |
| used | BooleanField | yes |  | 0 |
| user | ForeignKey | yes | fk:identidade.User | 0 |

#### identidade.ProfessionalProfile

- verbose_name: Perfil Profissional
- db_table: identidade_perfilprofissional
- fields: 9

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| department | CharField | no |  | 0 |
| employee | OneToOneField | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| professional_registration | CharField | no |  | 0 |
| role | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| user | OneToOneField | yes | fk:identidade.User | 0 |

#### identidade.User

- verbose_name: Usuário
- db_table: identidade_user
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date_joined | DateTimeField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| email | EmailField | yes |  | 0 |
| first_name | CharField | no |  | 0 |
| groups | ManyToManyField | no | many_to_many:auth.Group | 0 |
| id | BigAutoField | no |  | 0 |
| is_active | BooleanField | yes |  | 0 |
| is_staff | BooleanField | yes |  | 0 |
| is_superuser | BooleanField | yes |  | 0 |
| last_login | DateTimeField | no |  | 0 |
| last_name | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| password | CharField | yes |  | 0 |
| phone | CharField | no |  | 0 |
| photo | ImageField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user_permissions | ManyToManyField | no | many_to_many:auth.Permission | 0 |
| username | CharField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### inquilinos

#### inquilinos.SubscriptionPlan

- verbose_name: Plano de Assinatura
- db_table: inquilinos_planoassinatura
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| allows_multi_unit | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| monthly_price | DecimalField | yes |  | 0 |
| monthly_request_limit | PositiveIntegerField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| order | PositiveIntegerField | yes |  | 0 |
| priority_support | BooleanField | yes |  | 0 |
| request_overage_price | DecimalField | yes |  | 0 |
| type | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user_limit | PositiveIntegerField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (3): `FREE`=Free; `BASIC`=Basic; `PRO`=Pro

#### inquilinos.Tenant

- verbose_name: Cliente
- db_table: inquilinos_inquilino
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| blocked_at | DateTimeField | no |  | 0 |
| commercial_status | CharField | yes |  | 3 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| domain | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| identifier | SlugField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| trial_until | DateField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- commercial_status (3): `TRIAL`=Experimental; `ATIVO`=Ativo; `SUSPENSO`=Suspenso

#### inquilinos.TenantConfiguration

- verbose_name: Configuração do Cliente
- db_table: inquilinos_configuracaoinquilino
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| allows_multi_unit | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| currency | CharField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| holiday_consultation_percentage_surcharge | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| language | CharField | yes |  | 0 |
| tenant | OneToOneField | yes | fk:inquilinos.Tenant | 0 |
| time_zone | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user_limit | PositiveIntegerField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### inquilinos.TenantFeatureFlag

- verbose_name: Funcionalidade do Cliente
- db_table: inquilinos_featureflagtenant
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| key | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### inquilinos.TenantSubscription

- verbose_name: Assinatura
- db_table: inquilinos_assinaturatenant
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| cycle | CharField | yes |  | 2 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| end_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| plan | ForeignKey | yes | fk:inquilinos.SubscriptionPlan | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- cycle (2): `MENSAL`=Mensal; `ANUAL`=Anual
- status (2): `ATIVA`=Ativa; `CANCELADA`=Cancelada

#### inquilinos.TenantUsage

- verbose_name: Uso do Cliente
- db_table: inquilinos_usotenant
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active_users | PositiveIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| current_month_requests | PositiveIntegerField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| tenant | OneToOneField | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### inspecoes

#### inspecoes.DailyInspection

- verbose_name: Inspeção Diária
- db_table: inspecoes_inspecaodiaria
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assessment | TextField | no |  | 0 |
| cleaning_performed | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | yes | fk:equipamentos.Equipment | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| operation_status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- operation_status (3): `FUNCIONANDO`=A funcionar; `AVARIADO`=Avariado; `DESLIGADO`=Desligado

### integracoes_equipamentos

#### integracoes_equipamentos.IntegrationAnalyteMapping

- verbose_name: Mapeamento de analito
- db_table: integracoes_equipamentos_integracaomapeamentoanalito
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationEquipment | 0 |
| exam_field | ForeignKey | yes | fk:clinical.LabExamField | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_override | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### integracoes_equipamentos.IntegrationCredential

- verbose_name: Credencial (Equipamento)
- db_table: integracoes_equipamentos_integracaocredencial
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationEquipment | 0 |
| id | BigAutoField | no |  | 0 |
| key_hash | CharField | yes |  | 0 |
| key_last4 | CharField | no |  | 0 |
| key_prefix | CharField | no |  | 0 |
| label | CharField | no |  | 0 |
| revoked_at | DateTimeField | no |  | 0 |
| scopes | JSONField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### integracoes_equipamentos.IntegrationDocument

- verbose_name: Documento (Integração)
- db_table: integracoes_equipamentos_integracaodocumento
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| content_type | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| file | FileField | yes |  | 0 |
| filename | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| message | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationMessage | 0 |
| order_item | ForeignKey | no | fk:integracoes_equipamentos.IntegrationOrderItem | 0 |
| sha256 | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### integracoes_equipamentos.IntegrationEquipment

- verbose_name: Equipamento (Integração)
- db_table: integracoes_equipamentos_integracaoequipamento
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| auto_consume_results | BooleanField | yes |  | 0 |
| config | JSONField | no |  | 0 |
| connection_mode | CharField | yes |  | 3 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| encoding | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| last_seen_at | DateTimeField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| modality | CharField | yes |  | 20 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| protocol | CharField | yes |  | 7 |
| serial_number | CharField | no |  | 0 |
| supported_exam_types | JSONField | no |  | 0 |
| tcp_framing | CharField | yes |  | 4 |
| tcp_host | CharField | no |  | 0 |
| tcp_port | PositiveIntegerField | no |  | 0 |
| tcp_timeout_seconds | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- connection_mode (3): `PASSIVE_API`=API passiva; `TCP_SERVER`=Servidor TCP/IP; `TCP_CLIENT`=Cliente TCP/IP
- modality (20): `ECG`=Eletrocardiograma; `HEM`=Hemograma (Hematologia); `BIO`=Bioquímica; `IMU`=Imunologia; `COAG`=Coagulação; `URI`=Urinálise; `GAS`=Gasometria; `US`=Ecografia (Ultrassom); `XR`=Raios-X; `CT`=Tomografia; `MRI`=Ressonância magnética; `MG`=Mamografia; `ECHO`=Ecocardiograma; `HOLTER`=Holter; `MAPA`=MAPA; `EEG`=Eletroencefalograma; `OCT`=Tomografia de coerência óptica; `VISUAL_FIELD`=Campo visual; `CORNEAL_TOPOGRAPHY`=Topografia corneal; `OUT`=Outro
- protocol (7): `HTTP_JSON`=HTTP (JSON); `HL7_MLLP`=HL7 v2 (MLLP); `ASTM_TCP`=ASTM (TCP); `TCP_JSON`=TCP/IP JSON; `TCP_RAW`=TCP/IP bruto; `DICOM`=DICOM; `FILE_DROP`=File drop (pasta)
- tcp_framing (4): `JSON_LINE`=JSON por linha; `MLLP`=HL7 MLLP; `ASTM`=ASTM; `RAW`=Bruto

#### integracoes_equipamentos.IntegrationMessage

- verbose_name: Mensagem (Integração)
- db_table: integracoes_equipamentos_integracaomensagem
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| content_type | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| direction | CharField | yes |  | 2 |
| equipment | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationEquipment | 0 |
| error | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| message_id | CharField | no |  | 0 |
| order | ForeignKey | no | fk:integracoes_equipamentos.IntegrationOrder | 0 |
| payload_json | JSONField | no |  | 0 |
| payload_raw | TextField | no |  | 0 |
| processed_at | DateTimeField | no |  | 0 |
| protocol | CharField | no |  | 0 |
| sha256 | CharField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- direction (2): `IN`=Entrada; `OUT`=Saída
- status (3): `RECV`=Recebida; `PROC`=Processada; `ERRO`=Erro

#### integracoes_equipamentos.IntegrationOrder

- verbose_name: Ordem (Integração)
- db_table: integracoes_equipamentos_integracaoordem
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationEquipment | 0 |
| id | BigAutoField | no |  | 0 |
| observation | TextField | no |  | 0 |
| request | ForeignKey | yes | fk:clinical.LabRequest | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `PEND`=Pendente; `SEND`=Enviada; `EXEC`=Em execução; `DONE`=Concluída; `ERRO`=Erro; `CANC`=Cancelada

#### integracoes_equipamentos.IntegrationOrderItem

- verbose_name: Item de ordem (Integração)
- db_table: integracoes_equipamentos_integracaoordemitem
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| order | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationOrder | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| request_item | ForeignKey | yes | fk:clinical.LabRequestItem | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `PEND`=Pendente; `EXEC`=Em execução; `DONE`=Concluído; `ERRO`=Erro; `CANC`=Cancelado

#### integracoes_equipamentos.IntegrationRouting

- verbose_name: Roteamento (Integração)
- db_table: integracoes_equipamentos_integracaoroteamento
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | yes | fk:integracoes_equipamentos.IntegrationEquipment | 0 |
| exam_type | CharField | yes |  | 7 |
| id | BigAutoField | no |  | 0 |
| sector | CharField | yes |  | 35 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- exam_type (7): `LAB`=Exame laboratorial; `MED`=Exame médico (imagem/diagnóstico); `RAD`=Radiologia / Imagiologia; `SDX`=Diagnóstico especializado; `CAR`=Cardiologia; `NEU`=Neurologia; `OFT`=Oftalmologia
- sector (35): `Hematologia`=Hematologia; `Bioquimica`=Bioquímica; `Microbiologia`=Microbiologia; `Imunologia`=Imunologia; `Serologia`=Serologia; `Parasitologia`=Parasitologia; `BiologiaMolecular`=Biologia Molecular; `Toxicologia`=Toxicologia; `Hormonios`=Hormônios e Endocrinologia; `MarcadoresTumorais`=Marcadores Tumorais; `Coagulacao`=Coagulação; `Urinalise`=Urinálise; `LiquidosCorporais`=Líquidos Corporais; `Gasometria`=Gasometria; `NutricaoClinica`=Nutrição Clínica; `Micologia`=Micologia; `Virologia`=Virologia; `Bacteriologia`=Bacteriologia; `BancoSangue`=Banco de Sangue; `ImunoHematologia`=Imuno-hematologia; `Triagem`=Triagem Laboratorial; `RecepcaoAmostras`=Recepção de Amostras; `ControleQualidade`=Controle de Qualidade; `Pesquisa`=Pesquisa Laboratorial; `Outro`=Outro; `Radiologia`=Radiologia; `DiagnosticoImagem`=Diagnóstico por Imagem; `Cardiologia`=Cardiologia; `GinecoObstetricia`=Ginecologia/Obstetrícia; `Ortopedia`=Ortopedia/Traumato; `Neurologia`=Neurologia; `Otorrino`=Otorrinolaringologia; `Oftalmologia`=Oftalmologia; `MedicinaNuclear`=Medicina Nuclear; `Endoscopia`=Endoscopia

### manutencoes

#### manutencoes.Maintenance

- verbose_name: Manutenção
- db_table: manutencoes_manutencao
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| equipment | ForeignKey | yes | fk:equipamentos.Equipment | 0 |
| id | BigAutoField | no |  | 0 |
| incident | ForeignKey | no | fk:ocorrencias.Incident | 0 |
| maintenance_type | CharField | yes |  | 2 |
| performed_date | DateField | no |  | 0 |
| scheduled_date | DateField | yes |  | 0 |
| technician | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 5 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- maintenance_type (2): `PREVENTIVA`=Preventiva; `CORRECTIVA`=Correctiva
- type (5): `DIARIA`=Diária; `SEMANAL`=Semanal; `MENSAL`=Mensal; `SEMESTRAL`=Semestral; `ANUAL`=Anual

### maternidade

#### maternidade.Pregnancy

- verbose_name: Gestação
- db_table: maternidade_gestacao
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| cesareans | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | yes |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expected_delivery_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| last_menstrual_period_date | DateField | no |  | 0 |
| maternity_bed | CharField | no |  | 0 |
| normal_deliveries | PositiveSmallIntegerField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| nursery | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| responsible_doctor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total_deliveries | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `ACOMP`=Em acompanhamento; `PARTO`=Parto performed; `ENCERR`=Encerrada; `CANCEL`=Cancelada

### monitoramento

#### monitoramento.SystemError

- verbose_name: Erro do Sistema
- db_table: monitoramento_errosistema
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| duration_ms | PositiveIntegerField | no |  | 0 |
| exception_class | CharField | no |  | 0 |
| full_path | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| ip | GenericIPAddressField | no |  | 0 |
| message | CharField | no |  | 0 |
| metadata | JSONField | no |  | 0 |
| method | CharField | yes |  | 0 |
| object_id | CharField | no |  | 0 |
| path | CharField | yes |  | 0 |
| status_code | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| traceback | TextField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| user | ForeignKey | no | fk:identidade.User | 0 |
| user_agent | CharField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| view_action | CharField | no |  | 0 |
| view_basename | CharField | no |  | 0 |

#### monitoramento.TransactionalOutboxEvent

- verbose_name: Evento de Outbox
- db_table: monitoramento_eventooutbox
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| aggregate_id | CharField | no |  | 0 |
| aggregate_version | PositiveIntegerField | no |  | 0 |
| attempts | PositiveIntegerField | yes |  | 0 |
| available_at | DateTimeField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| event_id | UUIDField | yes |  | 0 |
| event_type | CharField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| idempotency_key | CharField | no |  | 0 |
| last_error | TextField | no |  | 0 |
| occurred_at | DateTimeField | yes |  | 0 |
| payload | JSONField | yes |  | 0 |
| published_at | DateTimeField | no |  | 0 |
| source | CharField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| tenant_identifier | CharField | no |  | 0 |
| trace_id | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |

**Choices**
- status (4): `pending`=Pendente; `delivered`=Entregue; `failed`=Falhado; `dead_letter`=Dead letter

### notificacoes

#### notificacoes.DeliveryLog

- verbose_name: Log de Envio
- db_table: notificacoes_logenvio
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notification | ForeignKey | yes | fk:notificacoes.Notification | 0 |
| response | TextField | no |  | 0 |
| status | CharField | yes |  | 0 |

#### notificacoes.Notification

- verbose_name: Notificação
- db_table: notificacoes_notificacao
- fields: 12

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| channel | CharField | yes |  | 3 |
| created_at | DateTimeField | no |  | 0 |
| event_type | CharField | yes |  | 5 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| message | TextField | yes |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| recipient | CharField | yes |  | 0 |
| send_error | TextField | no |  | 0 |
| sent | BooleanField | yes |  | 0 |
| sent_at | DateTimeField | no |  | 0 |
| subject | CharField | no |  | 0 |

**Choices**
- channel (3): `email`=E-mail; `sms`=SMS; `whatsapp`=WhatsApp
- event_type (5): `GERAL`=Geral; `RESET_SENHA`=Reposição de palavra-passe; `RESULTADO`=Resultado disponível; `FATURA`=Fatura emitida; `RECIBO`=Recibo gerado

#### notificacoes.NotificationTemplate

- verbose_name: Template de Notificação
- db_table: notificacoes_templatenotificacao
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| content | TextField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |

### ocorrencias

#### ocorrencias.Incident

- verbose_name: Ocorrência
- db_table: ocorrencias_ocorrencia
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateTimeField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | yes |  | 0 |
| equipment | ForeignKey | no | fk:equipamentos.Equipment | 0 |
| id | BigAutoField | no |  | 0 |
| maintenance_completed_at | DateTimeField | no |  | 0 |
| maintenance_requested_at | DateTimeField | no |  | 0 |
| post_incident_actions | TextField | no |  | 0 |
| requires_maintenance | BooleanField | yes |  | 0 |
| resolved | BooleanField | yes |  | 0 |
| support_contact | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (3): `AVARIA`=Avaria; `INCIDENTE`=Incidente; `OUTRO`=Outro

### odontologia

#### odontologia.DentalAppointment

- verbose_name: Consulta Dentária
- db_table: odontologia_agenda
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| chair | CharField | no |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dentist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| reason | CharField | no |  | 0 |
| scheduled_end | DateTimeField | no |  | 0 |
| scheduled_start | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 7 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (7): `SCHEDULED`=Agendada; `CONFIRMED`=Confirmada; `CHECKED_IN`=Presente; `IN_PROGRESS`=Em atendimento; `COMPLETED`=Concluída; `CANCELLED`=Cancelada; `NO_SHOW`=Faltou

#### odontologia.DentalOdontogramEntry

- verbose_name: Entrada do Odontograma
- db_table: odontologia_odontograma
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| condition | CharField | yes |  | 10 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| procedure | ForeignKey | no | fk:odontologia.DentalProcedure | 0 |
| record | ForeignKey | yes | fk:odontologia.DentalRecord | 0 |
| surface | CharField | yes |  | 9 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tooth_number | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- condition (10): `HEALTHY`=Saudável; `CARIES`=Cárie; `RESTORATION`=Restauração; `MISSING`=Ausente; `CROWN`=Coroa; `ROOT_CANAL`=Endodontia; `IMPLANT`=Implante; `EXTRACTION_INDICATED`=Extração indicada; `PROSTHESIS`=Prótese; `OTHER`=Outro
- surface (9): `WHOLE`=Dente inteiro; `O`=Oclusal; `M`=Mesial; `D`=Distal; `V`=Vestibular; `L`=Lingual; `P`=Palatina; `I`=Incisal; `G`=Gengival

#### odontologia.DentalPatientTreatmentPlan

- verbose_name: Paciente com Plano Dentário
- db_table: odontologia_plano_tratamento_paciente
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assigned_at | DateTimeField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dentist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| record | ForeignKey | no | fk:odontologia.DentalRecord | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| treatment_plan | ForeignKey | yes | fk:odontologia.DentalTreatmentPlan | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| valid_from | DateField | yes |  | 0 |
| valid_until | DateField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `ACTIVE`=Válido; `EXPIRED`=Expirado; `CANCELLED`=Cancelado

#### odontologia.DentalProcedure

- verbose_name: Procedimento Dentário
- db_table: odontologia_procedimento
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| base_price | DecimalField | yes |  | 0 |
| category | CharField | yes |  | 9 |
| code | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| requires_prosthesis_lab | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- category (9): `PREVENTIVE`=Preventivo; `RESTORATIVE`=Restaurador; `ENDODONTICS`=Endodontia; `PERIODONTICS`=Periodontia; `SURGERY`=Cirurgia oral; `ORTHODONTICS`=Ortodontia; `PROSTHESIS`=Prótese; `IMAGING`=Imagem; `OTHER`=Outro

#### odontologia.DentalProsthesisLabOrder

- verbose_name: Ordem de Laboratório de Prótese
- db_table: odontologia_ordem_laboratorio_protese
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| cost | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| delivered_at | DateTimeField | no |  | 0 |
| dentist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| due_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| impression_date | DateField | no |  | 0 |
| lab_company | ForeignKey | no | fk:entidades.Company | 0 |
| lab_notes | TextField | no |  | 0 |
| material | CharField | no |  | 0 |
| order_number | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| prosthesis_type | CharField | yes |  | 6 |
| received_at | DateTimeField | no |  | 0 |
| sent_at | DateTimeField | no |  | 0 |
| shade | CharField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tooth_numbers | CharField | no |  | 0 |
| treatment_item | ForeignKey | no | fk:odontologia.DentalTreatmentPlanItem | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- prosthesis_type (6): `CROWN`=Coroa; `BRIDGE`=Ponte; `DENTURE`=Prótese removível; `IMPLANT`=Implante; `ORTHODONTIC`=Aparelho ortodôntico; `OTHER`=Outro
- status (6): `REQUESTED`=Solicitado; `SENT_TO_LAB`=Enviado ao laboratório; `IN_PRODUCTION`=Em produção; `RECEIVED`=Recebido; `DELIVERED`=Entregue; `CANCELLED`=Cancelado

#### odontologia.DentalRecord

- verbose_name: Prontuário Dentário
- db_table: odontologia_prontuario
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| appointment | ForeignKey | no | fk:odontologia.DentalAppointment | 0 |
| chief_complaint | TextField | no |  | 0 |
| closed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dental_history | TextField | no |  | 0 |
| dentist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| diagnosis | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| opened_at | DateTimeField | yes |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| treatment_summary | TextField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `ACTIVE`=Ativo; `FINALIZED`=Finalizado; `CANCELLED`=Cancelado

#### odontologia.DentalTreatmentPlan

- verbose_name: Plano de Tratamento Dentário
- db_table: odontologia_plano_tratamento
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| approved_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dentist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| estimated_total | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| objectives | TextField | no |  | 0 |
| patient | ForeignKey | no | fk:clinical.Patient | 0 |
| planned_end | DateField | no |  | 0 |
| planned_start | DateField | no |  | 0 |
| record | ForeignKey | no | fk:odontologia.DentalRecord | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (6): `DRAFT`=Rascunho; `PROPOSED`=Proposto; `APPROVED`=Aprovado; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

#### odontologia.DentalTreatmentPlanItem

- verbose_name: Item do Plano Dentário
- db_table: odontologia_plano_tratamento_item
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| appointment | ForeignKey | no | fk:odontologia.DentalAppointment | 0 |
| clinical_notes | TextField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| lab_required | BooleanField | yes |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| procedure | ForeignKey | yes | fk:odontologia.DentalProcedure | 0 |
| quantity | DecimalField | yes |  | 0 |
| scheduled_date | DateField | no |  | 0 |
| status | CharField | yes |  | 5 |
| surface | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tooth_number | CharField | no |  | 0 |
| treatment_plan | ForeignKey | yes | fk:odontologia.DentalTreatmentPlan | 0 |
| unit_price | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `PLANNED`=Planeado; `AUTHORIZED`=Autorizado; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

### pagamentos

#### pagamentos.Payment

- verbose_name: Pagamento
- db_table: pagamentos_pagamento
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| authorization_number | CharField | no |  | 0 |
| change_amount | MoneyField | yes |  | 0 |
| coverage_plan | ForeignKey | no | fk:seguradora.CoveragePlan | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| insurance_date | JSONField | no |  | 0 |
| insurer | ForeignKey | no | fk:seguradora.Insurer | 0 |
| invoice | ForeignKey | yes | fk:faturamento.Invoice | 0 |
| method | CharField | yes |  | 8 |
| name | CharField | yes |  | 0 |
| paid_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| value | MoneyField | yes |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- method (8): `DIN`=Dinheiro; `CAR`=Cartão; `TRF`=Transferência; `MOB`=Mobile Money; `POS`=POS; `CHQ`=Cheque; `SEG`=Seguro de Saúde; `OUT`=Outro
- status (5): `PEN`=Pendente; `CON`=Confirmado; `FAL`=Falhou; `EST`=Estornado; `CAN`=Cancelado

#### pagamentos.PaymentHistory

- verbose_name: Histórico de Pagamento
- db_table: pagamentos_historicopagamento
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| event_type | CharField | yes |  | 5 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| payment | ForeignKey | yes | fk:pagamentos.Payment | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| value | MoneyField | no |  | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- event_type (5): `CRIADO`=Criado; `CONFIRMADO`=Confirmado; `FALHA`=Falha; `ESTORNADO`=Estornado; `CANCELADO`=Cancelado

#### pagamentos.Receipt

- verbose_name: Recibo
- db_table: pagamentos_recibo
- fields: 6

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | ForeignKey | yes | fk:faturamento.Invoice | 0 |
| number | CharField | yes |  | 0 |
| payment | OneToOneField | yes | fk:pagamentos.Payment | 0 |
| value | MoneyField | yes |  | 0 |

#### pagamentos.Reconciliation

- verbose_name: Reconciliação
- db_table: pagamentos_reconciliacao
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| confirmation_date | DateTimeField | no |  | 0 |
| confirmed | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| transaction | OneToOneField | yes | fk:pagamentos.Transaction | 0 |

#### pagamentos.Transaction

- verbose_name: Transação
- db_table: pagamentos_transacao
- fields: 6

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| external_reference | CharField | yes |  | 0 |
| gateway | CharField | yes |  | 0 |
| gateway_response | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| status | CharField | yes |  | 0 |

### patologia

#### patologia.PathologyArchive

- verbose_name: Arquivamento de Patologia
- db_table: patologia_arquivamento
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| archive_type | CharField | yes |  | 5 |
| archived_at | DateTimeField | yes |  | 0 |
| box_number | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| location | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| report | ForeignKey | no | fk:patologia.PathologyReport | 0 |
| responsible | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| retention_until | DateField | no |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| shelf | CharField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- archive_type (5): `BLOCK`=Bloco; `SLIDE`=Lâmina; `SPECIMEN`=Amostra; `DIGITAL`=Digital; `OTHER`=Outro
- status (4): `ARCHIVED`=Arquivado; `BORROWED`=Emprestado; `DISCARDED`=Descartado; `LOST`=Extraviado

#### patologia.PathologyCytologyCase

- verbose_name: Citologia
- db_table: patologia_citologia
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| adequacy | CharField | yes |  | 3 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| cytologist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| interpretation | TextField | no |  | 0 |
| microscopic_description | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| preparation_method | CharField | no |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| screened_at | DateTimeField | no |  | 0 |
| specimen_source | CharField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- adequacy (3): `ADEQUATE`=Adequada; `LIMITED`=Limitada; `UNSATISFACTORY`=Insatisfatória
- status (5): `RECEIVED`=Recebida; `SCREENING`=Em triagem; `REVIEW`=Em revisão; `REPORTED`=Laudada; `CANCELLED`=Cancelada

#### patologia.PathologyGrossExamination

- verbose_name: Macroscopia
- db_table: patologia_macroscopia
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| cassette_count | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dimensions | CharField | no |  | 0 |
| fragment_count | PositiveSmallIntegerField | yes |  | 0 |
| gross_description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| pathologist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| performed_at | DateTimeField | yes |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| specimen_weight_g | DecimalField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `PENDING`=Pendente; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### patologia.PathologyHistologySlide

- verbose_name: Lâmina Histológica
- db_table: patologia_histologia
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| block_number | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| prepared_at | DateTimeField | yes |  | 0 |
| prepared_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| processing | ForeignKey | no | fk:patologia.PathologyProcessing | 0 |
| quality | CharField | no |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| slide_number | CharField | yes |  | 0 |
| stain | CharField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `PREPARED`=Preparada; `REVIEW`=Em revisão; `APPROVED`=Aprovada; `REPEAT`=Repetir; `ARCHIVED`=Arquivada

#### patologia.PathologyImmunohistochemistry

- verbose_name: Imunohistoquímica
- db_table: patologia_imunohistoquimica
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| clone | CharField | no |  | 0 |
| control_status | CharField | yes |  | 3 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| intensity | CharField | no |  | 0 |
| interpreted_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| marker | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| percentage_positive | DecimalField | yes |  | 0 |
| performed_at | DateTimeField | yes |  | 0 |
| result | CharField | yes |  | 4 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| slide | ForeignKey | no | fk:patologia.PathologyHistologySlide | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- control_status (3): `VALID`=Válido; `INVALID`=Inválido; `NA`=Não aplicável
- result (4): `POSITIVE`=Positivo; `NEGATIVE`=Negativo; `EQUIVOCAL`=Duvidoso; `PENDING`=Pendente

#### patologia.PathologyProcessing

- verbose_name: Processamento Histológico
- db_table: patologia_processamento
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| batch_number | CharField | no |  | 0 |
| cassette_count | PositiveSmallIntegerField | yes |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| processor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| processor_machine | CharField | no |  | 0 |
| protocol | CharField | no |  | 0 |
| reagents | JSONField | no |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| started_at | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `QUEUED`=Em fila; `PROCESSING`=Em processamento; `COMPLETED`=Concluído; `FAILED`=Falhou; `CANCELLED`=Cancelado

#### patologia.PathologyReport

- verbose_name: Laudo de Patologia
- db_table: patologia_laudo
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| conclusion | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| delivered_at | DateTimeField | no |  | 0 |
| diagnosis | TextField | no |  | 0 |
| gross_summary | TextField | no |  | 0 |
| icd_code | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| immunohistochemistry_summary | TextField | no |  | 0 |
| microscopic_description | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| pathologist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| report_number | CharField | no |  | 0 |
| sample | ForeignKey | yes | fk:patologia.PathologySampleReception | 0 |
| signed_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `DRAFT`=Rascunho; `PRELIMINARY`=Preliminar; `FINAL`=Final; `AMENDED`=Retificado; `CANCELLED`=Cancelado

#### patologia.PathologySampleReception

- verbose_name: Recepção de Amostra de Patologia
- db_table: patologia_recepcao_amostra
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accepted_at | DateTimeField | no |  | 0 |
| accession_number | CharField | no |  | 0 |
| anatomical_site | CharField | no |  | 0 |
| clinical_history | TextField | no |  | 0 |
| container_count | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| fixation_type | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| lab_request | ForeignKey | no | fk:clinical.LabRequest | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| priority | CharField | yes |  | 3 |
| received_at | DateTimeField | yes |  | 0 |
| received_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| rejected_at | DateTimeField | no |  | 0 |
| rejection_reason | TextField | no |  | 0 |
| source | CharField | yes |  | 5 |
| specimen_type | CharField | yes |  | 6 |
| status | CharField | yes |  | 9 |
| surgery | ForeignKey | no | fk:cirurgia.Surgery | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `STAT`=Emergência
- source (5): `OUTPATIENT`=Ambulatório; `INPATIENT`=Internamento; `OPERATING_ROOM`=Bloco operatório; `EXTERNAL`=Externo; `OTHER`=Outro
- specimen_type (6): `BIOPSY`=Biópsia; `SURGICAL_SPECIMEN`=Peça cirúrgica; `CYTOLOGY`=Citologia; `FLUID`=Líquido; `SMEAR`=Esfregaço; `OTHER`=Outro
- status (9): `RECEIVED`=Recebida; `ACCEPTED`=Aceite; `REJECTED`=Rejeitada; `IN_GROSSING`=Em macroscopia; `IN_PROCESSING`=Em processamento; `READY_FOR_REPORT`=Pronta para laudo; `REPORTED`=Laudada; `ARCHIVED`=Arquivada; `CANCELLED`=Cancelada

### prontuario

#### prontuario.MedicalRecordEntry

- verbose_name: Cardex
- db_table: prontuario_registroprontuario
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| care_end_at | DateTimeField | no |  | 0 |
| care_start_at | DateTimeField | yes |  | 0 |
| consultations | ManyToManyField | no | many_to_many:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| diagnosis | TextField | no |  | 0 |
| doctor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| medical_report | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| prescription | TextField | no |  | 0 |
| status | CharField | yes |  | 3 |
| symptoms | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `RASCUNHO`=Rascunho; `FINALIZADO`=Finalizado; `CANCELADO`=Cancelado

#### prontuario.PrescriptionItem

- verbose_name: Item de Prescrição
- db_table: prontuario_prescricaoitem
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dosage_unit | CharField | yes |  | 5 |
| dosage_value | DecimalField | yes |  | 0 |
| dose_count | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| interval_hours | PositiveSmallIntegerField | no |  | 0 |
| medication | ForeignKey | yes | fk:farmacia.Product | 0 |
| notes | TextField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| record | ForeignKey | yes | fk:prontuario.MedicalRecordEntry | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- dosage_unit (5): `MG`=mg; `ML`=ml; `G`=g; `L`=L; `KG`=kg

### radiologia

#### radiologia.ImagingEquipment

- verbose_name: Equipamento de Imagem
- db_table: radiologia_equipamento
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ae_title | CharField | no |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| last_quality_control | DateField | no |  | 0 |
| location | CharField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| modality | CharField | yes |  | 8 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| next_quality_control | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| pacs_endpoint | CharField | no |  | 0 |
| serial_number | CharField | no |  | 0 |
| station_name | CharField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- modality (8): `XRAY`=Raio-X; `ULTRASOUND`=Ultrassom; `CT`=Tomografia; `MRI`=Ressonância magnética; `MAMMOGRAPHY`=Mamografia; `FLUOROSCOPY`=Fluoroscopia; `DENSITOMETRY`=Densitometria; `OTHER`=Outra
- status (3): `ACTIVE`=Ativo; `MAINTENANCE`=Em manutenção; `INACTIVE`=Inativo

#### radiologia.ImagingFile

- verbose_name: Ficheiro de Imagem
- db_table: radiologia_ficheiro
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| checksum | CharField | no |  | 0 |
| content_type | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| file | FileField | no |  | 0 |
| file_size | PositiveBigIntegerField | yes |  | 0 |
| file_type | CharField | yes |  | 5 |
| id | BigAutoField | no |  | 0 |
| image_number | PositiveIntegerField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| pacs_object_uri | CharField | no |  | 0 |
| series | ForeignKey | no | fk:radiologia.ImagingSeries | 0 |
| sop_instance_uid | CharField | no |  | 0 |
| study | ForeignKey | yes | fk:radiologia.ImagingStudy | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- file_type (5): `DICOM`=DICOM; `IMAGE`=Imagem; `REPORT_PDF`=PDF de laudo; `VIDEO`=Vídeo; `OTHER`=Outro

#### radiologia.ImagingProtocol

- verbose_name: Protocolo de Imagem
- db_table: radiologia_protocolo
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acquisition_instructions | TextField | no |  | 0 |
| body_region | CharField | yes |  | 12 |
| code | CharField | yes |  | 0 |
| contrast_required | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_report_template | TextField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| modality | CharField | yes |  | 8 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| preparation | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| typical_duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (12): `HEAD`=Cabeça; `NECK`=Pescoço; `CHEST`=Tórax; `ABDOMEN`=Abdómen; `PELVIS`=Pelve; `SPINE`=Coluna; `UPPER_LIMB`=Membro superior; `LOWER_LIMB`=Membro inferior; `BREAST`=Mama; `VASCULAR`=Vascular; `WHOLE_BODY`=Corpo inteiro; `OTHER`=Outra
- modality (8): `XRAY`=Raio-X; `ULTRASOUND`=Ultrassom; `CT`=Tomografia; `MRI`=Ressonância magnética; `MAMMOGRAPHY`=Mamografia; `FLUOROSCOPY`=Fluoroscopia; `DENSITOMETRY`=Densitometria; `OTHER`=Outra

#### radiologia.ImagingReport

- verbose_name: Laudo de Imagem
- db_table: radiologia_laudo
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| critical_notified_at | DateTimeField | no |  | 0 |
| critical_result | BooleanField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| findings | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| impression | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| radiologist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| recommendations | TextField | no |  | 0 |
| report_file | FileField | no |  | 0 |
| reported_at | DateTimeField | yes |  | 0 |
| signed_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| study | ForeignKey | yes | fk:radiologia.ImagingStudy | 0 |
| technique | TextField | no |  | 0 |
| template_used | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| version_number | PositiveSmallIntegerField | yes |  | 0 |

**Choices**
- status (5): `DRAFT`=Rascunho; `PRELIMINARY`=Preliminar; `FINAL`=Final; `AMENDED`=Retificado; `CANCELLED`=Cancelado

#### radiologia.ImagingSeries

- verbose_name: Série de Imagem
- db_table: radiologia_serie
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acquisition_completed_at | DateTimeField | no |  | 0 |
| acquisition_started_at | DateTimeField | no |  | 0 |
| body_region | CharField | yes |  | 12 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| image_count | PositiveIntegerField | yes |  | 0 |
| modality | CharField | yes |  | 8 |
| notes | TextField | no |  | 0 |
| series_instance_uid | CharField | no |  | 0 |
| series_number | PositiveSmallIntegerField | yes |  | 0 |
| storage_uri | CharField | no |  | 0 |
| study | ForeignKey | yes | fk:radiologia.ImagingStudy | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (12): `HEAD`=Cabeça; `NECK`=Pescoço; `CHEST`=Tórax; `ABDOMEN`=Abdómen; `PELVIS`=Pelve; `SPINE`=Coluna; `UPPER_LIMB`=Membro superior; `LOWER_LIMB`=Membro inferior; `BREAST`=Mama; `VASCULAR`=Vascular; `WHOLE_BODY`=Corpo inteiro; `OTHER`=Outra
- modality (8): `XRAY`=Raio-X; `ULTRASOUND`=Ultrassom; `CT`=Tomografia; `MRI`=Ressonância magnética; `MAMMOGRAPHY`=Mamografia; `FLUOROSCOPY`=Fluoroscopia; `DENSITOMETRY`=Densitometria; `OTHER`=Outra

#### radiologia.ImagingStudy

- verbose_name: Estudo de Imagem
- db_table: radiologia_estudo
- fields: 37

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accession_number | CharField | no |  | 0 |
| acquired_at | DateTimeField | no |  | 0 |
| body_region | CharField | yes |  | 12 |
| clinical_indication | TextField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| contrast_details | CharField | no |  | 0 |
| contrast_used | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| equipment | ForeignKey | no | fk:radiologia.ImagingEquipment | 0 |
| id | BigAutoField | no |  | 0 |
| image_count | PositiveIntegerField | yes |  | 0 |
| images_available | BooleanField | yes |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| modality | CharField | yes |  | 8 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| priority | CharField | yes |  | 3 |
| protocol | ForeignKey | no | fk:radiologia.ImagingProtocol | 0 |
| radiologist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| requested_at | DateTimeField | yes |  | 0 |
| requesting_doctor | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| scheduled_at | DateTimeField | no |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 9 |
| storage_uri | CharField | no |  | 0 |
| study_instance_uid | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- body_region (12): `HEAD`=Cabeça; `NECK`=Pescoço; `CHEST`=Tórax; `ABDOMEN`=Abdómen; `PELVIS`=Pelve; `SPINE`=Coluna; `UPPER_LIMB`=Membro superior; `LOWER_LIMB`=Membro inferior; `BREAST`=Mama; `VASCULAR`=Vascular; `WHOLE_BODY`=Corpo inteiro; `OTHER`=Outra
- modality (8): `XRAY`=Raio-X; `ULTRASOUND`=Ultrassom; `CT`=Tomografia; `MRI`=Ressonância magnética; `MAMMOGRAPHY`=Mamografia; `FLUOROSCOPY`=Fluoroscopia; `DENSITOMETRY`=Densitometria; `OTHER`=Outra
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `STAT`=Emergência
- status (9): `REQUESTED`=Solicitado; `SCHEDULED`=Agendado; `IN_PROGRESS`=Em aquisição; `ACQUIRED`=Imagem adquirida; `REPORTING`=Em laudo; `REPORTED`=Laudado; `VALIDATED`=Validado; `DELIVERED`=Entregue; `CANCELLED`=Cancelado

#### radiologia.PacsIntegrationEvent

- verbose_name: Evento PACS
- db_table: radiologia_pacs_evento
- fields: 25

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accession_number | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| direction | CharField | yes |  | 2 |
| equipment | ForeignKey | no | fk:radiologia.ImagingEquipment | 0 |
| error_message | TextField | no |  | 0 |
| event_at | DateTimeField | yes |  | 0 |
| event_type | CharField | yes |  | 8 |
| external_system | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| message_control_id | CharField | no |  | 0 |
| payload | JSONField | no |  | 0 |
| response | JSONField | no |  | 0 |
| retry_count | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| study | ForeignKey | no | fk:radiologia.ImagingStudy | 0 |
| study_instance_uid | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- direction (2): `OUTBOUND`=Saída; `INBOUND`=Entrada
- event_type (8): `WORKLIST_CREATE`=Criar worklist; `WORKLIST_UPDATE`=Atualizar worklist; `STUDY_SYNC`=Sincronizar estudo; `STORE`=Armazenar imagem; `QUERY`=Consultar PACS; `RETRIEVE`=Recuperar imagem; `REPORT_SEND`=Enviar laudo; `ERROR`=Erro
- status (5): `PENDING`=Pendente; `SENT`=Enviado; `ACKNOWLEDGED`=Confirmado; `FAILED`=Falhou; `IGNORED`=Ignorado

### recepcao

#### recepcao.ReceptionCheckin

- verbose_name: Check-in
- db_table: recepcao_checkinrecepcao
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| arrived_at | DateTimeField | yes |  | 0 |
| attendant | ForeignKey | no | fk:identidade.User | 0 |
| called_at | DateTimeField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| invoice | OneToOneField | no | fk:faturamento.Invoice | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| priority | CharField | yes |  | 3 |
| reason | CharField | no |  | 0 |
| request | OneToOneField | no | fk:clinical.LabRequest | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- priority (3): `URG`=Urgente; `PREF`=Preferencial; `NOR`=Normal
- status (6): `AGUARD`=Aguardando; `ATEND`=Em atendimento; `REQ`=Requisição criada; `FAT`=Fatura vinculada; `CONC`=Concluído; `CANC`=Cancelado

### recursos_humanos

#### recursos_humanos.Absence

- verbose_name: Falta
- db_table: recursos_humanos_falta
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| justified | BooleanField | yes |  | 0 |
| reason | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### recursos_humanos.DisciplinaryProcess

- verbose_name: Processo Disciplinar
- db_table: recursos_humanos_processodisciplinar
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| action_taken | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| incident_date | DateField | yes |  | 0 |
| incident_type | CharField | no |  | 0 |
| notes | TextField | no |  | 0 |
| resolved_at | DateField | no |  | 0 |
| severity | CharField | yes |  | 4 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- severity (4): `LEVE`=Leve; `MODERADA`=Moderada; `GRAVE`=Grave; `GRAVISSIMA`=Gravíssima
- status (2): `ABERTO`=Aberto; `ENCERRADO`=Encerrado

#### recursos_humanos.Employee

- verbose_name: Funcionário
- db_table: recursos_humanos_funcionario
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| admission_date | DateField | yes |  | 0 |
| base_month_hours | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| document_number | CharField | no |  | 0 |
| email | EmailField | no |  | 0 |
| extraordinary_hour_value | DecimalField | yes |  | 0 |
| family_allowance_per_dependent | MoneyField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| minimum_career_change_months | PositiveSmallIntegerField | yes |  | 0 |
| minimum_progression_months | PositiveSmallIntegerField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| nib | CharField | no |  | 0 |
| nominal_salary | MoneyField | yes |  | 0 |
| nuit | CharField | no |  | 0 |
| ordinary_hour_value | DecimalField | yes |  | 0 |
| phone | CharField | no |  | 0 |
| profession | ForeignKey | no | fk:recursos_humanos.Profession | 0 |
| role | ForeignKey | no | fk:recursos_humanos.JobTitle | 0 |
| salary_increase | MoneyField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (2): `ATIVO`=Ativo; `INATIVO`=Inativo

#### recursos_humanos.FamilyDependent

- verbose_name: Agregado Familiar
- db_table: recursos_humanos_agregadofamiliar
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| birth_date | DateField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| lives_with_employee | BooleanField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| phone | CharField | no |  | 0 |
| relationship | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- relationship (5): `CONJUGE`=Cônjuge; `FILHO`=Filho(a); `PAI`=Pai/Mãe; `IRMAO`=Irmão(ã); `OUTRO`=Outro

#### recursos_humanos.JobTitle

- verbose_name: Cargo
- db_table: recursos_humanos_cargo
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| is_doctor | BooleanField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### recursos_humanos.Overtime

- verbose_name: Hora Extra
- db_table: recursos_humanos_horaextra
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| hours | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| kind | CharField | yes |  | 2 |
| multiplier | DecimalField | yes |  | 0 |
| notes | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- kind (2): `ORDINARIA`=Ordinária; `EXTRAORDINARIA`=Extraordinária

#### recursos_humanos.Payroll

- verbose_name: Folha de Pagamento
- db_table: recursos_humanos_folhapagamento
- fields: 39

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| absence_days | PositiveSmallIntegerField | yes |  | 0 |
| absence_discount_value | MoneyField | yes |  | 0 |
| base_month_hours | PositiveSmallIntegerField | yes |  | 0 |
| calculated_overtime_hours | DecimalField | yes |  | 0 |
| closed | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| daily_salary_value | DecimalField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| disciplinary_discount_value | MoneyField | yes |  | 0 |
| discounted_absence_days | PositiveSmallIntegerField | yes |  | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| extraordinary_hour_value | DecimalField | yes |  | 0 |
| extraordinary_hours | DecimalField | yes |  | 0 |
| extraordinary_hours_value | MoneyField | yes |  | 0 |
| family_allowance_value | MoneyField | yes |  | 0 |
| family_dependents_count | PositiveSmallIntegerField | yes |  | 0 |
| gross_salary | MoneyField | yes |  | 0 |
| hourly_value | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| month | PositiveSmallIntegerField | yes |  | 0 |
| nominal_salary | MoneyField | yes |  | 0 |
| ordinary_hour_value | DecimalField | yes |  | 0 |
| ordinary_hours | DecimalField | yes |  | 0 |
| ordinary_hours_value | MoneyField | yes |  | 0 |
| other_discounts_value | MoneyField | yes |  | 0 |
| overtime_hour_multiplier | DecimalField | yes |  | 0 |
| overtime_value | MoneyField | yes |  | 0 |
| salary_increase_value | MoneyField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tenure_increase_value | MoneyField | yes |  | 0 |
| total_salary | MoneyField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| year | PositiveSmallIntegerField | yes |  | 0 |

#### recursos_humanos.Profession

- verbose_name: Profissão
- db_table: recursos_humanos_profissao
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| base_salary | MoneyField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| extraordinary_hour_value | DecimalField | yes |  | 0 |
| family_allowance_per_dependent | MoneyField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| minimum_career_change_months | PositiveSmallIntegerField | yes |  | 0 |
| minimum_progression_months | PositiveSmallIntegerField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| ordinary_hour_value | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### recursos_humanos.Termination

- verbose_name: Dispensa
- db_table: recursos_humanos_dispensa
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| date | DateField | yes |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| id | BigAutoField | no |  | 0 |
| reason | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| type | CharField | yes |  | 4 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- type (4): `DEMISSAO`=Demissão; `RESCISAO`=Rescisão; `FIM_CONTRATO`=Fim de contrato; `OUTRO`=Outro

#### recursos_humanos.Vacation

- verbose_name: Férias
- db_table: recursos_humanos_ferias
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| end_date | DateField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `SOLIC`=Solicitada; `APROV`=Aprovada; `GOZADA`=Gozada; `CANCEL`=Cancelada

#### recursos_humanos.WorkSchedule

- verbose_name: Horário de Trabalho
- db_table: recursos_humanos_horariotrabalho
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| employee | ForeignKey | yes | fk:recursos_humanos.Employee | 0 |
| end_time | TimeField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| start_time | TimeField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| weekday | IntegerField | yes |  | 7 |

**Choices**
- weekday (7): `0`=Segunda; `1`=Terça; `2`=Quarta; `3`=Quinta; `4`=Sexta; `5`=Sábado; `6`=Domingo

### saude_publica

#### saude_publica.AdverseEventFollowingImmunization

- verbose_name: Evento Adverso Pós-Vacinação
- db_table: saude_publica_evento_adverso
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| causality_assessment | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| immunization_record | ForeignKey | yes | fk:saude_publica.ImmunizationRecord | 0 |
| investigated_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| investigation_due_at | DateTimeField | no |  | 0 |
| lot | ForeignKey | no | fk:saude_publica.VaccineLot | 0 |
| notes | TextField | no |  | 0 |
| official_notification_id | CharField | no |  | 0 |
| onset_at | DateTimeField | yes |  | 0 |
| outcome | CharField | yes |  | 5 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| reported_at | DateTimeField | yes |  | 0 |
| reported_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| serious | BooleanField | yes |  | 0 |
| severity | CharField | yes |  | 4 |
| status | CharField | yes |  | 5 |
| symptoms | TextField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine | ForeignKey | yes | fk:saude_publica.VaccineProduct | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- outcome (5): `RECOVERED`=Recuperado; `RECOVERING`=Em recuperação; `HOSPITALIZED`=Hospitalizado; `DEATH`=Óbito; `UNKNOWN`=Desconhecido
- severity (4): `MILD`=Leve; `MODERATE`=Moderado; `SEVERE`=Grave; `CRITICAL`=Crítico
- status (5): `REPORTED`=Reportado; `UNDER_INVESTIGATION`=Em investigação; `RESOLVED`=Resolvido; `DISCARDED`=Descartado; `SENT_TO_AUTHORITY`=Enviado à autoridade

#### saude_publica.ImmunizationRecord

- verbose_name: Registo de Imunização
- db_table: saude_publica_registo_imunizacao
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| administered_at | DateTimeField | yes |  | 0 |
| administered_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| body_site | CharField | no |  | 0 |
| campaign | ForeignKey | no | fk:saude_publica.VaccinationCampaign | 0 |
| consent_confirmed | BooleanField | yes |  | 0 |
| contraindication_reason | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dose_number | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| lot | ForeignKey | no | fk:saude_publica.VaccineLot | 0 |
| next_due_date | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| official_notification_id | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| route | CharField | yes |  | 6 |
| source | CharField | yes |  | 4 |
| status | CharField | yes |  | 5 |
| target_group | ForeignKey | no | fk:saude_publica.VaccinationCampaignTarget | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine | ForeignKey | yes | fk:saude_publica.VaccineProduct | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- route (6): `IM`=Intramuscular; `SC`=Subcutânea; `ID`=Intradérmica; `ORAL`=Oral; `IN`=Intranasal; `OTHER`=Outra
- source (4): `ROUTINE`=Rotina; `CAMPAIGN`=Campanha; `CATCH_UP`=Recuperação; `OFFICIAL_IMPORT`=Importação oficial
- status (5): `SCHEDULED`=Agendada; `ADMINISTERED`=Aplicada; `REPORTED`=Notificada; `EXEMPT`=Isenta; `CANCELLED`=Cancelada

#### saude_publica.PublicHealthNotification

- verbose_name: Notificação Oficial
- db_table: saude_publica_notificacao_oficial
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| adverse_event | ForeignKey | no | fk:saude_publica.AdverseEventFollowingImmunization | 0 |
| attempt_count | PositiveSmallIntegerField | yes |  | 0 |
| campaign | ForeignKey | no | fk:saude_publica.VaccinationCampaign | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| error_message | TextField | no |  | 0 |
| event_type | CharField | yes |  | 3 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| immunization_record | ForeignKey | no | fk:saude_publica.ImmunizationRecord | 0 |
| last_attempt_at | DateTimeField | no |  | 0 |
| next_retry_at | DateTimeField | no |  | 0 |
| notes | TextField | no |  | 0 |
| official_system | CharField | yes |  | 4 |
| payload | JSONField | no |  | 0 |
| response_payload | JSONField | no |  | 0 |
| sent_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- event_type (3): `IMMUNIZATION`=Imunização; `AEFI`=Evento adverso; `CAMPAIGN_COVERAGE`=Cobertura de campanha
- official_system (4): `E_SUS`=e-SUS; `SIPNI`=SIPNI; `DHIS2`=DHIS2; `CUSTOM`=Outro
- status (6): `PENDING`=Pendente; `SENDING`=Enviando; `SENT`=Enviado; `ACCEPTED`=Aceito; `REJECTED`=Rejeitado; `FAILED`=Falhou

#### saude_publica.VaccinationCampaign

- verbose_name: Campanha de Vacinação
- db_table: saude_publica_campanha_vacinacao
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| campaign_type | CharField | yes |  | 6 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| end_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| manager | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| notification_endpoint | URLField | no |  | 0 |
| official_program_code | CharField | no |  | 0 |
| official_system | CharField | no |  | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| target_age_max_months | PositiveSmallIntegerField | no |  | 0 |
| target_age_min_months | PositiveSmallIntegerField | no |  | 0 |
| target_doses | PositiveIntegerField | yes |  | 0 |
| target_population | PositiveIntegerField | yes |  | 0 |
| target_region | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine | ForeignKey | yes | fk:saude_publica.VaccineProduct | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- campaign_type (6): `ROUTINE`=Rotina; `MASS`=Campanha massiva; `OUTBREAK`=Surto; `SCHOOL`=Escolar; `OCCUPATIONAL`=Ocupacional; `OTHER`=Outra
- status (5): `PLANNED`=Planeada; `ACTIVE`=Ativa; `PAUSED`=Pausada; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### saude_publica.VaccinationCampaignTarget

- verbose_name: Meta de Campanha
- db_table: saude_publica_meta_campanha
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| administered_doses | PositiveIntegerField | yes |  | 0 |
| age_max_months | PositiveSmallIntegerField | no |  | 0 |
| age_min_months | PositiveSmallIntegerField | no |  | 0 |
| campaign | ForeignKey | yes | fk:saude_publica.VaccinationCampaign | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| district | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| region | CharField | yes |  | 0 |
| target_doses | PositiveIntegerField | yes |  | 0 |
| target_population | PositiveIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### saude_publica.VaccineLot

- verbose_name: Lote de Vacina
- db_table: saude_publica_lote_vacina
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| cold_chain_status | CharField | yes |  | 4 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| doses_available | PositiveIntegerField | yes |  | 0 |
| doses_received | PositiveIntegerField | yes |  | 0 |
| expiration_date | DateField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| lot_number | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| official_batch_code | CharField | no |  | 0 |
| received_at | DateField | yes |  | 0 |
| reserved_doses | PositiveIntegerField | yes |  | 0 |
| status | CharField | yes |  | 6 |
| storage_location | CharField | no |  | 0 |
| storage_temperature_c | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine | ForeignKey | yes | fk:saude_publica.VaccineProduct | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- cold_chain_status (4): `OK`=Conforme; `WARNING`=Atenção; `BREACH`=Quebra de cadeia fria; `UNKNOWN`=Desconhecido
- status (6): `RECEIVED`=Recebido; `ACTIVE`=Ativo; `QUARANTINED`=Quarentena; `DEPLETED`=Esgotado; `EXPIRED`=Expirado; `RECALLED`=Recolhido

#### saude_publica.VaccineProduct

- verbose_name: Vacina
- db_table: saude_publica_vacina
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| booster_interval_days | PositiveSmallIntegerField | yes |  | 0 |
| code | CharField | no |  | 0 |
| cold_chain_max_c | DecimalField | yes |  | 0 |
| cold_chain_min_c | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| disease | CharField | yes |  | 0 |
| dose_count_required | PositiveSmallIntegerField | yes |  | 0 |
| dose_volume_ml | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| maximum_age_months | PositiveSmallIntegerField | no |  | 0 |
| minimum_age_months | PositiveSmallIntegerField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| official_code | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine_type | CharField | yes |  | 7 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- vaccine_type (7): `LIVE_ATTENUATED`=Viva atenuada; `INACTIVATED`=Inativada; `TOXOID`=Toxóide; `SUBUNIT`=Subunidade; `MRNA`=mRNA; `VIRAL_VECTOR`=Vetor viral; `OTHER`=Outra

### seguradora

#### seguradora.CoveragePlan

- verbose_name: Plano de Cobertura
- db_table: seguradora_planocobertura
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| coverage_percentage | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| insurer | ForeignKey | yes | fk:seguradora.Insurer | 0 |
| name | CharField | yes |  | 0 |
| order | PositiveIntegerField | yes |  | 0 |
| requires_authorization | BooleanField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### seguradora.Insurer

- verbose_name: Seguradora
- db_table: seguradora_seguradora
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| email | EmailField | no |  | 0 |
| external_code | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| order | PositiveIntegerField | yes |  | 0 |
| phone | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### seguradora.ProcedureAuthorization

- verbose_name: Autorização de Procedimento
- db_table: seguradora_autorizacaoprocedimento
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| authorization_code | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | no |  | 0 |
| order | PositiveIntegerField | yes |  | 0 |
| plan | ForeignKey | yes | fk:seguradora.CoveragePlan | 0 |
| request_id | CharField | yes |  | 0 |
| response_date | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `PENDENTE`=Pendente; `APROVADA`=Aprovada; `NEGADA`=Negada

#### seguradora.TenantCoveragePlan

- verbose_name: Plano por Cliente
- db_table: seguradora_tenantplanocobertura
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | no |  | 0 |
| global_plan | ForeignKey | yes | fk:seguradora.CoveragePlan | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| order | PositiveIntegerField | yes |  | 0 |
| override_percentage | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

### telemedicina

#### telemedicina.ChronicMonitoringProgram

- verbose_name: Programa de Monitoramento Crónico
- db_table: telemedicina_programa_cronico
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| care_manager | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| care_plan | TextField | no |  | 0 |
| condition | CharField | yes |  | 6 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| end_date | DateField | no |  | 0 |
| escalation_protocol | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| next_review_date | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| review_frequency_days | PositiveSmallIntegerField | yes |  | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| target_diastolic_max | PositiveSmallIntegerField | no |  | 0 |
| target_glucose_max | DecimalField | no |  | 0 |
| target_glucose_min | DecimalField | no |  | 0 |
| target_spo2_min | DecimalField | no |  | 0 |
| target_systolic_max | PositiveSmallIntegerField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- condition (6): `COPD`=DPCO; `HYPERTENSION`=Hipertensão; `DIABETES`=Diabetes; `HEART_FAILURE`=Insuficiência cardíaca; `PREGNANCY_RISK`=Gravidez de risco; `OTHER`=Outra
- status (5): `ENROLLED`=Inscrito; `ACTIVE`=Ativo; `PAUSED`=Pausado; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

#### telemedicina.RemoteClinicalAlert

- verbose_name: Alerta Clínico Remoto
- db_table: telemedicina_alerta_clinico
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acknowledged_at | DateTimeField | no |  | 0 |
| acknowledged_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| action_taken | TextField | no |  | 0 |
| alert_type | CharField | yes |  | 5 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device | ForeignKey | no | fk:telemedicina.RemoteMonitoringDevice | 0 |
| id | BigAutoField | no |  | 0 |
| message | TextField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| program | ForeignKey | no | fk:telemedicina.ChronicMonitoringProgram | 0 |
| reading | ForeignKey | no | fk:telemedicina.RemoteVitalReading | 0 |
| recommended_action | TextField | no |  | 0 |
| resolved_at | DateTimeField | no |  | 0 |
| resolved_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| severity | CharField | yes |  | 5 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| triggered_at | DateTimeField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- alert_type (5): `VITAL_THRESHOLD`=Limiar de sinais vitais; `MISSED_READING`=Leitura em falta; `DEVICE_OFFLINE`=Dispositivo offline; `TRIAGE_RISK`=Risco de triagem; `OTHER`=Outro
- severity (5): `INFO`=Informativo; `LOW`=Baixo; `MEDIUM`=Médio; `HIGH`=Alto; `CRITICAL`=Crítico
- status (5): `OPEN`=Aberto; `ACKNOWLEDGED`=Reconhecido; `ESCALATED`=Escalonado; `RESOLVED`=Resolvido; `DISMISSED`=Descartado

#### telemedicina.RemoteMonitoringDevice

- verbose_name: Dispositivo Remoto
- db_table: telemedicina_dispositivo
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| battery_percent | DecimalField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device_type | CharField | yes |  | 7 |
| external_device_id | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| last_sync_at | DateTimeField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| model_name | CharField | no |  | 0 |
| notes | TextField | no |  | 0 |
| paired_at | DateTimeField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| serial_number | CharField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- device_type (7): `BLOOD_PRESSURE`=Medidor de pressão; `GLUCOMETER`=Glicómetro; `PULSE_OXIMETER`=Oxímetro; `WEARABLE`=Wearable; `SPIROMETER`=Espirómetro; `SCALE`=Balança; `OTHER`=Outro
- status (5): `REGISTERED`=Registado; `ACTIVE`=Ativo; `PAUSED`=Pausado; `LOST`=Perdido; `RETIRED`=Retirado

#### telemedicina.RemoteVitalReading

- verbose_name: Leitura Remota
- db_table: telemedicina_leitura_vital
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device | ForeignKey | no | fk:telemedicina.RemoteMonitoringDevice | 0 |
| diastolic_bp | PositiveSmallIntegerField | no |  | 0 |
| glucose_mg_dl | DecimalField | no |  | 0 |
| heart_rate_bpm | PositiveSmallIntegerField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| measured_at | DateTimeField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| peak_flow_l_min | PositiveSmallIntegerField | no |  | 0 |
| raw_payload | JSONField | no |  | 0 |
| received_at | DateTimeField | yes |  | 0 |
| respiratory_rate | PositiveSmallIntegerField | no |  | 0 |
| source | CharField | yes |  | 3 |
| spo2_percent | DecimalField | no |  | 0 |
| systolic_bp | PositiveSmallIntegerField | no |  | 0 |
| temperature_c | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| weight_kg | DecimalField | no |  | 0 |

**Choices**
- source (3): `DEVICE`=Dispositivo; `MANUAL`=Manual; `INTEGRATION`=Integração

#### telemedicina.StoreAndForwardCase

- verbose_name: Consulta Assíncrona
- db_table: telemedicina_store_forward
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| clinical_question | TextField | yes |  | 0 |
| clinical_summary | TextField | no |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| findings | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| media_manifest | JSONField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| recommendation | TextField | no |  | 0 |
| requested_by | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| reviewed_at | DateTimeField | no |  | 0 |
| reviewer | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| specialty_area | CharField | yes |  | 5 |
| status | CharField | yes |  | 6 |
| submitted_at | DateTimeField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| title | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- specialty_area (5): `DERMATOLOGY`=Dermatologia; `RADIOLOGY`=Radiologia; `OPHTHALMOLOGY`=Oftalmologia; `WOUND_CARE`=Feridas; `OTHER`=Outra
- status (6): `SUBMITTED`=Submetido; `TRIAGED`=Triado; `IN_REVIEW`=Em revisão; `NEEDS_INFO`=Requer informação; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

#### telemedicina.TelemedicineWaitingRoomEntry

- verbose_name: Sala de Espera Virtual
- db_table: telemedicina_sala_espera
- fields: 31

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| access_token | CharField | no |  | 0 |
| call_started_at | DateTimeField | no |  | 0 |
| check_in_at | DateTimeField | yes |  | 0 |
| chief_complaint | CharField | no |  | 0 |
| clinician | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| completed_at | DateTimeField | no |  | 0 |
| consent_confirmed | BooleanField | yes |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| device_check_passed | BooleanField | yes |  | 0 |
| estimated_start_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| preliminary_symptoms | TextField | no |  | 0 |
| priority | CharField | yes |  | 4 |
| queue_position | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 7 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| triage_completed_at | DateTimeField | no |  | 0 |
| triage_notes | TextField | no |  | 0 |
| triage_started_at | DateTimeField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| video_room_url | URLField | no |  | 0 |

**Choices**
- priority (4): `ROUTINE`=Rotina; `PRIORITY`=Prioritário; `URGENT`=Urgente; `EMERGENCY`=Emergência
- status (7): `CHECKED_IN`=Na sala de espera; `TRIAGE`=Em triagem; `READY`=Pronto para atendimento; `IN_CALL`=Em chamada; `COMPLETED`=Concluída; `NO_SHOW`=Ausente; `CANCELLED`=Cancelada

### terapias

#### terapias.TherapeuticResource

- verbose_name: Recurso Terapêutico
- db_table: terapia_recurso
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| id | BigAutoField | no |  | 0 |
| location | CharField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| next_review | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| resource_type | CharField | yes |  | 6 |
| serial_number | CharField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- resource_type (6): `DEVICE`=Aparelho; `ASSISTIVE_TECHNOLOGY`=Tecnologia assistiva; `ORTHOSIS`=Órtese; `EXERCISE_MATERIAL`=Material terapêutico; `COMMUNICATION_AID`=Apoio de comunicação; `OTHER`=Outro
- status (3): `ACTIVE`=Ativo; `MAINTENANCE`=Em manutenção; `INACTIVE`=Inativo

#### terapias.TherapyEvaluation

- verbose_name: Avaliação Terapêutica
- db_table: terapia_avaliacao
- fields: 34

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| activities_daily_living_score | PositiveSmallIntegerField | yes |  | 0 |
| clinical_diagnosis | TextField | no |  | 0 |
| cognition_score | PositiveSmallIntegerField | yes |  | 0 |
| communication_score | PositiveSmallIntegerField | yes |  | 0 |
| consultation | ForeignKey | no | fk:consultas.MedicalConsultation | 0 |
| coordination_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| evaluated_at | DateTimeField | yes |  | 0 |
| functional_diagnosis | TextField | no |  | 0 |
| goals | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| limitations | TextField | no |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| motor_score | PositiveSmallIntegerField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| outcome_measure | CharField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| precautions | TextField | no |  | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| recommendations | TextField | no |  | 0 |
| referral_reason | TextField | no |  | 0 |
| sensory_score | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- status (4): `DRAFT`=Rascunho; `ACTIVE`=Ativa; `FINALIZED`=Finalizada; `CANCELLED`=Cancelada

#### terapias.TherapyPlanGoal

- verbose_name: Objetivo Terapêutico
- db_table: terapia_plano_objetivo
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| baseline_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| current_score | PositiveSmallIntegerField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| description | TextField | yes |  | 0 |
| discipline | CharField | yes |  | 6 |
| domain | CharField | yes |  | 10 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| plan | ForeignKey | yes | fk:terapias.TherapyTreatmentPlan | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| target | TextField | no |  | 0 |
| target_score | PositiveSmallIntegerField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- domain (10): `MOTOR`=Motora; `COORDINATION`=Coordenação; `SENSORY`=Sensorial; `COGNITION`=Cognição; `COMMUNICATION`=Comunicação; `SWALLOWING`=Deglutição; `ACTIVITIES_DAILY_LIVING`=Atividades da vida diária; `WORK_ADAPTATION`=Adaptação laboral; `GLOBAL_FUNCTION`=Função global; `OTHER`=Outra
- status (4): `OPEN`=Aberto; `IN_PROGRESS`=Em progresso; `ACHIEVED`=Atingido; `CANCELLED`=Cancelado

#### terapias.TherapyPrescriptionLink

- verbose_name: Ligação de Prescrição Terapêutica
- db_table: terapia_prescricao_ligacao
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| plan | ForeignKey | no | fk:terapias.TherapyTreatmentPlan | 0 |
| prescription_item | ForeignKey | yes | fk:prontuario.PrescriptionItem | 0 |
| priority | CharField | yes |  | 3 |
| requested_at | DateTimeField | yes |  | 0 |
| requested_service | CharField | no |  | 0 |
| requested_sessions | PositiveSmallIntegerField | yes |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `HIGH`=Alta
- status (4): `PENDING`=Pendente; `LINKED`=Ligada ao plano; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### terapias.TherapyProgressNote

- verbose_name: Evolução Terapêutica
- db_table: terapia_evolucao
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| communication_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| domain | CharField | yes |  | 10 |
| functional_score | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| motor_score | PositiveSmallIntegerField | yes |  | 0 |
| plan | ForeignKey | yes | fk:terapias.TherapyTreatmentPlan | 0 |
| progress_percent | DecimalField | yes |  | 0 |
| recommendations | TextField | no |  | 0 |
| recorded_at | DateTimeField | yes |  | 0 |
| session | ForeignKey | no | fk:terapias.TherapySession | 0 |
| summary | TextField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| trend | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- domain (10): `MOTOR`=Motora; `COORDINATION`=Coordenação; `SENSORY`=Sensorial; `COGNITION`=Cognição; `COMMUNICATION`=Comunicação; `SWALLOWING`=Deglutição; `ACTIVITIES_DAILY_LIVING`=Atividades da vida diária; `WORK_ADAPTATION`=Adaptação laboral; `GLOBAL_FUNCTION`=Função global; `OTHER`=Outra
- trend (3): `IMPROVED`=Melhorou; `STABLE`=Estável; `WORSENED`=Piorou

#### terapias.TherapySession

- verbose_name: Sessão Terapêutica
- db_table: terapia_sessao
- fields: 28

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| communication_score | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| duration_minutes | PositiveSmallIntegerField | yes |  | 0 |
| ended_at | DateTimeField | no |  | 0 |
| functional_score | PositiveSmallIntegerField | yes |  | 0 |
| home_guidance | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| interventions_performed | TextField | no |  | 0 |
| motor_score | PositiveSmallIntegerField | yes |  | 0 |
| next_steps | TextField | no |  | 0 |
| notes | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| patient_response | TextField | no |  | 0 |
| plan | ForeignKey | yes | fk:terapias.TherapyTreatmentPlan | 0 |
| scheduled_at | DateTimeField | yes |  | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- status (5): `SCHEDULED`=Agendada; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluída; `MISSED`=Faltou; `CANCELLED`=Cancelada

#### terapias.TherapyTreatmentPlan

- verbose_name: Plano Terapêutico Individualizado
- db_table: terapia_plano_tratamento
- fields: 32

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assistive_technology | TextField | no |  | 0 |
| completed_sessions | PositiveSmallIntegerField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| discipline | CharField | yes |  | 6 |
| end_date | DateField | no |  | 0 |
| evaluation | ForeignKey | no | fk:terapias.TherapyEvaluation | 0 |
| frequency_per_week | PositiveSmallIntegerField | yes |  | 0 |
| home_program | TextField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| intervention_strategy | TextField | no |  | 0 |
| medical_record | ForeignKey | no | fk:prontuario.MedicalRecordEntry | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| objectives | TextField | no |  | 0 |
| patient | ForeignKey | yes | fk:clinical.Patient | 0 |
| planned_sessions | PositiveSmallIntegerField | yes |  | 0 |
| precautions | TextField | no |  | 0 |
| prescription_item | ForeignKey | no | fk:prontuario.PrescriptionItem | 0 |
| prescription_notes | TextField | no |  | 0 |
| progress_percent | DecimalField | yes |  | 0 |
| start_date | DateField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| therapist | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- discipline (6): `OCCUPATIONAL_THERAPY`=Terapia ocupacional; `SPECIALIZED_PHYSIOTHERAPY`=Fisioterapia especializada; `SPEECH_THERAPY`=Fonoaudiologia; `NEUROREHABILITATION`=Neurorreabilitação; `RESPIRATORY_THERAPY`=Terapia respiratória; `OTHER`=Outra
- status (5): `DRAFT`=Rascunho; `ACTIVE`=Ativo; `PAUSED`=Pausado; `COMPLETED`=Concluído; `CANCELLED`=Cancelado

### transportation

#### transportation.Driver

- verbose_name: Motorista
- db_table: transportation_driver
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| availability | CharField | yes |  | 4 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| document_number | CharField | no |  | 0 |
| email | EmailField | no |  | 0 |
| employee | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| hire_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| license_category | CharField | no |  | 0 |
| license_expiry | DateField | no |  | 0 |
| license_number | CharField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| phone | CharField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- availability (4): `AVAILABLE`=Disponível; `ASSIGNED`=Alocado; `RESTING`=Em descanso; `UNAVAILABLE`=Indisponível
- status (4): `ACTIVE`=Ativo; `INACTIVE`=Inativo; `ON_LEAVE`=De licença; `SUSPENDED`=Suspenso

#### transportation.FuelLog

- verbose_name: Abastecimento
- db_table: transportation_fuel_log
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| driver | ForeignKey | no | fk:transportation.Driver | 0 |
| fuel_type | CharField | yes |  | 6 |
| fueled_at | DateTimeField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| liters | DecimalField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| odometer_km | DecimalField | yes |  | 0 |
| receipt_number | CharField | no |  | 0 |
| station | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| total_cost | DecimalField | yes |  | 0 |
| trip | ForeignKey | no | fk:transportation.Trip | 0 |
| unit_price | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle | ForeignKey | yes | fk:transportation.Vehicle | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- fuel_type (6): `DIESEL`=Diesel; `GASOLINE`=Gasolina; `ELECTRIC`=Elétrico; `HYBRID`=Híbrido; `GAS`=Gás; `OTHER`=Outro

#### transportation.MaintenanceOrder

- verbose_name: Ordem de Manutenção
- db_table: transportation_maintenance_order
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| checklist_result | TextField | no |  | 0 |
| completed_at | DateTimeField | no |  | 0 |
| cost | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| due_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| maintenance_type | CharField | yes |  | 4 |
| notes | TextField | no |  | 0 |
| odometer_km | DecimalField | yes |  | 0 |
| opened_at | DateTimeField | yes |  | 0 |
| plan | ForeignKey | no | fk:transportation.MaintenancePlan | 0 |
| provider | CharField | no |  | 0 |
| status | CharField | yes |  | 5 |
| summary | CharField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle | ForeignKey | yes | fk:transportation.Vehicle | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- maintenance_type (4): `PREVENTIVE`=Preventiva; `CORRECTIVE`=Corretiva; `INSPECTION`=Inspeção; `OTHER`=Outra
- status (5): `SCHEDULED`=Agendada; `IN_PROGRESS`=Em execução; `COMPLETED`=Concluída; `CANCELLED`=Cancelada; `OVERDUE`=Atrasada

#### transportation.MaintenancePlan

- verbose_name: Plano de Manutenção
- db_table: transportation_maintenance_plan
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| checklist | TextField | no |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| interval_days | PositiveIntegerField | yes |  | 0 |
| interval_km | DecimalField | yes |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| trigger_type | CharField | yes |  | 3 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle_type | CharField | no |  | 8 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- trigger_type (3): `TIME`=Tempo; `ODOMETER`=Odómetro; `BOTH`=Tempo e odómetro
- vehicle_type (8): `TRUCK`=Camião; `VAN`=Carrinha; `CAR`=Carro; `MOTORCYCLE`=Motociclo; `BUS`=Autocarro; `AMBULANCE`=Ambulância; `REFRIGERATED`=Refrigerado; `OTHER`=Outro

#### transportation.RouteStop

- verbose_name: Paragem de Rota
- db_table: transportation_route_stop
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| actual_arrival | DateTimeField | no |  | 0 |
| address | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| instructions | TextField | no |  | 0 |
| latitude | DecimalField | no |  | 0 |
| load_quantity | DecimalField | yes |  | 0 |
| location_name | CharField | yes |  | 0 |
| longitude | DecimalField | no |  | 0 |
| planned_arrival | DateTimeField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| route | ForeignKey | yes | fk:transportation.TransportationRoute | 0 |
| service_window_end | DateTimeField | no |  | 0 |
| service_window_start | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 5 |
| stop_type | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unload_quantity | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `PENDING`=Pendente; `ARRIVED`=Chegada registada; `COMPLETED`=Concluído; `SKIPPED`=Ignorado; `CANCELLED`=Cancelado
- stop_type (6): `PICKUP`=Recolha; `DELIVERY`=Entrega; `CHECKPOINT`=Ponto de controlo; `SERVICE`=Serviço; `REST`=Descanso; `OTHER`=Outro

#### transportation.TransportationRoute

- verbose_name: Rota
- db_table: transportation_route
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| actual_distance_km | DecimalField | yes |  | 0 |
| code | CharField | yes |  | 0 |
| constraints | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination | CharField | no |  | 0 |
| estimated_duration_minutes | PositiveIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| optimization_status | CharField | yes |  | 4 |
| optimization_strategy | CharField | yes |  | 2 |
| optimized_at | DateTimeField | no |  | 0 |
| origin | CharField | no |  | 0 |
| planned_distance_km | DecimalField | yes |  | 0 |
| planned_end | DateTimeField | no |  | 0 |
| planned_start | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- optimization_status (4): `NOT_OPTIMIZED`=Não otimizada; `OPTIMIZED`=Otimizada; `PARTIAL`=Parcial; `FAILED`=Falhou
- optimization_strategy (2): `MANUAL`=Manual; `NEAREST_NEIGHBOR`=Vizinho mais próximo
- status (6): `DRAFT`=Rascunho; `PLANNED`=Planeada; `OPTIMIZED`=Otimizada; `IN_PROGRESS`=Em curso; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### transportation.Trip

- verbose_name: Viagem
- db_table: transportation_trip
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| actual_end | DateTimeField | no |  | 0 |
| actual_start | DateTimeField | no |  | 0 |
| cargo_description | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| driver | ForeignKey | yes | fk:transportation.Driver | 0 |
| end_location | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| odometer_end_km | DecimalField | no |  | 0 |
| odometer_start_km | DecimalField | yes |  | 0 |
| passenger_count | PositiveSmallIntegerField | yes |  | 0 |
| purpose | CharField | yes |  | 6 |
| route | ForeignKey | no | fk:transportation.TransportationRoute | 0 |
| scheduled_end | DateTimeField | no |  | 0 |
| scheduled_start | DateTimeField | yes |  | 0 |
| start_location | CharField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle | ForeignKey | yes | fk:transportation.Vehicle | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- purpose (6): `DELIVERY`=Entrega; `PICKUP`=Recolha; `PASSENGER`=Transporte de passageiros; `TRANSFER`=Transferência; `MAINTENANCE`=Manutenção; `OTHER`=Outro
- status (5): `SCHEDULED`=Agendada; `DISPATCHED`=Despachada; `IN_PROGRESS`=Em curso; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### transportation.Vehicle

- verbose_name: Veículo
- db_table: transportation_vehicle
- fields: 29

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| brand | CharField | no |  | 0 |
| capacity_unit | CharField | yes |  | 5 |
| capacity_value | DecimalField | yes |  | 0 |
| color | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| current_odometer_km | DecimalField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| fleet_number | CharField | no |  | 0 |
| fuel_type | CharField | yes |  | 6 |
| id | BigAutoField | no |  | 0 |
| last_latitude | DecimalField | no |  | 0 |
| last_location_at | DateTimeField | no |  | 0 |
| last_longitude | DecimalField | no |  | 0 |
| license_plate | CharField | yes |  | 0 |
| model | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle_type | CharField | yes |  | 8 |
| version | PositiveIntegerField | yes |  | 0 |
| vin | CharField | no |  | 0 |
| year | PositiveSmallIntegerField | no |  | 0 |

**Choices**
- capacity_unit (5): `KG`=Kg; `TON`=Tonelada; `PASSENGER`=Passageiros; `M3`=m³; `LITER`=Litros
- fuel_type (6): `DIESEL`=Diesel; `GASOLINE`=Gasolina; `ELECTRIC`=Elétrico; `HYBRID`=Híbrido; `GAS`=Gás; `OTHER`=Outro
- status (5): `ACTIVE`=Ativo; `RESERVED`=Reservado; `IN_TRIP`=Em viagem; `MAINTENANCE`=Em manutenção; `INACTIVE`=Inativo
- vehicle_type (8): `TRUCK`=Camião; `VAN`=Carrinha; `CAR`=Carro; `MOTORCYCLE`=Motociclo; `BUS`=Autocarro; `AMBULANCE`=Ambulância; `REFRIGERATED`=Refrigerado; `OTHER`=Outro

#### transportation.VehicleTrackingPoint

- verbose_name: Ponto de Rastreamento
- db_table: transportation_tracking_point
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| accuracy_m | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| heading_degrees | PositiveSmallIntegerField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| latitude | DecimalField | yes |  | 0 |
| longitude | DecimalField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| odometer_km | DecimalField | no |  | 0 |
| recorded_at | DateTimeField | yes |  | 0 |
| source | CharField | yes |  | 4 |
| speed_kmh | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| trip | ForeignKey | no | fk:transportation.Trip | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vehicle | ForeignKey | yes | fk:transportation.Vehicle | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- source (4): `GPS`=GPS; `MOBILE`=Aplicação móvel; `MANUAL`=Manual; `TELEMATICS`=Telemetria

### veterinaria

#### veterinaria.VeterinaryAdmission

- verbose_name: Internamento Veterinário
- db_table: veterinaria_internamento
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| admitted_at | DateTimeField | yes |  | 0 |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| appointment | ForeignKey | no | fk:veterinaria.VeterinaryAppointment | 0 |
| cage | CharField | no |  | 0 |
| care_plan | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| diagnosis | TextField | no |  | 0 |
| discharge_summary | TextField | no |  | 0 |
| discharged_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| reason | TextField | no |  | 0 |
| status | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| ward | CharField | no |  | 0 |

**Choices**
- status (6): `ADMITTED`=Internado; `OBSERVATION`=Observação; `DISCHARGED`=Alta; `TRANSFERRED`=Transferido; `DECEASED`=Óbito; `CANCELLED`=Cancelado

#### veterinaria.VeterinaryAnimal

- verbose_name: Animal / Paciente Veterinário
- db_table: veterinaria_animal
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| allergies | TextField | no |  | 0 |
| birth_date | DateField | no |  | 0 |
| breed | CharField | no |  | 0 |
| color | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| microchip_number | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| owner_email | EmailField | no |  | 0 |
| owner_name | CharField | yes |  | 0 |
| owner_phone | CharField | no |  | 0 |
| sex | CharField | yes |  | 3 |
| species | CharField | yes |  | 10 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- sex (3): `MALE`=Macho; `FEMALE`=Fêmea; `UNKNOWN`=Não informado
- species (10): `ALL`=Todas; `DOG`=Canina; `CAT`=Felina; `BIRD`=Ave; `RABBIT`=Coelho; `RUMINANT`=Ruminante; `EQUINE`=Equina; `SWINE`=Suína; `REPTILE`=Réptil; `OTHER`=Outra
- status (4): `ACTIVE`=Ativo; `INACTIVE`=Inativo; `DECEASED`=Óbito; `TRANSFERRED`=Transferido

#### veterinaria.VeterinaryAppointment

- verbose_name: Consulta Veterinária
- db_table: veterinaria_agenda
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| reason | CharField | no |  | 0 |
| room | CharField | no |  | 0 |
| scheduled_end | DateTimeField | no |  | 0 |
| scheduled_start | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 7 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| triage_notes | TextField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |

**Choices**
- status (7): `SCHEDULED`=Agendada; `CONFIRMED`=Confirmada; `CHECKED_IN`=Presente; `IN_PROGRESS`=Em atendimento; `COMPLETED`=Concluída; `CANCELLED`=Cancelada; `NO_SHOW`=Faltou

#### veterinaria.VeterinaryLabExam

- verbose_name: Exame Laboratorial Veterinário
- db_table: veterinaria_exame_laboratorial
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| sample_type | CharField | yes |  | 7 |
| species | CharField | yes |  | 10 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| turnaround_hours | PositiveSmallIntegerField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- sample_type (7): `BLOOD`=Sangue; `URINE`=Urina; `FECES`=Fezes; `SWAB`=Swab; `TISSUE`=Tecido; `IMAGING`=Imagem; `OTHER`=Outro
- species (10): `ALL`=Todas; `DOG`=Canina; `CAT`=Felina; `BIRD`=Ave; `RABBIT`=Coelho; `RUMINANT`=Ruminante; `EQUINE`=Equina; `SWINE`=Suína; `REPTILE`=Réptil; `OTHER`=Outra

#### veterinaria.VeterinaryLabRequest

- verbose_name: Requisição Laboratorial Veterinária
- db_table: veterinaria_requisicao_laboratorial
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| appointment | ForeignKey | no | fk:veterinaria.VeterinaryAppointment | 0 |
| clinical_notes | TextField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| priority | CharField | yes |  | 3 |
| record | ForeignKey | no | fk:veterinaria.VeterinaryMedicalRecord | 0 |
| requested_at | DateTimeField | yes |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |

**Choices**
- priority (3): `ROUTINE`=Rotina; `URGENT`=Urgente; `EMERGENCY`=Emergência
- status (5): `REQUESTED`=Solicitada; `COLLECTED`=Amostra colhida; `PROCESSING`=Em processamento; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### veterinaria.VeterinaryLabRequestItem

- verbose_name: Item de Requisição Laboratorial Veterinária
- db_table: veterinaria_requisicao_laboratorial_item
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| collected_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| exam | ForeignKey | yes | fk:veterinaria.VeterinaryLabExam | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| reference_range | CharField | no |  | 0 |
| request | ForeignKey | yes | fk:veterinaria.VeterinaryLabRequest | 0 |
| result_summary | TextField | no |  | 0 |
| result_value | CharField | no |  | 0 |
| resulted_at | DateTimeField | no |  | 0 |
| sample_identifier | CharField | no |  | 0 |
| status | CharField | yes |  | 5 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (5): `REQUESTED`=Solicitado; `COLLECTED`=Colhido; `PROCESSING`=Em processamento; `RESULTED`=Com resultado; `CANCELLED`=Cancelado

#### veterinaria.VeterinaryMedicalRecord

- verbose_name: Prontuário Veterinário
- db_table: veterinaria_prontuario
- fields: 27

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| anamnesis | TextField | no |  | 0 |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| appointment | ForeignKey | no | fk:veterinaria.VeterinaryAppointment | 0 |
| closed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| diagnosis | TextField | no |  | 0 |
| heart_rate_bpm | PositiveSmallIntegerField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| notes | TextField | no |  | 0 |
| opened_at | DateTimeField | yes |  | 0 |
| prescription_notes | TextField | no |  | 0 |
| respiratory_rate_bpm | PositiveSmallIntegerField | no |  | 0 |
| status | CharField | yes |  | 4 |
| symptoms | TextField | no |  | 0 |
| temperature_c | DecimalField | no |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| treatment_plan | TextField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |
| weight_kg | DecimalField | no |  | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `ACTIVE`=Ativo; `FINALIZED`=Finalizado; `CANCELLED`=Cancelado

#### veterinaria.VeterinaryPrescription

- verbose_name: Receita Veterinária
- db_table: veterinaria_receita
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| instructions | TextField | no |  | 0 |
| issued_at | DateTimeField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| record | ForeignKey | no | fk:veterinaria.VeterinaryMedicalRecord | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `ACTIVE`=Ativa; `COMPLETED`=Concluída; `CANCELLED`=Cancelada

#### veterinaria.VeterinaryPrescriptionItem

- verbose_name: Item de Receita Veterinária
- db_table: veterinaria_receita_item
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| dosage | CharField | yes |  | 0 |
| duration_days | PositiveSmallIntegerField | no |  | 0 |
| frequency | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| instructions | TextField | no |  | 0 |
| medication | ForeignKey | no | fk:farmacia.Product | 0 |
| medication_name | CharField | no |  | 0 |
| position | PositiveIntegerField | yes |  | 0 |
| prescription | ForeignKey | yes | fk:veterinaria.VeterinaryPrescription | 0 |
| quantity | DecimalField | yes |  | 0 |
| route | CharField | yes |  | 6 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- route (6): `ORAL`=Oral; `TOPICAL`=Tópica; `INJECTABLE`=Injetável; `OPHTHALMIC`=Oftálmica; `OTIC`=Otológica; `OTHER`=Outra

#### veterinaria.VeterinaryVaccination

- verbose_name: Vacinação Veterinária
- db_table: veterinaria_vacinacao
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| administered_at | DateTimeField | no |  | 0 |
| adverse_reaction | TextField | no |  | 0 |
| animal | ForeignKey | yes | fk:veterinaria.VeterinaryAnimal | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| lot_number | CharField | no |  | 0 |
| next_due_date | DateField | no |  | 0 |
| notes | TextField | no |  | 0 |
| scheduled_for | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| vaccine | ForeignKey | yes | fk:veterinaria.VeterinaryVaccine | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| veterinarian | ForeignKey | no | fk:recursos_humanos.Employee | 0 |

**Choices**
- status (4): `SCHEDULED`=Agendada; `APPLIED`=Aplicada; `OVERDUE`=Em atraso; `CANCELLED`=Cancelada

#### veterinaria.VeterinaryVaccine

- verbose_name: Vacina Veterinária
- db_table: veterinaria_vacina
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| active | BooleanField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_interval_days | PositiveSmallIntegerField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| disease | CharField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| manufacturer | CharField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| species | CharField | yes |  | 10 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- species (10): `ALL`=Todas; `DOG`=Canina; `CAT`=Felina; `BIRD`=Ave; `RABBIT`=Coelho; `RUMINANT`=Ruminante; `EQUINE`=Equina; `SWINE`=Suína; `REPTILE`=Réptil; `OTHER`=Outra

### warehouse

#### warehouse.CycleCount

- verbose_name: Inventário Cíclico
- db_table: warehouse_cycle_count
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| count_number | CharField | yes |  | 0 |
| counted_at | DateField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| posted_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `DRAFT`=Rascunho; `POSTED`=Lançado; `CANCELLED`=Cancelado

#### warehouse.CycleCountLine

- verbose_name: Linha de Inventário
- db_table: warehouse_cycle_count_line
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| counted_quantity | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| cycle_count | ForeignKey | yes | fk:warehouse.CycleCount | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| system_quantity | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.GoodsReceipt

- verbose_name: Recebimento de Compra
- db_table: warehouse_goods_receipt
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| default_location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| posted_at | DateTimeField | no |  | 0 |
| purchase_order | ForeignKey | no | fk:warehouse.PurchaseOrder | 0 |
| receipt_number | CharField | yes |  | 0 |
| received_at | DateField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| warehouse | ForeignKey | yes | fk:warehouse.Warehouse | 0 |

**Choices**
- status (3): `DRAFT`=Rascunho; `POSTED`=Lançado; `CANCELLED`=Cancelado

#### warehouse.GoodsReceiptLine

- verbose_name: Linha de Recebimento
- db_table: warehouse_goods_receipt_line
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expiration_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| location | ForeignKey | no | fk:warehouse.StorageLocation | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| lot_number | CharField | no |  | 0 |
| purchase_order_line | ForeignKey | no | fk:warehouse.PurchaseOrderLine | 0 |
| quantity | DecimalField | yes |  | 0 |
| receipt | ForeignKey | yes | fk:warehouse.GoodsReceipt | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.PickList

- verbose_name: Lista de Separação
- db_table: warehouse_pick_list
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| completed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| pick_number | CharField | yes |  | 0 |
| sales_order | ForeignKey | yes | fk:warehouse.SalesOrder | 0 |
| started_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `OPEN`=Aberta; `PICKED`=Separada; `CANCELLED`=Cancelada

#### warehouse.PickListLine

- verbose_name: Linha de Separação
- db_table: warehouse_pick_list_line
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| pick_list | ForeignKey | yes | fk:warehouse.PickList | 0 |
| quantity_picked | DecimalField | yes |  | 0 |
| quantity_to_pick | DecimalField | yes |  | 0 |
| reservation | ForeignKey | yes | fk:warehouse.StockReservation | 0 |
| sales_order_line | ForeignKey | yes | fk:warehouse.SalesOrderLine | 0 |
| source_location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.PurchaseOrder

- verbose_name: Pedido de Compra
- db_table: warehouse_purchase_order
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expected_at | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| order_number | CharField | yes |  | 0 |
| ordered_at | DateField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| supplier_document | CharField | no |  | 0 |
| supplier_name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `DRAFT`=Rascunho; `POSTED`=Lançado; `CANCELLED`=Cancelado

#### warehouse.PurchaseOrderLine

- verbose_name: Linha de Pedido de Compra
- db_table: warehouse_purchase_order_line
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| ordered_quantity | DecimalField | yes |  | 0 |
| purchase_order | ForeignKey | yes | fk:warehouse.PurchaseOrder | 0 |
| received_quantity | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.ReplenishmentPlan

- verbose_name: Plano de Reposição
- db_table: warehouse_replenishment_plan
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| generated_at | DateTimeField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| plan_number | CharField | yes |  | 0 |
| purchase_order | ForeignKey | no | fk:warehouse.PurchaseOrder | 0 |
| status | CharField | yes |  | 4 |
| supplier_name | CharField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| warehouse | ForeignKey | no | fk:warehouse.Warehouse | 0 |

**Choices**
- status (4): `DRAFT`=Rascunho; `GENERATED`=Gerado; `ORDERED`=Pedido criado; `CANCELLED`=Cancelado

#### warehouse.ReplenishmentSuggestion

- verbose_name: Sugestão de Reposição
- db_table: warehouse_replenishment_suggestion
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| available_quantity | DecimalField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| current_quantity | DecimalField | yes |  | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| estimated_unit_cost | DecimalField | yes |  | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| plan | ForeignKey | yes | fk:warehouse.ReplenishmentPlan | 0 |
| recommended_quantity | DecimalField | yes |  | 0 |
| reorder_point | DecimalField | yes |  | 0 |
| reserved_quantity | DecimalField | yes |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| warehouse | ForeignKey | no | fk:warehouse.Warehouse | 0 |

**Choices**
- status (3): `OPEN`=Aberta; `ORDERED`=Pedido criado; `IGNORED`=Ignorada

#### warehouse.SalesOrder

- verbose_name: Pedido de Venda
- db_table: warehouse_sales_order
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| allocated_at | DateTimeField | no |  | 0 |
| confirmed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| customer_document | CharField | no |  | 0 |
| customer_name | CharField | yes |  | 0 |
| customer_reference | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| order_number | CharField | yes |  | 0 |
| priority | PositiveSmallIntegerField | yes |  | 0 |
| requested_ship_date | DateField | no |  | 0 |
| shipped_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 7 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (7): `DRAFT`=Rascunho; `CONFIRMED`=Confirmado; `ALLOCATED`=Reservado; `PICKING`=Em separação; `PARTIALLY_SHIPPED`=Parcialmente expedido; `SHIPPED`=Expedido; `CANCELLED`=Cancelado

#### warehouse.SalesOrderLine

- verbose_name: Linha de Pedido de Venda
- db_table: warehouse_sales_order_line
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| ordered_quantity | DecimalField | yes |  | 0 |
| preferred_location | ForeignKey | no | fk:warehouse.StorageLocation | 0 |
| reserved_quantity | DecimalField | yes |  | 0 |
| sales_order | ForeignKey | yes | fk:warehouse.SalesOrder | 0 |
| shipped_quantity | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_price | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.Shipment

- verbose_name: Expedição
- db_table: warehouse_shipment
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| carrier_name | CharField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| sales_order | ForeignKey | yes | fk:warehouse.SalesOrder | 0 |
| shipment_number | CharField | yes |  | 0 |
| shipped_at | DateTimeField | no |  | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| tracking_number | CharField | no |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `DRAFT`=Rascunho; `SHIPPED`=Expedida; `CANCELLED`=Cancelada

#### warehouse.ShipmentLine

- verbose_name: Linha de Expedição
- db_table: warehouse_shipment_line
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| quantity | DecimalField | yes |  | 0 |
| reservation | ForeignKey | yes | fk:warehouse.StockReservation | 0 |
| sales_order_line | ForeignKey | yes | fk:warehouse.SalesOrderLine | 0 |
| shipment | ForeignKey | yes | fk:warehouse.Shipment | 0 |
| source_location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.StockLevel

- verbose_name: Saldo de Estoque
- db_table: warehouse_stock_level
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| quantity | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.StockMovement

- verbose_name: Movimento WMS
- db_table: warehouse_stock_movement
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination_location | ForeignKey | no | fk:warehouse.StorageLocation | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| movement_type | CharField | yes |  | 6 |
| name | CharField | yes |  | 0 |
| posted_at | DateTimeField | no |  | 0 |
| quantity | DecimalField | yes |  | 0 |
| reason | CharField | no |  | 0 |
| reference_document | CharField | no |  | 0 |
| source_location | ForeignKey | no | fk:warehouse.StorageLocation | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- movement_type (6): `RECEIPT`=Entrada; `ISSUE`=Saída; `TRANSFER`=Transferência; `ADJUSTMENT_IN`=Ajuste positivo; `ADJUSTMENT_OUT`=Ajuste negativo; `COUNT_CORRECTION`=Correção de inventário
- status (3): `DRAFT`=Rascunho; `POSTED`=Lançado; `CANCELLED`=Cancelado

#### warehouse.StockReservation

- verbose_name: Reserva de Estoque
- db_table: warehouse_stock_reservation
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| consumed_at | DateTimeField | no |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| quantity | DecimalField | yes |  | 0 |
| released_at | DateTimeField | no |  | 0 |
| reserved_at | DateTimeField | yes |  | 0 |
| sales_order | ForeignKey | yes | fk:warehouse.SalesOrder | 0 |
| sales_order_line | ForeignKey | yes | fk:warehouse.SalesOrderLine | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `ACTIVE`=Ativa; `RELEASED`=Liberada; `CONSUMED`=Consumida; `CANCELLED`=Cancelada

#### warehouse.StockTransfer

- verbose_name: Transferência de Estoque
- db_table: warehouse_stock_transfer
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| destination_location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| notes | TextField | no |  | 0 |
| posted_at | DateTimeField | no |  | 0 |
| source_location | ForeignKey | yes | fk:warehouse.StorageLocation | 0 |
| status | CharField | yes |  | 3 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| transfer_number | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (3): `DRAFT`=Rascunho; `POSTED`=Lançado; `CANCELLED`=Cancelado

#### warehouse.StockTransferLine

- verbose_name: Linha de Transferência
- db_table: warehouse_stock_transfer_line
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot | ForeignKey | no | fk:warehouse.WarehouseLot | 0 |
| quantity | DecimalField | yes |  | 0 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| transfer | ForeignKey | yes | fk:warehouse.StockTransfer | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

#### warehouse.StorageLocation

- verbose_name: Localização de Armazém
- db_table: warehouse_location
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| barcode | CharField | no |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| location_type | CharField | yes |  | 8 |
| name | CharField | yes |  | 0 |
| parent | ForeignKey | no | fk:warehouse.StorageLocation | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| warehouse | ForeignKey | yes | fk:warehouse.Warehouse | 0 |

**Choices**
- location_type (8): `DOCK`=Doca; `ZONE`=Zona; `AISLE`=Corredor; `RACK`=Estante; `SHELF`=Prateleira; `BIN`=Posição; `QUARANTINE`=Quarentena; `DISPATCH`=Expedição
- status (2): `ACTIVE`=Ativo; `INACTIVE`=Inativo

#### warehouse.Warehouse

- verbose_name: Armazém
- db_table: warehouse_warehouse
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| address | CharField | no |  | 0 |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |
| warehouse_type | CharField | yes |  | 6 |

**Choices**
- status (2): `ACTIVE`=Ativo; `INACTIVE`=Inativo
- warehouse_type (6): `CENTRAL`=Central; `CLINICAL`=Clínico; `PHARMACY`=Farmácia; `MAINTENANCE`=Manutenção; `PRODUCTION`=Produção; `OTHER`=Outro

#### warehouse.WarehouseItem

- verbose_name: Item de Estoque
- db_table: warehouse_item
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| barcode | CharField | no |  | 0 |
| category | ForeignKey | no | fk:warehouse.WarehouseItemCategory | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| external_reference | CharField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| item_type | CharField | yes |  | 6 |
| name | CharField | yes |  | 0 |
| pharmacy_product | ForeignKey | no | fk:farmacia.Product | 0 |
| reorder_point | DecimalField | yes |  | 0 |
| reorder_quantity | DecimalField | yes |  | 0 |
| sku | CharField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_of_measure | CharField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- item_type (6): `PRODUCT`=Produto; `MATERIAL`=Material; `CONSUMABLE`=Consumível; `SPARE_PART`=Peça; `SERVICE`=Serviço; `ASSET`=Ativo
- status (2): `ACTIVE`=Ativo; `INACTIVE`=Inativo

#### warehouse.WarehouseItemCategory

- verbose_name: Categoria de Item
- db_table: warehouse_item_category
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| code | CharField | yes |  | 0 |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| id | BigAutoField | no |  | 0 |
| name | CharField | yes |  | 0 |
| status | CharField | yes |  | 2 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (2): `ACTIVE`=Ativo; `INACTIVE`=Inativo

#### warehouse.WarehouseLot

- verbose_name: Lote WMS
- db_table: warehouse_lot
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| created_at | DateTimeField | no |  | 0 |
| created_by | ForeignKey | no | fk:identidade.User | 0 |
| custom_id | CharField | no |  | 0 |
| deleted | BooleanField | yes |  | 0 |
| deleted_at | DateTimeField | no |  | 0 |
| deleted_by | ForeignKey | no | fk:identidade.User | 0 |
| expiration_date | DateField | no |  | 0 |
| id | BigAutoField | no |  | 0 |
| item | ForeignKey | yes | fk:warehouse.WarehouseItem | 0 |
| lot_number | CharField | yes |  | 0 |
| received_at | DateField | no |  | 0 |
| status | CharField | yes |  | 4 |
| tenant | ForeignKey | yes | fk:inquilinos.Tenant | 0 |
| unit_cost | DecimalField | yes |  | 0 |
| updated_at | DateTimeField | no |  | 0 |
| updated_by | ForeignKey | no | fk:identidade.User | 0 |
| version | PositiveIntegerField | yes |  | 0 |

**Choices**
- status (4): `AVAILABLE`=Disponível; `QUARANTINE`=Quarentena; `BLOCKED`=Bloqueado; `EXPIRED`=Vencido
