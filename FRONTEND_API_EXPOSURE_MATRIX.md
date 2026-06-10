# Matriz de Exposição API → Frontend

Documento de controlo para verificar se os endpoints existentes no backend estão correctamente expostos no frontend do Substrato.

Esta matriz deve ser usada durante testes manuais, revisão de PRs e ciclos de beta para evitar que modelos, ViewSets ou endpoints fiquem implementados no backend, mas invisíveis ou mal representados na interface.

---

## Legenda de status

| Status | Significado |
| --- | --- |
| `ok` | Endpoint exposto e fluxo funcional no frontend. |
| `parcial` | Endpoint existe e aparece no frontend, mas ainda falta detalhe, acção, validação, filtro ou fluxo completo. |
| `corrigir` | Endpoint existe, mas a exposição no frontend está errada ou incompleta. |
| `crítico` | Endpoint/domínio necessário para operação real ainda não está exposto ou não está utilizável no frontend. |
| `backend exposto / frontend validar` | ViewSet/rota existem no backend, mas ainda é necessário confirmar tela, menu, listagem, detalhe e acções no frontend. |
| `não aplicável` | Operação não deve existir isoladamente no frontend por regra de negócio. |

---

## Resultado da varredura estática

Varredura feita a partir dos ficheiros de roteamento e ViewSets, sem executar ambiente local.

### Achados principais

1. O backend registra rotas por domínio em `api/v1/routing/routes.py`, usando o padrão:

```text
/api/v1/<domínio>/<recurso>/
```

2. O domínio `clinical_laboratory` está registrado no roteador central.

3. O backend de Laboratório Clínico já contém ViewSets para:

- setores;
- exames;
- painéis;
- pedidos/requisições;
- itens de pedido;
- colheitas;
- amostras;
- recepção de amostras;
- rejeições;
- listas de trabalho;
- resultados;
- validações;
- laudos;
- microbiologia;
- antibiograma;
- biologia molecular;
- baciloscopia;
- gestão da qualidade;
- biossegurança.

4. A lacuna mais provável não é ausência de backend, mas sim **exposição, organização e validação no frontend**.

5. O catálogo de recursos da IA/assistente ainda mostra recursos antigos de `clinical-*` para requisições, exames, resultados e amostras, mas não evidencia no trecho analisado os recursos novos de `clinical_laboratory-*`. Isso deve ser tratado como lacuna de descoberta/catálogo, não necessariamente de API.

---

## Regras de exposição frontend

1. **Pedidos e itens não devem aparecer como recursos soltos quando a lógica exige hierarquia.**
   - Exemplo: itens de pedido laboratorial devem aparecer em segunda camada, dentro do detalhe do pedido.

2. **Todo endpoint operacional deve ter estado de carregamento, erro e vazio.**
   - Lista vazia não pode parecer falha técnica.
   - Erro de API deve informar de forma clara que algo falhou.

3. **Ações críticas devem ficar no detalhe do recurso.**
   - Validar resultado, rejeitar amostra, emitir laudo, cancelar pedido, confirmar colheita e receber amostra não devem ficar escondidos.

4. **Domínios clínicos e financeiros precisam respeitar RBAC e tenant.**
   - O frontend não deve expor acções proibidas para o perfil actual.
   - O backend continua sendo a autoridade final.

5. **Exames, painéis e catálogos devem ter busca/filtro.**
   - Campos de seleção devem permitir digitação e filtragem progressiva.
   - Listas extensas não devem ser navegadas manualmente sem pesquisa.

---

## Matriz principal

| Domínio | Endpoint/Recurso | Backend | Listagem | Detalhe | Criar | Editar | Ações | Status | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Laboratório | setores do laboratório | exposto | sim | sim | sim | sim | ativar/inativar | backend exposto / frontend validar | ViewSet `sector`. Deve aparecer como cadastro/estrutura laboratorial. |
| Laboratório | exames laboratoriais | exposto | sim | sim | sim | sim | ativar/inativar | backend exposto / frontend validar | ViewSet `test`. Deve permitir busca alfabética e filtro ao digitar. |
| Laboratório | painéis de exames | exposto | sim | sim | sim | sim | ativar/inativar | backend exposto / frontend validar | ViewSet `panel`. Painel deve permitir composição de múltiplos exames. |
| Laboratório | pedidos/requisições laboratoriais | exposto | sim | sim | sim | sim | autorizar/cancelar | parcial | ViewSet `order`. Deve ser o recurso principal visível no frontend. |
| Laboratório | itens dos pedidos/requisições | exposto | segunda camada | sim | não isolado | não isolado | sim | corrigir | ViewSet `order_item`. Itens devem aparecer vinculados ao pedido, não como lista independente. |
| Laboratório | colheitas | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `collection`. Deve ser exposto no frontend para fluxo real de amostras. |
| Laboratório | amostras | exposto | sim | sim | sim | sim | receber/aceitar/rejeitar | backend exposto / frontend validar | ViewSet `sample`. Deve mostrar estado, tipo, origem, pedido e rastreabilidade. |
| Laboratório | recepção de amostras | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `reception`. Deve permitir confirmar chegada/recebimento de amostras. |
| Laboratório | rejeições de amostras | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `rejection`. Deve registrar motivo, responsável e data/hora. |
| Laboratório | listas de trabalho | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `worklist`. Deve organizar exames por setor, equipamento, prioridade e estado. |
| Laboratório | resultados | exposto | sim | sim | sim | sim | inserir-resultado/validar | backend exposto / frontend validar | ViewSet `result`. Deve permitir lançamento e visualização estruturada. |
| Laboratório | validações de resultados | exposto | sim | sim | não isolado | não isolado | aprovar | backend exposto / frontend validar | ViewSet `validation`. Validação deve estar vinculada ao resultado/laudo e perfil autorizado. |
| Laboratório | laudos | exposto | sim | sim | sim | sim | assinar/entregar | backend exposto / frontend validar | ViewSet `report`. Deve permitir pré-visualização, emissão, impressão/exportação e assinatura quando aplicável. |
| Laboratório | notificações de resultado crítico | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `critical_notification`. Deve ser visível para supervisão clínica/laboratorial. |
| Microbiologia | culturas | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `culture`. Deve aparecer no fluxo de microbiologia, ligado à amostra/resultado. |
| Microbiologia | isolados | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `isolate`. Deve ficar vinculado à cultura. |
| Microbiologia | antibiograma | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `antibiogram`. Deve permitir registo estruturado de sensibilidade/resistência. |
| Biologia Molecular | resultados moleculares | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `molecular_result`. Deve ter fluxo próprio quando aplicável. |
| Baciloscopia | baciloscopia | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `afb_smear`. Deve suportar registo e validação laboratorial. |
| Qualidade | documentos da qualidade | exposto | sim | sim | sim | sim | aprovar | backend exposto / frontend validar | ViewSet `quality_document`. A lacuna provável é menu/tela frontend. |
| Qualidade | não conformidades | exposto | sim | sim | sim | sim | encerrar | backend exposto / frontend validar | ViewSet `nonconformity`. Deve existir listagem, detalhe, criação, acções correctivas e estado. |
| Qualidade | acções correctivas | exposto | sim | sim | sim | sim | concluir/verificar/fechar | backend exposto / frontend validar | ViewSet `corrective_action`. Deve suportar CAPA. |
| Qualidade | auditorias internas | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `internal_audit`. Deve ter planos, achados, acções e responsáveis. |
| Qualidade | achados de auditoria | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `audit_finding`. Deve ficar vinculado à auditoria. |
| Qualidade | indicadores de qualidade | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `quality_indicator`. Necessário para dashboard de qualidade. |
| Qualidade | formação da equipa | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `training_record`. Necessário para competência e conformidade. |
| Qualidade | avaliação de competência | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `competency`. Deve ligar equipa, área e teste quando aplicável. |
| Qualidade | reclamações | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `complaint`. Pode gerar não conformidade. |
| Qualidade | avaliação de risco | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `risk_assessment`. Importante para laboratório e biossegurança. |
| Qualidade | revisão pela gestão | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `management_review`. Necessário para gestão da qualidade. |
| Biossegurança | perigos biológicos | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `hazard`. Deve expor catálogo de perigos. |
| Biossegurança | incidentes de exposição | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `exposure_incident`. Deve permitir notificação, classificação, investigação e encerramento. |
| Biossegurança | EPIs | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `ppe`. Deve suportar controlo operacional. |
| Biossegurança | distribuição de EPIs | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `ppe_distribution`. Deve manter vínculo com equipa/departamento. |
| Biossegurança | resíduos | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `waste`. Deve rastrear geração e estado. |
| Biossegurança | descontaminação | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `decontamination`. Deve registar área/equipamento/produto. |
| Biossegurança | derrames/spill response | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `spill`. Deve ficar vinculado a incidente quando aplicável. |
| Biossegurança | vacinação ocupacional | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `vaccination`. Dados sensíveis exigem RBAC restrito. |
| Biossegurança | inspeções de biossegurança | exposto | sim | sim | sim | sim | sim | backend exposto / frontend validar | ViewSet `biosafety_inspection`. Deve gerar achados/não conformidades quando aplicável. |
| Workplaces | workplaces/áreas de trabalho | não confirmado | não | não | não | não | não | crítico | Não confirmado na varredura estática feita por aqui. Verificar se deve ser domínio próprio, feature flag ou agrupamento de menus. |
| Farmácia | produtos | exposto | sim | sim | sim | sim | sim | validar | Confirmar consistência de listagem e detalhe. |
| Farmácia | lotes | exposto | sim | sim | sim | sim | sim | corrigir | Há erro reportado no frontend em lotes. Testar listagem, detalhe e criação. |
| Farmácia | movimentos de estoque | exposto | sim | sim | sim | sim | sim | validar | Confirmar filtros por produto, lote, data e tipo. |
| Recepção | pacientes | exposto | sim | sim | sim | sim | sim | corrigir | Deve listar e ver detalhes no mesmo padrão das consultas. |
| Recepção | requisição de exames pela recepção | exposto/parcial | sim | sim | sim | sim | sim | corrigir | Deve permitir selecionar exames por busca filtrável e adicionar médico solicitante. |
| Recepção | exames não laboratoriais | a validar | sim | sim | sim | sim | sim | corrigir | Campo de tipo de exame deve ser ocultado quando não aplicável. |
| Faturamento | faturas | exposto | sim | sim | sim | sim | sim | corrigir | Houve erro de conexão/servidor ao gerar PDF de fatura. |
| Pagamentos | pagamentos | exposto | sim | sim | sim | sim | sim | validar | Confirmar integração com faturas e recibos. |
| Autenticação | sessão activa | exposto/parcial | não aplicável | não aplicável | não aplicável | não aplicável | sim | corrigir | Sessão não deve terminar antes de 30 minutos de inatividade real. Atividade na página deve manter sessão viva. |

---

## Checklist de testagem manual

### 1. Verificar existência no frontend

Para cada linha da matriz:

- [ ] O recurso aparece no menu correcto?
- [ ] A página carrega sem erro 500/404?
- [ ] A listagem faz chamada à API correcta?
- [ ] A listagem mostra dados reais ou estado vazio claro?
- [ ] O detalhe abre ao clicar num item?
- [ ] O botão criar aparece apenas para perfis autorizados?
- [ ] O botão editar aparece apenas para perfis autorizados?
- [ ] As ações aparecem no local correcto?

### 2. Verificar hierarquia

- [ ] Pedido laboratorial aparece como recurso principal.
- [ ] Itens do pedido aparecem dentro do detalhe do pedido.
- [ ] Itens do pedido não aparecem como lista solta no frontend.
- [ ] Resultado aparece vinculado ao pedido, exame, amostra e paciente.
- [ ] Laudo aparece vinculado ao resultado/pedido.

### 3. Verificar busca e seleção de exames

- [ ] Campo de exame permite digitar.
- [ ] Lista filtra enquanto o utilizador digita.
- [ ] Exames aparecem em ordem alfabética.
- [ ] Clicar num exame adiciona à lista de exames selecionados.
- [ ] É possível adicionar múltiplos exames ao mesmo pedido.
- [ ] É possível adicionar médico solicitante quando a requisição é feita pela recepção.
- [ ] Exames não laboratoriais não mostram campo de tipo de exame quando esse campo deve ficar oculto.

### 4. Verificar sessão

- [ ] Sessão permanece activa com atividade real na página.
- [ ] Sessão expira apenas após 30 minutos de inatividade real.
- [ ] A renovação de sessão não causa loop de autenticação.
- [ ] A expiração mostra mensagem clara e redireciona correctamente para login.

### 5. Verificar erros críticos

- [ ] Geração de PDF de fatura não retorna erro 500.
- [ ] Erro de broker/Celery não derruba a resposta principal da API.
- [ ] Erros de rede aparecem de forma compreensível no frontend.
- [ ] Lotes de farmácia carregam sem falha.

### 6. Verificar lacunas de frontend após backend confirmado

- [ ] Criar menu/submenu para Qualidade dentro de Laboratório.
- [ ] Criar menu/submenu para Biossegurança dentro de Laboratório.
- [ ] Confirmar se `clinical_laboratory-*` aparece no catálogo de recursos usado por IA/AutoForm/registry.
- [ ] Confirmar se recursos antigos `clinical-*` não estão competindo com recursos novos `clinical_laboratory-*`.
- [ ] Confirmar se itens de requisição e itens de fatura aparecem apenas como segunda camada.

---

## Critérios mínimos para considerar uma área como `ok`

Uma área só deve ser marcada como `ok` quando cumprir todos os pontos abaixo:

- [ ] Endpoint backend existe e responde.
- [ ] Endpoint aparece no OpenAPI/schema.
- [ ] Frontend consome o endpoint correcto.
- [ ] Listagem funciona.
- [ ] Detalhe funciona quando aplicável.
- [ ] Criar/editar funciona quando aplicável.
- [ ] Ações críticas funcionam quando aplicável.
- [ ] RBAC respeitado no frontend e no backend.
- [ ] Tenant isolation respeitado no backend.
- [ ] Estados de erro/loading/vazio tratados.
- [ ] Teste manual executado.
- [ ] Pelo menos um teste automatizado cobre o fluxo crítico.

---

## Próximas melhorias recomendadas

1. Criar um script de auditoria que compare automaticamente:
   - ViewSets registrados em `api/v1/routing/routes.py`;
   - endpoints gerados no OpenAPI;
   - rotas/telas existentes no `frontend-next`.

2. Criar uma página interna de administração chamada `API Exposure Dashboard`.
   - Ela deve mostrar quais endpoints existem no backend e quais telas os consomem no frontend.

3. Adicionar status por domínio:
   - `stable`;
   - `beta`;
   - `experimental`;
   - `hidden`.

4. Bloquear beta quando domínio crítico tiver status `crítico`.

---

## Histórico

- Criado para organizar a exposição dos endpoints da API no frontend durante a fase de estabilização beta do Substrato.
- Actualizado após varredura estática: Qualidade e Biossegurança possuem ViewSets no backend; a lacuna principal passa a ser validação/exposição no frontend.
