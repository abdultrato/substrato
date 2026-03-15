# Catalogo de Models (Backend)

Fonte de verdade para alinhar frontend <-> backend.


## Como regenerar

```bash
.venv/bin/python scripts/export_model_catalog.py
```

- JSON: `/home/australopithecus/Músicas/substrato/frontend-next/model_catalog.json`

## Totais

- apps: 20
- models: 92
- fields: 1511
- fields_com_choices: 57
- choices_total_itens: 405

## Por app/model

### auditoria_atividades

#### auditoria_atividades.AtividadeUsuario

- verbose_name: Actividade do Utilizador
- db_table: auditoria_atividades_atividadeusuario
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| caminho | CharField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| duracao_ms | PositiveIntegerField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| ip | GenericIPAddressField | nao |  | 0 |
| mensagem | CharField | nao |  | 0 |
| metadata | JSONField | nao |  | 0 |
| metodo | CharField | sim |  | 0 |
| objeto_id | CharField | nao |  | 0 |
| path_completo | TextField | nao |  | 0 |
| status_code | PositiveSmallIntegerField | nao |  | 0 |
| user_agent | CharField | nao |  | 0 |
| usuario | ForeignKey | nao | fk:identidade.Usuario | 0 |
| versao | PositiveIntegerField | sim |  | 0 |
| view_action | CharField | nao |  | 0 |
| view_basename | CharField | nao |  | 0 |

### cirurgia

#### cirurgia.Cirurgia

- verbose_name: Cirurgia
- db_table: cirurgia_cirurgia
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| agendada_para | DateTimeField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| cancelada_em | DateTimeField | nao |  | 0 |
| cirurgiao | ForeignKey | nao | fk:identidade.Usuario | 0 |
| concluida_em | DateTimeField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| estado | CharField | sim |  | 4 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| procedimento | CharField | nao |  | 0 |
| procedimentos | ManyToManyField | nao | many_to_many:cirurgia.ProcedimentoCirurgico | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (4): `AGENDADA`=Agendada; `EM_ANDAMENTO`=Em andamento; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada

#### cirurgia.ProcedimentoCirurgico

- verbose_name: Procedimento Cirúrgico
- db_table: cirurgia_procedimentocirurgico
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### clinico

#### clinico.EventoClinico

- verbose_name: evento clinico
- db_table: clinico_eventoclinico
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| requisicao | ForeignKey | nao | fk:clinico.RequisicaoAnalise | 0 |
| resultado | ForeignKey | nao | fk:clinico.ResultadoItem | 0 |
| tipo_evento | CharField | sim |  | 12 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo_evento (12): `resultado_criado`=Resultado Criado; `resultado_interpretado`=Resultado Interpretado; `resultado_validado`=Resultado Validado; `resultado_critico`=Resultado Crítico; `requisicao_criada`=Requisição Criada; `requisicao_processamento`=Requisição em Processamento; `requisicao_validada`=Requisição Validada; `requisicao_cancelada`=Requisição Cancelada; `medicacao_prescrita`=Medicação Prescrita; `medicacao_administrada`=Medicação Administrada; `observacao_clinica`=Observação Clínica; `diagnóstico`=Diagnóstico

#### clinico.Exame

- verbose_name: Exame
- db_table: clinico_exame
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_percentual | DecimalField | sim |  | 0 |
| metodo | MetodoField | sim |  | 42 |
| nome | CharField | sim |  | 0 |
| preco | DinheiroField | sim |  | 0 |
| setor | SetorField | nao |  | 25 |
| trl_horas | PositiveIntegerField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- metodo (42): `Enzimatico`=Enzimático; `Colorimetrico`=Colorimétrico; `Espectrofotometrico`=Espectrofotométrico; `Turbidimetrico`=Turbidimétrico; `Nefelometrico`=Nefelométrico; `Potenciometrico`=Potenciométrico; `Eletroquimico`=Eletroquímico; `ELISA`=ELISA; `Quimioluminescencia`=Quimioluminescência; `Eletroquimioluminescencia`=Eletroquimioluminescência; `Imunofluorescencia`=Imunofluorescência; `Imunoturbidimetria`=Imunoturbidimetria; `Aglutinacao`=Aglutinação; `Cultura`=Cultura; `Antibiograma`=Antibiograma; `Microscopico`=Microscópico; `ColoracaoGram`=Coloração de Gram; `ColoracaoZiehl`=Ziehl-Neelsen; `IsolamentoMicrobiano`=Isolamento Microbiano; `CitometriaFluxo`=Citometria de Fluxo; `HematologiaAutomatizada`=Hematologia Automatizada; `MicroscopiaOptica`=Microscopia Óptica; `PCR`=PCR; `RT_PCR`=RT-PCR; `PCRTempoReal`=PCR em Tempo Real; `Sequenciamento`=Sequenciamento Genético; `HibridizacaoMolecular`=Hibridização Molecular; `Genotipagem`=Genotipagem; `Cromatografia`=Cromatografia; `CromatografiaGasosa`=Cromatografia Gasosa; `CromatografiaLiquida`=Cromatografia Líquida; `HPLC`=Cromatografia Líquida de Alta Eficiência; `Eletroforese`=Eletroforese; `Isoeletrofoque`=Isoeletrofocalização; `Sedimentacao`=Sedimentação; `Flutuacao`=Flutuação; `KatoKatz`=Kato-Katz; `TiraReagente`=Tira Reagente; `AnaliseMicroscopica`=Análise Microscópica; `EspectrometriaMassa`=Espectrometria de Massa; `MALDI_TOF`=MALDI-TOF; `RessonanciaMagneticaNuclear`=Ressonância Magnética Nuclear
- setor (25): `Hematologia`=Hematologia; `Bioquimica`=Bioquímica; `Microbiologia`=Microbiologia; `Imunologia`=Imunologia; `Serologia`=Serologia; `Parasitologia`=Parasitologia; `BiologiaMolecular`=Biologia Molecular; `Toxicologia`=Toxicologia; `Hormonios`=Hormônios e Endocrinologia; `MarcadoresTumorais`=Marcadores Tumorais; `Coagulacao`=Coagulação; `Urinalise`=Urinálise; `LiquidosCorporais`=Líquidos Corporais; `Gasometria`=Gasometria; `NutricaoClinica`=Nutrição Clínica; `Micologia`=Micologia; `Virologia`=Virologia; `Bacteriologia`=Bacteriologia; `BancoSangue`=Banco de Sangue; `ImunoHematologia`=Imuno-hematologia; `Triagem`=Triagem Laboratorial; `RecepcaoAmostras`=Recepção de Amostras; `ControleQualidade`=Controle de Qualidade; `Pesquisa`=Pesquisa Laboratorial; `Outro`=Outro

#### clinico.ExameCampo

- verbose_name: parâmetro
- db_table: clinico_examecampo
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| critico_max | DecimalField | nao |  | 0 |
| critico_min | DecimalField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| delta_max | DecimalField | nao |  | 0 |
| exame | ForeignKey | sim | fk:clinico.Exame | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| referencia_max | DecimalField | nao |  | 0 |
| referencia_min | DecimalField | nao |  | 0 |
| tipo | CharField | sim |  | 4 |
| unidade | CharField | sim |  | 12 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (4): `NUMERICO`=Numérico; `QUALITATIVO`=Qualitativo; `SEMIQUANTITATIVO`=Semi-quantitativo; `TEXTO`=Texto Livre
- unidade (12): `g/dl`=g/dl; `mg/dl`=mg/dl; `mmol/l`=mmol/l; `µmol/l`=µmol/l; `cel/mm3`=cel/mm3; `x10³/µl`=x10³/µl; `×10⁶/µL`=×10⁶/µL; `%`=%; `u/l`=u/l; `p/µL`=p/µL; `ph`=ph; `fl`=fl

#### clinico.ExameMedico

- verbose_name: Exame médico
- db_table: clinico_examemedico
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_percentual | DecimalField | sim |  | 0 |
| metodo | MetodoField | sim |  | 42 |
| nome | CharField | sim |  | 0 |
| preco | DinheiroField | sim |  | 0 |
| setor | SetorField | nao |  | 25 |
| trl_horas | PositiveIntegerField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- metodo (42): `Enzimatico`=Enzimático; `Colorimetrico`=Colorimétrico; `Espectrofotometrico`=Espectrofotométrico; `Turbidimetrico`=Turbidimétrico; `Nefelometrico`=Nefelométrico; `Potenciometrico`=Potenciométrico; `Eletroquimico`=Eletroquímico; `ELISA`=ELISA; `Quimioluminescencia`=Quimioluminescência; `Eletroquimioluminescencia`=Eletroquimioluminescência; `Imunofluorescencia`=Imunofluorescência; `Imunoturbidimetria`=Imunoturbidimetria; `Aglutinacao`=Aglutinação; `Cultura`=Cultura; `Antibiograma`=Antibiograma; `Microscopico`=Microscópico; `ColoracaoGram`=Coloração de Gram; `ColoracaoZiehl`=Ziehl-Neelsen; `IsolamentoMicrobiano`=Isolamento Microbiano; `CitometriaFluxo`=Citometria de Fluxo; `HematologiaAutomatizada`=Hematologia Automatizada; `MicroscopiaOptica`=Microscopia Óptica; `PCR`=PCR; `RT_PCR`=RT-PCR; `PCRTempoReal`=PCR em Tempo Real; `Sequenciamento`=Sequenciamento Genético; `HibridizacaoMolecular`=Hibridização Molecular; `Genotipagem`=Genotipagem; `Cromatografia`=Cromatografia; `CromatografiaGasosa`=Cromatografia Gasosa; `CromatografiaLiquida`=Cromatografia Líquida; `HPLC`=Cromatografia Líquida de Alta Eficiência; `Eletroforese`=Eletroforese; `Isoeletrofoque`=Isoeletrofocalização; `Sedimentacao`=Sedimentação; `Flutuacao`=Flutuação; `KatoKatz`=Kato-Katz; `TiraReagente`=Tira Reagente; `AnaliseMicroscopica`=Análise Microscópica; `EspectrometriaMassa`=Espectrometria de Massa; `MALDI_TOF`=MALDI-TOF; `RessonanciaMagneticaNuclear`=Ressonância Magnética Nuclear
- setor (25): `Hematologia`=Hematologia; `Bioquimica`=Bioquímica; `Microbiologia`=Microbiologia; `Imunologia`=Imunologia; `Serologia`=Serologia; `Parasitologia`=Parasitologia; `BiologiaMolecular`=Biologia Molecular; `Toxicologia`=Toxicologia; `Hormonios`=Hormônios e Endocrinologia; `MarcadoresTumorais`=Marcadores Tumorais; `Coagulacao`=Coagulação; `Urinalise`=Urinálise; `LiquidosCorporais`=Líquidos Corporais; `Gasometria`=Gasometria; `NutricaoClinica`=Nutrição Clínica; `Micologia`=Micologia; `Virologia`=Virologia; `Bacteriologia`=Bacteriologia; `BancoSangue`=Banco de Sangue; `ImunoHematologia`=Imuno-hematologia; `Triagem`=Triagem Laboratorial; `RecepcaoAmostras`=Recepção de Amostras; `ControleQualidade`=Controle de Qualidade; `Pesquisa`=Pesquisa Laboratorial; `Outro`=Outro

#### clinico.ExameMedicoCampo

- verbose_name: parâmetro de exame médico
- db_table: clinico_examemedicocampo
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| critico_max | DecimalField | nao |  | 0 |
| critico_min | DecimalField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| delta_max | DecimalField | nao |  | 0 |
| exame | ForeignKey | sim | fk:clinico.ExameMedico | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| referencia_max | DecimalField | nao |  | 0 |
| referencia_min | DecimalField | nao |  | 0 |
| tipo | CharField | sim |  | 4 |
| unidade | CharField | sim |  | 12 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (4): `NUMERICO`=Numérico; `QUALITATIVO`=Qualitativo; `SEMIQUANTITATIVO`=Semi-quantitativo; `TEXTO`=Texto Livre
- unidade (12): `g/dl`=g/dl; `mg/dl`=mg/dl; `mmol/l`=mmol/l; `µmol/l`=µmol/l; `cel/mm3`=cel/mm3; `x10³/µl`=x10³/µl; `×10⁶/µL`=×10⁶/µL; `%`=%; `u/l`=u/l; `p/µL`=p/µL; `ph`=ph; `fl`=fl

#### clinico.HistoricoClinico

- verbose_name: historico clinico
- db_table: clinico_historicoclinico
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| data_evento | DateTimeField | nao |  | 0 |
| descricao | TextField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |

#### clinico.Paciente

- verbose_name: Paciente
- db_table: clinico_paciente
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| contacto | TelefoneField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_nascimento | DateField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| email | NormalizedEmailField | nao |  | 0 |
| empresa_origem | ForeignKey | nao | fk:entidades.Empresa | 0 |
| genero | CharField | sim |  | 2 |
| gestante | BooleanField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| idade_gestacional_semanas | PositiveIntegerField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| morada | EnderecoField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| numero_id | CharField | nao |  | 0 |
| proveniencia | CharField | nao |  | 13 |
| raca_origem | CharField | sim |  | 6 |
| tipo_documento | CharField | sim |  | 8 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- genero (2): `Masculino`=Masculino; `Femenino`=Femenino
- proveniencia (13): `Ambulatório`=Ambulatório; `Clínica Externa`=Clínica Externa; `Medicina Ocupacional`=Medicina Ocupacional; `Maternidade`=Maternidade; `Ginecologia`=Ginecologia; `Pediatria`=Pediatria; `Banco de Socorros`=Banco de Socorros; `Consulta Externa`=Consulta Externa; `Urologia`=Urologia; `Cirurgia`=Cirurgia; `Dentária`=Dentária; `Oftalmologia`=Oftalmologia; `Outro`=Outro
- raca_origem (6): `Branca`=Branca; `Negra`=Negra; `Parda`=Parda; `Amarela`=Amarela; `Indígena`=Indígena; `Outro`=Outro
- tipo_documento (8): `BI`=Bilhete de Identidade; `PASS`=Passaporte; `DIRE`=Documento de Identificação de Residente Estrangeiro; `CC`=Carta de Condução; `NUIT`=Número Único de Identificação Tributária; `CE`=Cartão de Eleitor; `CN`=Certidão de Nascimento; `OUT`=Outro

#### clinico.ReferenciaClinica

- verbose_name: referencia clinica
- db_table: clinico_referenciaclinica
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| critico_alto | DecimalField | nao |  | 0 |
| critico_baixo | DecimalField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| exame_campo | ForeignKey | sim | fk:clinico.ExameCampo | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| idade_maxima_dias | PositiveIntegerField | nao |  | 0 |
| idade_minima_dias | PositiveIntegerField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| sexo | CharField | nao |  | 2 |
| valor_maximo | DecimalField | nao |  | 0 |
| valor_minimo | DecimalField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- sexo (2): `Masculino`=Masculino; `Femenino`=Femenino

#### clinico.RequisicaoAnalise

- verbose_name: Requisição de exame
- db_table: clinico_requisicaoanalise
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| analista | ForeignKey | nao | fk:identidade.Usuario | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| empresa_executora_externa | ForeignKey | nao | fk:entidades.Empresa | 0 |
| empresa_solicitante | ForeignKey | nao | fk:entidades.Empresa | 0 |
| estado | CharField | sim |  | 5 |
| exames | ManyToManyField | sim | many_to_many:clinico.Exame | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| possui_resultado_critico | BooleanField | sim |  | 0 |
| status_clinico | CharField | sim |  | 9 |
| tipo | CharField | sim |  | 2 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (5): `pendente`=Pendente; `em_analise`=Em Análise; `aguardando_validacao`=Aguardando Validação; `validado`=Validado; `rejeitado`=Rejeitado
- status_clinico (9): `NAO_URGENTE`=Não urgente; `NORMAL`=Normal; `ROTINA`=Rotina; `POUCO_URGENTE`=Pouco urgente; `PRIORITARIO`=Prioritário; `URGENTE`=Urgente; `MUITO_URGENTE`=Muito urgente; `URGENTISSIMO`=Urgentíssimo; `EMERGENCIA`=Emergência
- tipo (2): `LAB`=Laboratório; `MED`=Exame médico

#### clinico.RequisicaoItem

- verbose_name: requisicao item
- db_table: clinico_requisicaoitem
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| exame | ForeignKey | nao | fk:clinico.Exame | 0 |
| exame_medico | ForeignKey | nao | fk:clinico.ExameMedico | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| requisicao | ForeignKey | sim | fk:clinico.RequisicaoAnalise | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### clinico.Resultado

- verbose_name: resultado
- db_table: clinico_resultado
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| analista | ForeignKey | nao | fk:identidade.Usuario | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| finalizado | BooleanField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| requisicao | OneToOneField | sim | fk:clinico.RequisicaoAnalise | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### clinico.ResultadoItem

- verbose_name: resultado item
- db_table: clinico_resultadoitem
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| alerta_critico | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| cor_laudo | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_validacao | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 5 |
| exame_campo | ForeignKey | sim | fk:clinico.ExameCampo | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| resultado | ForeignKey | sim | fk:clinico.Resultado | 0 |
| resultado_valor | DecimalField | nao |  | 0 |
| status_clinico | CharField | nao |  | 0 |
| validado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (5): `pendente`=Pendente; `em_analise`=Em Análise; `aguardando_validacao`=Aguardando Validação; `validado`=Validado; `rejeitado`=Rejeitado

### consultas

#### consultas.ConsultaMedica

- verbose_name: Consulta Médica
- db_table: consultas_consultamedica
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| agendada_para | DateTimeField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| cancelada_em | DateTimeField | nao |  | 0 |
| concluida_em | DateTimeField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| especialidade | ForeignKey | nao | fk:consultas.EspecialidadeConsulta | 0 |
| estado | CharField | sim |  | 3 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| medico | ForeignKey | nao | fk:identidade.Usuario | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| preco | DinheiroField | sim |  | 0 |
| tipo | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (3): `MARCADA`=Marcada; `CONCLUIDA`=Concluída; `CANCELADA`=Cancelada

#### consultas.EspecialidadeConsulta

- verbose_name: Especialidade (Consulta)
- db_table: consultas_especialidadeconsulta
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_percentual | DecimalField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| preco_base | DinheiroField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### consultas.Feriado

- verbose_name: Feriado
- db_table: consultas_feriado
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### contabilidade

#### contabilidade.ConciliacaoFinanceira

- verbose_name: conciliacao financeira
- db_table: contabilidade_conciliacaofinanceira
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| conciliado | BooleanField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| divergencia | DecimalField | sim |  | 0 |
| fatura | ForeignKey | sim | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| referencia_externa | CharField | nao |  | 0 |
| valor_contabil | DecimalField | sim |  | 0 |
| valor_recebido | DecimalField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### contabilidade.Conta

- verbose_name: conta
- db_table: contabilidade_conta
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| tipo | CharField | sim |  | 5 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (5): `ATI`=Ativo; `PAS`=Passivo; `REC`=Receita; `DES`=Despesa; `PAT`=Patrimônio

#### contabilidade.Lancamento

- verbose_name: lancamento
- db_table: contabilidade_lancamento
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| confirmado | BooleanField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| referencia_externa | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### contabilidade.LedgerEntry

- verbose_name: ledger entry
- db_table: contabilidade_ledgerentry
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_contabil | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | CharField | sim |  | 0 |
| hash_anterior | CharField | nao |  | 0 |
| hash_atual | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| idempotency_key | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| motivo_reversao | TextField | nao |  | 0 |
| nome | CharField | sim |  | 0 |
| referencia_externa | CharField | sim |  | 0 |
| reverso_de | OneToOneField | nao | fk:contabilidade.LedgerEntry | 0 |
| revertido | BooleanField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### contabilidade.LedgerLine

- verbose_name: ledger line
- db_table: contabilidade_ledgerline
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| conta | ForeignKey | sim | fk:contabilidade.Conta | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| entry | ForeignKey | sim | fk:contabilidade.LedgerEntry | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| natureza | CharField | sim |  | 2 |
| nome | CharField | sim |  | 0 |
| valor | DecimalField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- natureza (2): `D`=Débito; `C`=Crédito

#### contabilidade.Movimento

- verbose_name: movimento
- db_table: contabilidade_movimento
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| conta | ForeignKey | sim | fk:contabilidade.Conta | 0 |
| credito | DecimalField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| debito | DecimalField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| lancamento | ForeignKey | sim | fk:contabilidade.Lancamento | 0 |
| nome | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### contabilidade.SaldoConta

- verbose_name: Saldo de Conta
- db_table: contabilidade_saldoconta
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| conta | OneToOneField | sim | fk:contabilidade.Conta | 0 |
| id | BigAutoField | nao |  | 0 |
| saldo_atual | DecimalField | sim |  | 0 |

### enfermagem

#### enfermagem.CamaEnfermaria

- verbose_name: Cama
- db_table: enfermagem_camaenfermaria
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativa | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| enfermaria | ForeignKey | sim | fk:enfermagem.Enfermaria | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| numero | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.Enfermaria

- verbose_name: Enfermaria
- db_table: enfermagem_enfermaria
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativa | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.EvolucaoEnfermagem

- verbose_name: Evolução de Enfermagem
- db_table: enfermagem_evolucaoenfermagem
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_evolucao | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| observacao | TextField | sim |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.InternamentoEnfermaria

- verbose_name: Internamento (Enfermaria)
- db_table: enfermagem_internamentoenfermaria
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| alta_em | DateTimeField | nao |  | 0 |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| cama | ForeignKey | sim | fk:enfermagem.CamaEnfermaria | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_internamento | DateTimeField | sim |  | 0 |
| data_prevista_alta | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacoes | TextField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| proxima_medicacao_descricao | CharField | nao |  | 0 |
| proxima_medicacao_em | DateTimeField | nao |  | 0 |
| tempo_estimado_observacao_horas | PositiveSmallIntegerField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.PrescricaoEnfermagem

- verbose_name: Prescrição de Enfermagem
- db_table: enfermagem_prescricaoenfermagem
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_prescricao | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.Procedimento

- verbose_name: Procedimento
- db_table: enfermagem_procedimento
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_realizacao | DateTimeField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacoes | TextField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| profissional | ForeignKey | nao | fk:identidade.Usuario | 0 |
| subtotal_materiais | DecimalField | sim |  | 0 |
| subtotal_servicos | DecimalField | sim |  | 0 |
| total | DecimalField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoCatalogo

- verbose_name: Procedimento (Catálogo)
- db_table: enfermagem_procedimentocatalogo
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_percentual | DecimalField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| preco_padrao | DinheiroField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoCatalogoMaterial

- verbose_name: Material de Procedimento
- db_table: enfermagem_procedimentocatalogomaterial
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| catalogo | ForeignKey | sim | fk:enfermagem.ProcedimentoCatalogo | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| custo_unitario_padrao | DinheiroField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacao | TextField | nao |  | 0 |
| produto | ForeignKey | sim | fk:farmacia.Produto | 0 |
| quantidade_padrao | DecimalField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoItem

- verbose_name: Item de Procedimento
- db_table: enfermagem_procedimentoitem
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| catalogo | ForeignKey | nao | fk:enfermagem.ProcedimentoCatalogo | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacao | TextField | nao |  | 0 |
| preco_unitario | DecimalField | sim |  | 0 |
| procedimento | ForeignKey | sim | fk:enfermagem.Procedimento | 0 |
| quantidade | PositiveIntegerField | sim |  | 0 |
| realizado | BooleanField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoItemValor

- verbose_name: Valor do Item de Procedimento
- db_table: enfermagem_procedimentoitemvalor
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| item | OneToOneField | sim | fk:enfermagem.ProcedimentoItem | 0 |
| preco_unitario | DinheiroField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoMaterial

- verbose_name: Material do Procedimento
- db_table: enfermagem_procedimentomaterial
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| custo_unitario | DecimalField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| lote | ForeignKey | nao | fk:farmacia.Lote | 0 |
| movimento_estoque | OneToOneField | nao | fk:farmacia.MovimentoEstoque | 0 |
| observacao | TextField | nao |  | 0 |
| procedimento | ForeignKey | sim | fk:enfermagem.Procedimento | 0 |
| procedimento_item | ForeignKey | nao | fk:enfermagem.ProcedimentoItem | 0 |
| produto | ForeignKey | sim | fk:farmacia.Produto | 0 |
| quantidade | PositiveIntegerField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.ProcedimentoMaterialValor

- verbose_name: Valor do Material do Procedimento
- db_table: enfermagem_procedimentomaterialvalor
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| custo_unitario | DinheiroField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| material | OneToOneField | sim | fk:enfermagem.ProcedimentoMaterial | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### enfermagem.RegistroEnfermagem

- verbose_name: Registro de Enfermagem
- db_table: enfermagem_registroenfermagem
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_registro | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| observacao | TextField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| prioridade | CharField | sim |  | 3 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- prioridade (3): `URG`=Urgente; `NOR`=Normal; `BAI`=Baixa

#### enfermagem.SinalVitalEnfermagem

- verbose_name: Sinal Vital
- db_table: enfermagem_sinalvitalenfermagem
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| coletado_em | DateTimeField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| frequencia_cardiaca | PositiveIntegerField | nao |  | 0 |
| frequencia_respiratoria | PositiveIntegerField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| pressao_arterial | CharField | nao |  | 0 |
| registro | ForeignKey | sim | fk:enfermagem.RegistroEnfermagem | 0 |
| saturacao_oxigenio | PositiveIntegerField | nao |  | 0 |
| temperatura_c | DecimalField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### entidades

#### entidades.Empresa

- verbose_name: Empresa
- db_table: entidades_empresa
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| contactos | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| email | EmailField | nao |  | 0 |
| endereco_sede | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nib | CharField | nao |  | 0 |
| nome | CharField | sim |  | 0 |
| nuit | CharField | nao |  | 0 |
| observacoes | TextField | nao |  | 0 |
| telefone1 | CharField | nao |  | 0 |
| telefone2 | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### farmacia

#### farmacia.CategoriaProduto

- verbose_name: categoria produto
- db_table: farmacia_categoriaproduto
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| categoria_pai | ForeignKey | nao | fk:farmacia.CategoriaProduto | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### farmacia.ItemVenda

- verbose_name: Item da Venda
- db_table: farmacia_itemvenda
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| preco_unitario | DecimalField | nao |  | 0 |
| produto | ForeignKey | sim | fk:farmacia.Produto | 0 |
| quantidade | PositiveIntegerField | sim |  | 0 |
| venda | ForeignKey | sim | fk:farmacia.Venda | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### farmacia.Lote

- verbose_name: lote
- db_table: farmacia_lote
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| numero_lote | CharField | sim |  | 0 |
| produto | ForeignKey | sim | fk:farmacia.Produto | 0 |
| quantidade_inicial | PositiveIntegerField | sim |  | 0 |
| validade | DateField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### farmacia.MovimentoEstoque

- verbose_name: movimento estoque
- db_table: farmacia_movimentoestoque
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| item_venda | ForeignKey | nao | fk:farmacia.ItemVenda | 0 |
| lote | ForeignKey | sim | fk:farmacia.Lote | 0 |
| nome | CharField | sim |  | 0 |
| origem | CharField | sim |  | 3 |
| quantidade | PositiveIntegerField | sim |  | 0 |
| tipo | CharField | sim |  | 3 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- origem (3): `VEND`=Venda; `PROC`=Procedimento; `AJUS`=Ajuste
- tipo (3): `ENT`=Entrada; `SAI`=Saída; `AJU`=Ajuste

#### farmacia.Produto

- verbose_name: Produto
- db_table: farmacia_produto
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| categoria | ForeignKey | nao | fk:farmacia.CategoriaProduto | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_percentual | DecimalField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| preco_venda | DecimalField | sim |  | 0 |
| tipo | CharField | sim |  | 3 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (3): `MED`=Medicamento; `MAT`=Material; `OUT`=Outro

#### farmacia.Venda

- verbose_name: Venda
- db_table: farmacia_venda
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| numero | CharField | sim |  | 0 |
| paciente | ForeignKey | nao | fk:clinico.Paciente | 0 |
| total | DecimalField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### faturamento

#### faturamento.Fatura

- verbose_name: Fatura
- db_table: faturamento_fatura
- fields: 24

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| consulta | OneToOneField | nao | fk:consultas.ConsultaMedica | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 4 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| iva_valor | DecimalField | sim |  | 0 |
| origem | CharField | sim |  | 4 |
| paciente | ForeignKey | nao | fk:clinico.Paciente | 0 |
| procedimento | OneToOneField | nao | fk:enfermagem.Procedimento | 0 |
| procedimentos | ManyToManyField | nao | many_to_many:enfermagem.Procedimento | 0 |
| requisicao | OneToOneField | nao | fk:clinico.RequisicaoAnalise | 0 |
| subtotal | DecimalField | sim |  | 0 |
| total | DecimalField | sim |  | 0 |
| valor_paciente | DecimalField | sim |  | 0 |
| valor_seguro | DecimalField | sim |  | 0 |
| venda | OneToOneField | nao | fk:farmacia.Venda | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (4): `RASC`=Rascunho; `EMIT`=Emitida; `PAGA`=Paga; `CANC`=Cancelada
- origem (4): `CLI`=Clínico; `FAR`=Farmácia; `ENF`=Enfermagem; `CON`=Consulta

#### faturamento.FaturaItem

- verbose_name: Item de Fatura
- db_table: faturamento_faturaitem
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | CharField | nao |  | 0 |
| exame | ForeignKey | nao | fk:clinico.Exame | 0 |
| exame_medico | ForeignKey | nao | fk:clinico.ExameMedico | 0 |
| fatura | ForeignKey | sim | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| item_venda | ForeignKey | nao | fk:farmacia.ItemVenda | 0 |
| iva_percentual | DecimalField | nao |  | 0 |
| preco_unitario | DecimalField | sim |  | 0 |
| procedimento_item | ForeignKey | nao | fk:enfermagem.ProcedimentoItem | 0 |
| procedimento_material | ForeignKey | nao | fk:enfermagem.ProcedimentoMaterial | 0 |
| quantidade | DecimalField | sim |  | 0 |
| tipo_item | CharField | sim |  | 6 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo_item (6): `EXA`=Exame; `EXM`=Exame médico; `FAR`=Item de farmácia; `PRC`=Serviço de enfermagem; `MAT`=Material de enfermagem; `AJU`=Ajuste manual

#### faturamento.HistoricoFatura

- verbose_name: Histórico de Fatura
- db_table: faturamento_historicofatura
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| fatura | ForeignKey | sim | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| tipo_evento | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### identidade

#### identidade.PasswordResetToken

- verbose_name: Token de Reset de Password
- db_table: identidade_passwordresettoken
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| criado_em | DateTimeField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| token | CharField | nao |  | 0 |
| usado | BooleanField | sim |  | 0 |
| user | ForeignKey | sim | fk:identidade.Usuario | 0 |

#### identidade.PerfilProfissional

- verbose_name: Perfil Profissional
- db_table: identidade_perfilprofissional
- fields: 9

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| cargo | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| departamento | CharField | nao |  | 0 |
| funcionario | OneToOneField | nao | fk:recursos_humanos.Funcionario | 0 |
| id | BigAutoField | nao |  | 0 |
| registro_profissional | CharField | nao |  | 0 |
| usuario | OneToOneField | sim | fk:identidade.Usuario | 0 |

#### identidade.Usuario

- verbose_name: Usuário
- db_table: identidade_usuario
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| date_joined | DateTimeField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| email | EmailField | sim |  | 0 |
| first_name | CharField | nao |  | 0 |
| foto | ImageField | nao |  | 0 |
| groups | ManyToManyField | nao | many_to_many:auth.Group | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| is_active | BooleanField | sim |  | 0 |
| is_staff | BooleanField | sim |  | 0 |
| is_superuser | BooleanField | sim |  | 0 |
| last_login | DateTimeField | nao |  | 0 |
| last_name | CharField | nao |  | 0 |
| nome | CharField | sim |  | 0 |
| password | CharField | sim |  | 0 |
| telefone | CharField | nao |  | 0 |
| user_permissions | ManyToManyField | nao | many_to_many:auth.Permission | 0 |
| username | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### inquilinos

#### inquilinos.AssinaturaTenant

- verbose_name: Assinatura
- db_table: inquilinos_assinaturatenant
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| ciclo | CharField | sim |  | 2 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_fim | DateField | nao |  | 0 |
| data_inicio | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| plano | ForeignKey | sim | fk:inquilinos.PlanoAssinatura | 0 |
| status | CharField | sim |  | 2 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- ciclo (2): `MENSAL`=Mensal; `ANUAL`=Anual
- status (2): `ATIVA`=Ativa; `CANCELADA`=Cancelada

#### inquilinos.ConfiguracaoInquilino

- verbose_name: Configuração do Inquilino
- db_table: inquilinos_configuracaoinquilino
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| acrescimo_percentual_consulta_feriado | DecimalField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| fuso_horario | CharField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| idioma | CharField | sim |  | 0 |
| inquilino | OneToOneField | sim | fk:inquilinos.Inquilino | 0 |
| limite_usuarios | PositiveIntegerField | sim |  | 0 |
| moeda | CharField | sim |  | 0 |
| permite_multi_unidade | BooleanField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### inquilinos.FeatureFlagTenant

- verbose_name: Feature Flag (Tenant)
- db_table: inquilinos_featureflagtenant
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| chave | CharField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### inquilinos.Inquilino

- verbose_name: Inquilino
- db_table: inquilinos_inquilino
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| bloqueado_em | DateTimeField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| dominio | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| identificador | SlugField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| status_comercial | CharField | sim |  | 3 |
| trial_ate | DateField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- status_comercial (3): `TRIAL`=Trial; `ATIVO`=Ativo; `SUSPENSO`=Suspenso

#### inquilinos.PlanoAssinatura

- verbose_name: Plano de Assinatura
- db_table: inquilinos_planoassinatura
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| limite_requisicoes_mes | PositiveIntegerField | sim |  | 0 |
| limite_usuarios | PositiveIntegerField | sim |  | 0 |
| nome | CharField | sim |  | 0 |
| ordem | PositiveIntegerField | sim |  | 0 |
| permite_multi_unidade | BooleanField | sim |  | 0 |
| preco_excedente_requisicao | DecimalField | sim |  | 0 |
| preco_mensal | DecimalField | sim |  | 0 |
| suporte_prioritario | BooleanField | sim |  | 0 |
| tipo | CharField | sim |  | 3 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (3): `FREE`=Free; `BASIC`=Basic; `PRO`=Pro

#### inquilinos.UsoTenant

- verbose_name: Uso do Tenant
- db_table: inquilinos_usotenant
- fields: 13

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | OneToOneField | sim | fk:inquilinos.Inquilino | 0 |
| requisicoes_mes_atual | PositiveIntegerField | sim |  | 0 |
| usuarios_ativos | PositiveIntegerField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

### integracoes_equipamentos

#### integracoes_equipamentos.IntegracaoCredencial

- verbose_name: Credencial (Equipamento)
- db_table: integracoes_equipamentos_integracaocredencial
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| equipamento | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoEquipamento | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| key_hash | CharField | sim |  | 0 |
| key_last4 | CharField | nao |  | 0 |
| key_prefix | CharField | nao |  | 0 |
| label | CharField | nao |  | 0 |
| revogada_em | DateTimeField | nao |  | 0 |
| scopes | JSONField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### integracoes_equipamentos.IntegracaoDocumento

- verbose_name: Documento (Integração)
- db_table: integracoes_equipamentos_integracaodocumento
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| arquivo | FileField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| content_type | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| filename | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| mensagem | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoMensagem | 0 |
| ordem_item | ForeignKey | nao | fk:integracoes_equipamentos.IntegracaoOrdemItem | 0 |
| sha256 | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### integracoes_equipamentos.IntegracaoEquipamento

- verbose_name: Equipamento (Integração)
- db_table: integracoes_equipamentos_integracaoequipamento
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| config | JSONField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| fabricante | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| modalidade | CharField | sim |  | 6 |
| modelo | CharField | nao |  | 0 |
| nome | CharField | sim |  | 0 |
| numero_serie | CharField | nao |  | 0 |
| protocolo | CharField | sim |  | 5 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- modalidade (6): `ECG`=Eletrocardiograma; `HEM`=Hemograma (Hematologia); `BIO`=Bioquímica; `US`=Ecografia (Ultrassom); `XR`=Raios-X; `OUT`=Outro
- protocolo (5): `HTTP_JSON`=HTTP (JSON); `HL7_MLLP`=HL7 v2 (MLLP); `ASTM_TCP`=ASTM (TCP); `DICOM`=DICOM; `FILE_DROP`=File drop (pasta)

#### integracoes_equipamentos.IntegracaoMapeamentoAnalito

- verbose_name: Mapeamento de analito
- db_table: integracoes_equipamentos_integracaomapeamentoanalito
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| codigo | CharField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| equipamento | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoEquipamento | 0 |
| exame_campo | ForeignKey | sim | fk:clinico.ExameCampo | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| unidade_override | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### integracoes_equipamentos.IntegracaoMensagem

- verbose_name: Mensagem (Integração)
- db_table: integracoes_equipamentos_integracaomensagem
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| content_type | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| direcao | CharField | sim |  | 2 |
| equipamento | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoEquipamento | 0 |
| erro | TextField | nao |  | 0 |
| estado | CharField | sim |  | 3 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| message_id | CharField | nao |  | 0 |
| ordem | ForeignKey | nao | fk:integracoes_equipamentos.IntegracaoOrdem | 0 |
| payload_json | JSONField | nao |  | 0 |
| payload_raw | TextField | nao |  | 0 |
| processado_em | DateTimeField | nao |  | 0 |
| protocolo | CharField | nao |  | 0 |
| sha256 | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- direcao (2): `IN`=Entrada; `OUT`=Saída
- estado (3): `RECV`=Recebida; `PROC`=Processada; `ERRO`=Erro

#### integracoes_equipamentos.IntegracaoOrdem

- verbose_name: Ordem (Integração)
- db_table: integracoes_equipamentos_integracaoordem
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| equipamento | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoEquipamento | 0 |
| estado | CharField | sim |  | 6 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacao | TextField | nao |  | 0 |
| requisicao | ForeignKey | sim | fk:clinico.RequisicaoAnalise | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (6): `PEND`=Pendente; `SEND`=Enviada; `EXEC`=Em execução; `DONE`=Concluída; `ERRO`=Erro; `CANC`=Cancelada

#### integracoes_equipamentos.IntegracaoOrdemItem

- verbose_name: Item de ordem (Integração)
- db_table: integracoes_equipamentos_integracaoordemitem
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 5 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| ordem | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoOrdem | 0 |
| requisicao_item | ForeignKey | sim | fk:clinico.RequisicaoItem | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (5): `PEND`=Pendente; `EXEC`=Em execução; `DONE`=Concluído; `ERRO`=Erro; `CANC`=Cancelado

#### integracoes_equipamentos.IntegracaoRoteamento

- verbose_name: Roteamento (Integração)
- db_table: integracoes_equipamentos_integracaoroteamento
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| equipamento | ForeignKey | sim | fk:integracoes_equipamentos.IntegracaoEquipamento | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| setor | CharField | sim |  | 25 |
| tipo_exame | CharField | sim |  | 2 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- setor (25): `Hematologia`=Hematologia; `Bioquimica`=Bioquímica; `Microbiologia`=Microbiologia; `Imunologia`=Imunologia; `Serologia`=Serologia; `Parasitologia`=Parasitologia; `BiologiaMolecular`=Biologia Molecular; `Toxicologia`=Toxicologia; `Hormonios`=Hormônios e Endocrinologia; `MarcadoresTumorais`=Marcadores Tumorais; `Coagulacao`=Coagulação; `Urinalise`=Urinálise; `LiquidosCorporais`=Líquidos Corporais; `Gasometria`=Gasometria; `NutricaoClinica`=Nutrição Clínica; `Micologia`=Micologia; `Virologia`=Virologia; `Bacteriologia`=Bacteriologia; `BancoSangue`=Banco de Sangue; `ImunoHematologia`=Imuno-hematologia; `Triagem`=Triagem Laboratorial; `RecepcaoAmostras`=Recepção de Amostras; `ControleQualidade`=Controle de Qualidade; `Pesquisa`=Pesquisa Laboratorial; `Outro`=Outro
- tipo_exame (2): `LAB`=Exame laboratorial; `MED`=Exame médico (imagem/diagnóstico)

### maternidade

#### maternidade.Gestacao

- verbose_name: Gestação
- db_table: maternidade_gestacao
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| bercario | CharField | nao |  | 0 |
| cama_maternidade | CharField | nao |  | 0 |
| cesarianas | PositiveSmallIntegerField | sim |  | 0 |
| criado_em | DateTimeField | sim |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_prevista_parto | DateField | nao |  | 0 |
| data_ultima_menstruacao | DateField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 4 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| medico_responsavel | ForeignKey | nao | fk:identidade.Usuario | 0 |
| observacoes | TextField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| partos_normais | PositiveSmallIntegerField | sim |  | 0 |
| partos_totais | PositiveSmallIntegerField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (4): `ACOMP`=Em acompanhamento; `PARTO`=Parto realizado; `ENCERR`=Encerrada; `CANCEL`=Cancelada

### monitoramento

#### monitoramento.ErroSistema

- verbose_name: Erro do Sistema
- db_table: monitoramento_errosistema
- fields: 26

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| caminho | CharField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| duracao_ms | PositiveIntegerField | nao |  | 0 |
| exception_class | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| ip | GenericIPAddressField | nao |  | 0 |
| mensagem | CharField | nao |  | 0 |
| metadata | JSONField | nao |  | 0 |
| metodo | CharField | sim |  | 0 |
| objeto_id | CharField | nao |  | 0 |
| path_completo | TextField | nao |  | 0 |
| status_code | PositiveSmallIntegerField | sim |  | 0 |
| traceback | TextField | nao |  | 0 |
| user_agent | CharField | nao |  | 0 |
| usuario | ForeignKey | nao | fk:identidade.Usuario | 0 |
| versao | PositiveIntegerField | sim |  | 0 |
| view_action | CharField | nao |  | 0 |
| view_basename | CharField | nao |  | 0 |

### notificacoes

#### notificacoes.LogEnvio

- verbose_name: Log de Envio
- db_table: notificacoes_logenvio
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| criado_em | DateTimeField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| notificacao | ForeignKey | sim | fk:notificacoes.Notificacao | 0 |
| resposta | TextField | nao |  | 0 |
| status | CharField | sim |  | 0 |

#### notificacoes.Notificacao

- verbose_name: notificacao
- db_table: notificacoes_notificacao
- fields: 12

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| assunto | CharField | nao |  | 0 |
| canal | CharField | sim |  | 3 |
| criado_em | DateTimeField | nao |  | 0 |
| destinatario | CharField | sim |  | 0 |
| enviada | BooleanField | sim |  | 0 |
| enviado_em | DateTimeField | nao |  | 0 |
| erro_envio | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| mensagem | TextField | sim |  | 0 |
| paciente | ForeignKey | nao | fk:clinico.Paciente | 0 |
| referencia_externa | CharField | nao |  | 0 |
| tipo_evento | CharField | sim |  | 5 |

**Choices**
- canal (3): `email`=E-mail; `sms`=SMS; `whatsapp`=WhatsApp
- tipo_evento (5): `GERAL`=Geral; `RESET_SENHA`=Reposição de palavra-passe; `RESULTADO`=Resultado disponível; `FATURA`=Fatura emitida; `RECIBO`=Recibo gerado

#### notificacoes.TemplateNotificacao

- verbose_name: Template de Notificação
- db_table: notificacoes_templatenotificacao
- fields: 4

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| conteudo | TextField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| nome | CharField | sim |  | 0 |

### pagamentos

#### pagamentos.HistoricoPagamento

- verbose_name: Histórico de Pagamento
- db_table: pagamentos_historicopagamento
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | CharField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| pagamento | ForeignKey | sim | fk:pagamentos.Pagamento | 0 |
| referencia_externa | CharField | nao |  | 0 |
| tipo_evento | CharField | sim |  | 5 |
| valor | DinheiroField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo_evento (5): `CRIADO`=Criado; `CONFIRMADO`=Confirmado; `FALHA`=Falha; `ESTORNADO`=Estornado; `CANCELADO`=Cancelado

#### pagamentos.Pagamento

- verbose_name: pagamento
- db_table: pagamentos_pagamento
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| fatura | ForeignKey | sim | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| metodo | CharField | sim |  | 7 |
| nome | CharField | sim |  | 0 |
| pago_em | DateTimeField | nao |  | 0 |
| referencia_externa | CharField | nao |  | 0 |
| status | CharField | sim |  | 5 |
| valor | DinheiroField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- metodo (7): `DIN`=Dinheiro; `CAR`=Cartão; `TRF`=Transferência; `MOB`=Mobile Money; `POS`=POS; `CHQ`=Cheque; `OUT`=Outro
- status (5): `PEN`=Pendente; `CON`=Confirmado; `FAL`=Falhou; `EST`=Estornado; `CAN`=Cancelado

#### pagamentos.Recibo

- verbose_name: Recibo
- db_table: pagamentos_recibo
- fields: 6

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| criado_em | DateTimeField | nao |  | 0 |
| fatura | ForeignKey | sim | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| numero | CharField | sim |  | 0 |
| pagamento | OneToOneField | sim | fk:pagamentos.Pagamento | 0 |
| valor | DinheiroField | sim |  | 0 |

#### pagamentos.Reconciliacao

- verbose_name: Reconciliação
- db_table: pagamentos_reconciliacao
- fields: 5

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| confirmado | BooleanField | sim |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| data_confirmacao | DateTimeField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| transacao | OneToOneField | sim | fk:pagamentos.Transacao | 0 |

#### pagamentos.Transacao

- verbose_name: Transação
- db_table: pagamentos_transacao
- fields: 6

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| criado_em | DateTimeField | nao |  | 0 |
| gateway | CharField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| referencia_externa | CharField | sim |  | 0 |
| resposta_gateway | TextField | nao |  | 0 |
| status | CharField | sim |  | 0 |

### prontuario

#### prontuario.PrescricaoItem

- verbose_name: Item de Prescrição
- db_table: prontuario_prescricaoitem
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| dosagem_unidade | CharField | sim |  | 5 |
| dosagem_valor | DecimalField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| intervalo_horas | PositiveSmallIntegerField | nao |  | 0 |
| medicacao | ForeignKey | sim | fk:farmacia.Produto | 0 |
| numero_doses | PositiveSmallIntegerField | sim |  | 0 |
| observacoes | TextField | nao |  | 0 |
| registro | ForeignKey | sim | fk:prontuario.RegistroProntuario | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- dosagem_unidade (5): `MG`=mg; `ML`=ml; `G`=g; `L`=L; `KG`=kg

#### prontuario.RegistroProntuario

- verbose_name: Cardex
- db_table: prontuario_registroprontuario
- fields: 21

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| consultas | ManyToManyField | nao | many_to_many:consultas.ConsultaMedica | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| diagnostico | TextField | nao |  | 0 |
| estado | CharField | sim |  | 3 |
| fim_atendimento | DateTimeField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inicio_atendimento | DateTimeField | sim |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| medico | ForeignKey | nao | fk:identidade.Usuario | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| prescricao | TextField | nao |  | 0 |
| relatorio_medico | TextField | nao |  | 0 |
| sintomas | TextField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (3): `RASCUNHO`=Rascunho; `FINALIZADO`=Finalizado; `CANCELADO`=Cancelado

### recepcao

#### recepcao.CheckinRecepcao

- verbose_name: Check-in
- db_table: recepcao_checkinrecepcao
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atendente | ForeignKey | nao | fk:identidade.Usuario | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| chamado_em | DateTimeField | nao |  | 0 |
| chegou_em | DateTimeField | sim |  | 0 |
| concluido_em | DateTimeField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 6 |
| fatura | OneToOneField | nao | fk:faturamento.Fatura | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| motivo | CharField | nao |  | 0 |
| observacoes | TextField | nao |  | 0 |
| paciente | ForeignKey | sim | fk:clinico.Paciente | 0 |
| prioridade | CharField | sim |  | 3 |
| requisicao | OneToOneField | nao | fk:clinico.RequisicaoAnalise | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (6): `AGUARD`=Aguardando; `ATEND`=Em atendimento; `REQ`=Requisição criada; `FAT`=Fatura vinculada; `CONC`=Concluído; `CANC`=Cancelado
- prioridade (3): `URG`=Urgente; `PREF`=Preferencial; `NOR`=Normal

### recursos_humanos

#### recursos_humanos.AgregadoFamiliar

- verbose_name: Agregado Familiar
- db_table: recursos_humanos_agregadofamiliar
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_nascimento | DateField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| observacoes | TextField | nao |  | 0 |
| parentesco | CharField | sim |  | 5 |
| telefone | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |
| vive_com_funcionario | BooleanField | sim |  | 0 |

**Choices**
- parentesco (5): `CONJUGE`=Cônjuge; `FILHO`=Filho(a); `PAI`=Pai/Mãe; `IRMAO`=Irmão(ã); `OUTRO`=Outro

#### recursos_humanos.Cargo

- verbose_name: Cargo
- db_table: recursos_humanos_cargo
- fields: 14

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| eh_medico | BooleanField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### recursos_humanos.Dispensa

- verbose_name: Dispensa
- db_table: recursos_humanos_dispensa
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| motivo | TextField | nao |  | 0 |
| tipo | CharField | sim |  | 4 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- tipo (4): `DEMISSAO`=Demissão; `RESCISAO`=Rescisão; `FIM_CONTRATO`=Fim de contrato; `OUTRO`=Outro

#### recursos_humanos.Falta

- verbose_name: Falta
- db_table: recursos_humanos_falta
- fields: 15

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| justificada | BooleanField | sim |  | 0 |
| motivo | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### recursos_humanos.Ferias

- verbose_name: Férias
- db_table: recursos_humanos_ferias
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_fim | DateField | sim |  | 0 |
| data_inicio | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| estado | CharField | sim |  | 4 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| observacoes | TextField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (4): `SOLIC`=Solicitada; `APROV`=Aprovada; `GOZADA`=Gozada; `CANCEL`=Cancelada

#### recursos_humanos.FolhaPagamento

- verbose_name: Folha de Pagamento
- db_table: recursos_humanos_folhapagamento
- fields: 22

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ano | PositiveSmallIntegerField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| fechado | BooleanField | sim |  | 0 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| horas_base_mes | PositiveSmallIntegerField | sim |  | 0 |
| horas_extras_apuradas | DecimalField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| mes | PositiveSmallIntegerField | sim |  | 0 |
| multiplicador_hora_extra | DecimalField | sim |  | 0 |
| salario_nominal | DinheiroField | sim |  | 0 |
| salario_total | DinheiroField | sim |  | 0 |
| valor_hora | DecimalField | sim |  | 0 |
| valor_horas_extras | DinheiroField | sim |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### recursos_humanos.Funcionario

- verbose_name: Funcionário
- db_table: recursos_humanos_funcionario
- fields: 23

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| aumento_salarial | DinheiroField | sim |  | 0 |
| cargo | ForeignKey | nao | fk:recursos_humanos.Cargo | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_admissao | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| email | EmailField | nao |  | 0 |
| estado | CharField | sim |  | 2 |
| horas_base_mes | PositiveSmallIntegerField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nib | CharField | nao |  | 0 |
| nome | CharField | sim |  | 0 |
| nuit | CharField | nao |  | 0 |
| numero_documento | CharField | nao |  | 0 |
| salario_nominal | DinheiroField | sim |  | 0 |
| telefone | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- estado (2): `ATIVO`=Ativo; `INATIVO`=Inativo

#### recursos_humanos.HoraExtra

- verbose_name: Hora Extra
- db_table: recursos_humanos_horaextra
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data | DateField | sim |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| horas | DecimalField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| multiplicador | DecimalField | sim |  | 0 |
| observacoes | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### recursos_humanos.HorarioTrabalho

- verbose_name: Horário de Trabalho
- db_table: recursos_humanos_horariotrabalho
- fields: 16

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| dia_semana | IntegerField | sim |  | 7 |
| funcionario | ForeignKey | sim | fk:recursos_humanos.Funcionario | 0 |
| hora_fim | TimeField | sim |  | 0 |
| hora_inicio | TimeField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- dia_semana (7): `0`=Segunda; `1`=Terça; `2`=Quarta; `3`=Quinta; `4`=Sexta; `5`=Sábado; `6`=Domingo

### seguradora

#### seguradora.AutorizacaoProcedimento

- verbose_name: Autorização de Procedimento
- db_table: seguradora_autorizacaoprocedimento
- fields: 20

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| codigo_autorizacao | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| data_resposta | DateTimeField | nao |  | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | nao |  | 0 |
| ordem | PositiveIntegerField | sim |  | 0 |
| plano | ForeignKey | sim | fk:seguradora.PlanoCobertura | 0 |
| requisicao_id | CharField | sim |  | 0 |
| status | CharField | sim |  | 3 |
| versao | PositiveIntegerField | sim |  | 0 |

**Choices**
- status (3): `PENDENTE`=Pendente; `APROVADA`=Aprovada; `NEGADA`=Negada

#### seguradora.PlanoCobertura

- verbose_name: Plano de Cobertura
- db_table: seguradora_planocobertura
- fields: 18

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| exige_autorizacao | BooleanField | sim |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| ordem | PositiveIntegerField | sim |  | 0 |
| percentual_cobertura | DecimalField | sim |  | 0 |
| seguradora | ForeignKey | sim | fk:seguradora.Seguradora | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### seguradora.Seguradora

- verbose_name: Seguradora
- db_table: seguradora_seguradora
- fields: 19

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativa | BooleanField | sim |  | 0 |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| codigo_externo | CharField | nao |  | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| email | EmailField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| ordem | PositiveIntegerField | sim |  | 0 |
| telefone | CharField | nao |  | 0 |
| versao | PositiveIntegerField | sim |  | 0 |

#### seguradora.TenantPlanoCobertura

- verbose_name: Plano por Tenant
- db_table: seguradora_tenantplanocobertura
- fields: 17

| field | type | required | relation | choices |
| --- | --- | --- | --- | --- |
| ativo | BooleanField | sim |  | 0 |
| atualizado_em | DateTimeField | nao |  | 0 |
| atualizado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| criado_em | DateTimeField | nao |  | 0 |
| criado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| deletado | BooleanField | sim |  | 0 |
| deletado_em | DateTimeField | nao |  | 0 |
| deletado_por | ForeignKey | nao | fk:identidade.Usuario | 0 |
| descricao | TextField | nao |  | 0 |
| id | BigAutoField | nao |  | 0 |
| id_custom | CharField | nao |  | 0 |
| inquilino | ForeignKey | sim | fk:inquilinos.Inquilino | 0 |
| nome | CharField | sim |  | 0 |
| ordem | PositiveIntegerField | sim |  | 0 |
| percentual_override | DecimalField | nao |  | 0 |
| plano_global | ForeignKey | sim | fk:seguradora.PlanoCobertura | 0 |
| versao | PositiveIntegerField | sim |  | 0 |
