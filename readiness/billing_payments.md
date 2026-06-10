# Readiness — Faturamento e Pagamentos

Checklist de prontidão dos módulos de Faturamento e Pagamentos para a beta do Substrato.

Este documento define os critérios mínimos para que faturas, itens faturáveis, pagamentos, recibos e PDFs possam ser considerados utilizáveis em operação real, com segurança, rastreabilidade, tenant isolation e tratamento de falhas.

---

## Objectivo dos módulos

Faturamento e Pagamentos devem fechar o ciclo operacional:

```text
Serviço/Produto → Fatura → Itens da Fatura → Emissão → Pagamento → Recibo → Auditoria/Reconciliação
```

O fluxo deve funcionar para serviços clínicos, requisições laboratoriais, farmácia e outros módulos faturáveis sem duplicar lógica de cobrança em cada domínio.

---

## Status geral

| Área | Status inicial | Prioridade |
| --- | --- | --- |
| Faturas | corrigir | crítica |
| Itens da fatura | validar | crítica |
| PDF de fatura | corrigir | crítica |
| Pagamentos | validar | crítica |
| Transações | validar | alta |
| Recibos | validar | crítica |
| PDF de recibo | validar | alta |
| Reconciliação | parcial | média |
| Auditoria financeira | validar | crítica |
| Integração com laboratório | parcial | crítica |
| Integração com farmácia | validar | alta |
| Integração com recepção | parcial | crítica |

---

## Perfis envolvidos

| Perfil | Permissões esperadas |
| --- | --- |
| Recepção | Criar fatura a partir de atendimento/requisição, consultar estado de pagamento. |
| Caixa | Registar pagamento, emitir recibo, consultar faturas pendentes. |
| Supervisor financeiro | Cancelar/ajustar fatura, rever pagamentos, aprovar estornos quando aplicável. |
| Contabilidade | Consultar lançamentos, exportações e reconciliações. |
| Administrador | Configurar permissões, impostos/taxas, séries e parâmetros financeiros. |
| Paciente/Cliente | Consultar fatura/recibo quando houver portal autorizado. |

---

## Fluxo 1 — Criação de fatura

### Backend

- [ ] Fatura possui endpoint de listagem.
- [ ] Fatura possui endpoint de detalhe.
- [ ] Fatura possui endpoint de criação.
- [ ] Fatura possui endpoint de edição apenas quando estado permitir.
- [ ] Fatura possui paciente/cliente ou entidade pagadora quando aplicável.
- [ ] Fatura possui tenant obrigatório.
- [ ] Fatura possui número/série rastreável.
- [ ] Fatura possui estado claro: rascunho, emitida, parcialmente paga, paga, cancelada, anulada.
- [ ] Fatura impede alteração indevida após pagamento.
- [ ] Fatura possui timestamps e utilizador responsável.
- [ ] Fatura aparece no OpenAPI/schema.
- [ ] RBAC aplicado aos endpoints.

### Frontend

- [ ] Faturas aparecem no menu/local correcto.
- [ ] Listagem de faturas carrega sem erro.
- [ ] Listagem possui filtros por estado, paciente/cliente, data e número.
- [ ] Clique numa fatura abre detalhe.
- [ ] Detalhe mostra itens, total, estado, pagamentos e recibos.
- [ ] Criar fatura funciona quando permitido.
- [ ] Editar fatura fica bloqueado quando estado não permite.
- [ ] Estados de loading, erro e vazio estão tratados.

### Testes mínimos

- [ ] Teste automatizado cria fatura simples.
- [ ] Teste automatizado lista faturas por tenant.
- [ ] Teste automatizado bloqueia acesso entre tenants.
- [ ] Teste automatizado bloqueia edição indevida após pagamento.
- [ ] Teste manual cria fatura pela interface.

---

## Fluxo 2 — Itens da fatura

### Backend

- [ ] Item de fatura fica vinculado à fatura.
- [ ] Item de fatura suporta descrição, quantidade, preço unitário, desconto e total.
- [ ] Item de fatura suporta origem: laboratório, consulta, farmácia, enfermagem, ajuste ou outro domínio.
- [ ] Item mantém referência ao objecto de origem quando aplicável.
- [ ] Total da fatura é calculado de forma consistente.
- [ ] Alterar item actualiza totais quando estado permite.
- [ ] Não é possível alterar itens de fatura paga sem fluxo de ajuste/anulação.

### Frontend

- [ ] Itens aparecem dentro do detalhe da fatura.
- [ ] Itens não aparecem como recurso solto no menu principal.
- [ ] Adicionar item funciona em fatura editável.
- [ ] Remover item funciona em fatura editável.
- [ ] Totais aparecem claramente.
- [ ] Origem do item aparece quando aplicável.
- [ ] Erros de cálculo ou validação aparecem de forma compreensível.

### Testes mínimos

- [ ] Teste automatizado calcula total com múltiplos itens.
- [ ] Teste automatizado aplica desconto quando permitido.
- [ ] Teste automatizado impede alteração de item em fatura paga.
- [ ] Teste manual confirma itens em segunda camada da fatura.

---

## Fluxo 3 — Fatura a partir de laboratório

### Backend

- [ ] Requisição laboratorial pode gerar fatura quando aplicável.
- [ ] Exames selecionados geram itens faturáveis correctos.
- [ ] Painéis de exames geram itens correctos sem duplicação indevida.
- [ ] Fatura mantém vínculo com requisição/paciente.
- [ ] Cancelamento da requisição reflecte regra financeira definida.
- [ ] Fatura não duplica itens ao repetir acção de geração.

### Frontend

- [ ] Recepção consegue criar requisição e seguir para fatura.
- [ ] Detalhe da requisição mostra fatura vinculada quando existir.
- [ ] Detalhe da fatura mostra origem laboratorial.
- [ ] Repetir clique em gerar fatura não duplica cobrança.
- [ ] Mensagem de erro aparece se fatura não puder ser gerada.

### Testes mínimos

- [ ] Teste automatizado gera fatura a partir de requisição com um exame.
- [ ] Teste automatizado gera fatura a partir de requisição com múltiplos exames.
- [ ] Teste automatizado garante idempotência da geração.
- [ ] Teste manual executa paciente → requisição → fatura.

---

## Fluxo 4 — Fatura a partir de farmácia

### Backend

- [ ] Venda de farmácia pode gerar fatura quando aplicável.
- [ ] Produto vendido gera item faturável correcto.
- [ ] Lote fica rastreável no movimento de estoque, não necessariamente como item financeiro principal.
- [ ] Cancelamento/devolução possui regra financeira definida.
- [ ] Estoque e faturamento não entram em inconsistência.

### Frontend

- [ ] Venda mostra fatura vinculada quando existir.
- [ ] Fatura mostra origem farmácia.
- [ ] Produto, quantidade e total aparecem correctamente.
- [ ] Erro em lotes não quebra fatura ou venda.

### Testes mínimos

- [ ] Teste automatizado gera fatura de venda.
- [ ] Teste automatizado valida baixa de estoque quando aplicável.
- [ ] Teste automatizado evita total negativo indevido.
- [ ] Teste manual confirma venda → fatura → pagamento.

---

## Fluxo 5 — PDF de fatura

### Backend

- [ ] PDF de fatura possui endpoint/acção controlada.
- [ ] PDF contém identificação institucional.
- [ ] PDF contém número da fatura.
- [ ] PDF contém paciente/cliente ou entidade pagadora.
- [ ] PDF contém itens, totais, estado e data.
- [ ] PDF contém código/barcode quando aplicável.
- [ ] PDF não retorna erro 500 sem tratamento.
- [ ] Falha de Celery/broker possui fallback ou mensagem controlada.
- [ ] Erros de geração são logados sem expor dados sensíveis.

### Frontend

- [ ] Botão de gerar/baixar PDF aparece no detalhe da fatura.
- [ ] Clique gera ou baixa PDF sem quebrar a página.
- [ ] Loading aparece durante geração.
- [ ] Erro de PDF aparece com mensagem compreensível.
- [ ] Interface não fica presa se a geração falhar.

### Testes mínimos

- [ ] Teste automatizado gera PDF de fatura válida.
- [ ] Teste automatizado cobre fallback quando broker indisponível se aplicável.
- [ ] Teste automatizado valida que erro de PDF não retorna 500 bruto.
- [ ] Teste manual baixa/abre PDF.

---

## Fluxo 6 — Pagamento

### Backend

- [ ] Pagamento possui endpoint de listagem.
- [ ] Pagamento possui endpoint de detalhe.
- [ ] Pagamento possui endpoint de criação.
- [ ] Pagamento fica vinculado à fatura.
- [ ] Pagamento possui método: dinheiro, cartão, transferência, mobile money ou outro configurado.
- [ ] Pagamento possui valor, moeda, data/hora e responsável.
- [ ] Pagamento actualiza estado da fatura.
- [ ] Pagamento parcial é suportado ou bloqueado conforme regra definida.
- [ ] Pagamento acima do total é bloqueado ou tratado com crédito/troco conforme regra definida.
- [ ] Cancelamento/estorno exige permissão elevada.

### Frontend

- [ ] Pagamentos aparecem no menu/local correcto.
- [ ] Pagamento pode ser registado a partir do detalhe da fatura.
- [ ] Fatura mostra pagamentos associados.
- [ ] Estado da fatura actualiza após pagamento.
- [ ] Formulário valida valor e método.
- [ ] Erros de pagamento aparecem de forma clara.

### Testes mínimos

- [ ] Teste automatizado regista pagamento total.
- [ ] Teste automatizado regista pagamento parcial se permitido.
- [ ] Teste automatizado bloqueia pagamento maior que saldo se essa for a regra.
- [ ] Teste automatizado actualiza estado da fatura.
- [ ] Teste manual executa fatura → pagamento.

---

## Fluxo 7 — Recibo

### Backend

- [ ] Recibo é gerado para pagamento confirmado.
- [ ] Recibo fica vinculado ao pagamento e à fatura.
- [ ] Recibo possui número/série rastreável.
- [ ] Recibo possui endpoint de listagem.
- [ ] Recibo possui endpoint de detalhe.
- [ ] Recibo possui endpoint/acção de PDF.
- [ ] Recibo não é duplicado indevidamente para o mesmo pagamento.
- [ ] Cancelamento/anulação de recibo possui regra clara.

### Frontend

- [ ] Recibo aparece no detalhe da fatura.
- [ ] Recibo aparece no detalhe do pagamento.
- [ ] Botão de imprimir/baixar recibo funciona.
- [ ] Erro de geração de recibo aparece com mensagem controlada.

### Testes mínimos

- [ ] Teste automatizado cria recibo ao confirmar pagamento.
- [ ] Teste automatizado impede duplicação indevida de recibo.
- [ ] Teste automatizado gera PDF de recibo.
- [ ] Teste manual imprime/baixa recibo.

---

## Fluxo 8 — Transações e reconciliação

### Backend

- [ ] Transação financeira fica vinculada ao pagamento quando aplicável.
- [ ] Transação possui estado: pendente, confirmada, falhada, cancelada, reconciliada.
- [ ] Reconciliar exige perfil autorizado.
- [ ] Reconciliação regista responsável e data/hora.
- [ ] Diferenças ficam auditáveis.

### Frontend

- [ ] Transações aparecem para perfis financeiros autorizados.
- [ ] Estado da transação é claro.
- [ ] Reconciliação aparece apenas para perfis autorizados.
- [ ] Divergências são destacadas.

### Testes mínimos

- [ ] Teste automatizado cria transação vinculada a pagamento.
- [ ] Teste automatizado reconcilia transação com perfil autorizado.
- [ ] Teste automatizado bloqueia reconciliação por perfil não autorizado.

---

## Segurança e permissões

- [ ] Recepção não anula fatura paga sem permissão elevada.
- [ ] Caixa consegue registar pagamento, mas não alterar regras financeiras críticas.
- [ ] Supervisor financeiro consegue cancelar/ajustar conforme regra.
- [ ] Utilizador de outro tenant não visualiza faturas, pagamentos ou recibos alheios.
- [ ] Frontend oculta acções não permitidas.
- [ ] Backend bloqueia acções não permitidas mesmo se chamadas manualmente.
- [ ] Operações financeiras críticas são auditadas.
- [ ] Logs não expõem dados sensíveis de pagamento.

---

## Estados financeiros obrigatórios

### Fatura

| Estado | Regra |
| --- | --- |
| `rascunho` | Pode ser editada. |
| `emitida` | Pode receber pagamento. Edição deve ser limitada. |
| `parcialmente_paga` | Saldo pendente visível. |
| `paga` | Não deve permitir alteração directa de itens. |
| `cancelada` | Não deve aceitar pagamento novo. |
| `anulada` | Deve preservar histórico e motivo. |

### Pagamento

| Estado | Regra |
| --- | --- |
| `pendente` | Ainda não confirmado. |
| `confirmado` | Deve afectar saldo da fatura. |
| `falhado` | Não deve afectar saldo. |
| `cancelado` | Deve exigir permissão e motivo. |
| `estornado` | Deve gerar rastreabilidade financeira. |

### Recibo

| Estado | Regra |
| --- | --- |
| `emitido` | Documento válido. |
| `cancelado` | Deve manter histórico. |
| `substituído` | Deve apontar para documento substituto quando aplicável. |

---

## Observabilidade e operação

- [ ] Erros de geração de PDF são registados com contexto técnico.
- [ ] Erros financeiros não expõem stack trace no frontend.
- [ ] Falhas de fila não bloqueiam fluxo principal sem fallback/mensagem controlada.
- [ ] Operações críticas possuem timestamp.
- [ ] Operações críticas possuem utilizador responsável.
- [ ] Faturas e recibos podem ser rastreados por número.
- [ ] Exportações financeiras não bloqueiam a API principal.

---

## Dados de demonstração

Para beta, deve existir massa mínima de dados:

- [ ] 5 faturas demo em estados diferentes.
- [ ] 1 fatura de laboratório.
- [ ] 1 fatura de consulta.
- [ ] 1 fatura de farmácia.
- [ ] 3 pagamentos demo.
- [ ] 3 recibos demo.
- [ ] 1 fatura parcialmente paga.
- [ ] 1 fatura cancelada/anulada com motivo.

---

## Critério para marcar como beta-ready

Faturamento e Pagamentos só podem ser marcados como `beta-ready` quando:

- [ ] Fatura pode ser criada pela interface.
- [ ] Fatura pode ser criada a partir de requisição laboratorial.
- [ ] Itens aparecem dentro do detalhe da fatura.
- [ ] PDF de fatura não gera erro 500 não tratado.
- [ ] Pagamento pode ser registado a partir da fatura.
- [ ] Estado da fatura muda após pagamento.
- [ ] Recibo é gerado e vinculado ao pagamento.
- [ ] PDF de recibo funciona ou falha com mensagem controlada.
- [ ] Tenant isolation foi testado.
- [ ] RBAC financeiro foi testado.
- [ ] Fluxo paciente → requisição/serviço → fatura → pagamento → recibo foi testado manualmente.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi actualizado com o estado real após testagem.

---

## Próxima evolução recomendada

Após cumprir este readiness, criar ou consolidar:

- `readiness/pharmacy.md`;
- `readiness/identity_access.md`;
- `readiness/quality_biosafety.md`;
- matriz de regras financeiras por domínio;
- checklist de auditoria financeira;
- testes automatizados end-to-end para faturamento.
