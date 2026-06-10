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
| `validar` | Precisa de testagem manual para confirmar comportamento real. |
| `não aplicável` | Operação não deve existir isoladamente no frontend por regra de negócio. |

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

| Domínio | Endpoint/Recurso | Listagem | Detalhe | Criar | Editar | Ações | Status | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Laboratório | setores do laboratório | sim | sim | sim | sim | não | validar | Deve aparecer como cadastro/estrutura laboratorial. |
| Laboratório | exames laboratoriais | sim | sim | sim | sim | sim | validar | Deve permitir busca alfabética e filtro ao digitar. |
| Laboratório | painéis de exames | sim | sim | sim | sim | sim | validar | Painel deve permitir composição de múltiplos exames. |
| Laboratório | pedidos/requisições laboratoriais | sim | sim | sim | sim | sim | parcial | Deve ser o recurso principal visível no frontend. |
| Laboratório | itens dos pedidos/requisições | segunda camada | sim | não isolado | não isolado | sim | corrigir | Itens devem aparecer vinculados ao pedido, não como lista independente. |
| Laboratório | colheitas | sim | sim | sim | sim | sim | crítico | Deve ser exposto no frontend para fluxo real de amostras. |
| Laboratório | amostras | sim | sim | sim | sim | sim | crítico | Deve mostrar estado, tipo, origem, pedido e rastreabilidade. |
| Laboratório | recepção de amostras | sim | sim | sim | sim | sim | crítico | Deve permitir confirmar chegada/recebimento de amostras. |
| Laboratório | rejeições de amostras | sim | sim | sim | sim | sim | crítico | Deve registrar motivo, responsável e data/hora. |
| Laboratório | listas de trabalho | sim | sim | sim | sim | sim | crítico | Deve organizar exames por setor, equipamento, prioridade e estado. |
| Laboratório | resultados | sim | sim | sim | sim | sim | crítico | Deve permitir lançamento e visualização estruturada. |
| Laboratório | validações de resultados | sim | sim | não isolado | não isolado | sim | crítico | Validação deve estar vinculada ao resultado/laudo e perfil autorizado. |
| Laboratório | laudos | sim | sim | sim | sim | sim | crítico | Deve permitir pré-visualização, emissão, impressão/exportação e assinatura quando aplicável. |
| Laboratório | resultados clínicos | sim | sim | sim | sim | sim | crítico | Deve estar ligado ao paciente, pedido, exame e histórico. |
| Microbiologia | culturas isoladas | sim | sim | sim | sim | sim | crítico | Deve aparecer no fluxo de microbiologia, ligado à amostra/resultado. |
| Microbiologia | antibiograma | sim | sim | sim | sim | sim | crítico | Deve permitir registo estruturado de sensibilidade/resistência. |
| Biologia Molecular | exames de biologia molecular | sim | sim | sim | sim | sim | crítico | Deve ter fluxo próprio quando aplicável. |
| Baciloscopia | baciloscopia | sim | sim | sim | sim | sim | crítico | Deve suportar registo e validação laboratorial. |
| Qualidade | gestão de qualidade | não | não | não | não | não | crítico | Nenhum endpoint/API exposto no frontend segundo observação actual. |
| Qualidade | não conformidades | não | não | não | não | não | crítico | Deve existir listagem, detalhe, criação, acções correctivas e estado. |
| Qualidade | controlo interno da qualidade | não | não | não | não | não | crítico | Necessário para laboratório clínico real. |
| Qualidade | controlo externo da qualidade | não | não | não | não | não | crítico | Deve suportar programas externos, resultados e avaliação. |
| Qualidade | auditorias internas | não | não | não | não | não | crítico | Deve ter planos, achados, acções e responsáveis. |
| Biossegurança | biossegurança | não | não | não | não | não | crítico | Nenhum endpoint/API exposto no frontend segundo observação actual. |
| Biossegurança | incidentes de biossegurança | não | não | não | não | não | crítico | Deve permitir notificação, classificação, investigação e encerramento. |
| Biossegurança | exposições ocupacionais | não | não | não | não | não | crítico | Deve suportar registo controlado e confidencial. |
| Biossegurança | EPIs e conformidade | não | não | não | não | não | crítico | Deve suportar controlo operacional e auditoria. |
| Workplaces | workplaces/áreas de trabalho | não | não | não | não | não | crítico | Deve expor áreas operacionais por domínio e perfil. |
| Farmácia | produtos | sim | sim | sim | sim | sim | validar | Confirmar consistência de listagem e detalhe. |
| Farmácia | lotes | sim | sim | sim | sim | sim | corrigir | Há erro reportado no frontend em lotes. Testar listagem, detalhe e criação. |
| Farmácia | movimentos de estoque | sim | sim | sim | sim | sim | validar | Confirmar filtros por produto, lote, data e tipo. |
| Recepção | pacientes | sim | sim | sim | sim | sim | corrigir | Deve listar e ver detalhes no mesmo padrão das consultas. |
| Recepção | requisição de exames pela recepção | sim | sim | sim | sim | sim | corrigir | Deve permitir selecionar exames por busca filtrável e adicionar médico solicitante. |
| Recepção | exames não laboratoriais | sim | sim | sim | sim | sim | corrigir | Campo de tipo de exame deve ser ocultado quando não aplicável. |
| Faturamento | faturas | sim | sim | sim | sim | sim | corrigir | Houve erro de conexão/servidor ao gerar PDF de fatura. |
| Pagamentos | pagamentos | sim | sim | sim | sim | sim | validar | Confirmar integração com faturas e recibos. |
| Autenticação | sessão activa | não aplicável | não aplicável | não aplicável | não aplicável | sim | corrigir | Sessão não deve terminar antes de 30 minutos de inatividade real. Atividade na página deve manter sessão viva. |

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
